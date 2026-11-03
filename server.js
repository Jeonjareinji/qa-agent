import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { BOT_TOKEN, DATABASE_URL, PORT = 3000, DEV_USER_ID, CORS_ORIGIN } = process.env;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const ALLOWED = (process.env.ALLOWED_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const STATUSES = ['Not Run', 'Fail', 'Blocked', 'Pass'];

if (!BOT_TOKEN || !DATABASE_URL) throw new Error('BOT_TOKEN dan DATABASE_URL wajib diisi');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new pg.Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Nama tabel & kolom hanya dari konstanta ini (tidak pernah dari input user)
const T = {
  software: { cases: 'test_cases_software', results: 'execution_results_software' },
  hardware: { cases: 'test_cases_hardware', results: 'execution_results_hardware' },
};
const FIELDS = {
  software: ['tc_id', 'module_menu', 'feature', 'ref_requirement', 'scenario', 'tc_type', 'priority', 'precondition', 'test_data', 'test_steps', 'expected_result', 'notes'],
  hardware: ['tc_id', 'component_subsystem', 'scenario', 'tc_type', 'criticality', 'precondition', 'test_steps', 'parameter', 'unit', 'pass_limit', 'spec_source', 'expected_result', 'notes'],
};
const ENUM = { tc_type: ['Positive', 'Negative'], priority: ['Low', 'Medium', 'High'], criticality: ['Low', 'Medium', 'High', 'Critical'] };
const DEFAULTS = { tc_type: 'Positive', priority: 'Medium', criticality: 'Medium', ref_requirement: '[isi ref]' };
const CASE_COLS = {
  software: 'c.tc_id, c.module_menu, c.feature, c.ref_requirement, c.scenario, c.tc_type, c.priority, c.precondition, c.test_data, c.test_steps, c.expected_result, c.notes as case_notes',
  hardware: 'c.tc_id, c.component_subsystem, c.scenario, c.tc_type, c.criticality, c.precondition, c.test_steps, c.parameter, c.unit, c.pass_limit, c.spec_min, c.spec_max, c.spec_source, c.expected_result, c.notes as case_notes',
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const bad = (res, msg) => res.status(400).json({ error: msg });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------- CORS (hanya jika frontend di domain lain) ----------
if (CORS_ORIGIN) {
  app.use('/api', (req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
}

// ---------- Auth: validasi initData Telegram ----------
function verifyInitData(initData, maxAgeSec = 86400) {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(check).digest('hex');
  const a = Buffer.from(calc), b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > maxAgeSec) return null;
  try { return JSON.parse(p.get('user')); } catch { return null; }
}

app.use('/api', wrap(async (req, res, next) => {
  const h = req.get('authorization') || '';
  let user = h.startsWith('tma ') ? verifyInitData(h.slice(4)) : null;
  if (!user && DEV_USER_ID && process.env.NODE_ENV !== 'production') user = { id: Number(DEV_USER_ID), first_name: 'Dev' };
  if (!user) return res.status(401).json({ error: 'Tidak terautentikasi' });
  if (ALLOWED.length && !ALLOWED.includes(String(user.id))) return res.status(403).json({ error: 'Akses ditolak' });
  await db.query(
    `insert into users(id, username, full_name) values($1,$2,$3)
     on conflict (id) do update set username = excluded.username, full_name = excluded.full_name`,
    [user.id, user.username || null, [user.first_name, user.last_name].filter(Boolean).join(' ') || null]);
  req.user = user;
  next();
}));

// ---------- 1. Kumpulan & test case ----------
function clean(kind, c, i) {
  const o = { position: i };
  for (const f of FIELDS[kind]) {
    let v = str(c[f], 5000);
    if (ENUM[f]) v = ENUM[f].find((x) => x.toLowerCase() === v.toLowerCase()) || DEFAULTS[f];
    else if (!v && DEFAULTS[f]) v = DEFAULTS[f];
    o[f] = v;
  }
  if (!o.tc_id) o.tc_id = `TC-${String(i + 1).padStart(3, '0')}`;
  if (kind === 'hardware') { o.spec_min = num(c.spec_min); o.spec_max = num(c.spec_max); }
  return o;
}

app.get('/api/sets', wrap(async (req, res) => {
  const { rows } = await db.query(
    `select s.id, s.kind, s.title, s.created_at,
            ((select count(*) from test_cases_software c where c.set_id = s.id and c.is_active)
           + (select count(*) from test_cases_hardware c where c.set_id = s.id and c.is_active))::int as case_count
       from test_case_sets s where s.created_by = $1 order by s.created_at desc`, [req.user.id]);
  res.json(rows);
}));

app.post('/api/sets', wrap(async (req, res) => {
  const kind = req.body.kind;
  const title = str(req.body.title, 200);
  if (!T[kind]) return bad(res, 'Jenis harus software atau hardware');
  if (!title) return bad(res, 'Judul wajib diisi');
  const src = Array.isArray(req.body.cases) ? req.body.cases.slice(0, 2000) : [];
  const cases = src.filter((c) => str(c.scenario, 5000)).map((c, i) => clean(kind, c, i));
  if (!cases.length) return bad(res, 'Tidak ada test case yang valid (kolom Scenario wajib)');
  const cols = [...FIELDS[kind], ...(kind === 'hardware' ? ['spec_min', 'spec_max'] : []), 'position'];
  const typed = cols.map((c) => `${c} ${c === 'position' ? 'int' : c.startsWith('spec_m') ? 'numeric' : 'text'}`).join(', ');
  const client = await db.connect();
  try {
    await client.query('begin');
    const { rows: [set] } = await client.query(
      'insert into test_case_sets(kind, title, created_by) values($1,$2,$3) returning id, kind, title, created_at', [kind, title, req.user.id]);
    await client.query(
      `insert into ${T[kind].cases}(set_id, ${cols.join(', ')})
       select $1, ${cols.map((c) => 'x.' + c).join(', ')} from jsonb_to_recordset($2::jsonb) as x(${typed})`,
      [set.id, JSON.stringify(cases)]);
    await client.query('commit');
    res.status(201).json({ ...set, case_count: cases.length });
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}));

app.delete('/api/sets/:id', wrap(async (req, res) => {
  const r = await db.query('delete from test_case_sets where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  r.rowCount ? res.status(204).end() : res.status(404).json({ error: 'Tidak ditemukan' });
}));

// ---------- 2. Test execution ----------
app.post('/api/executions', wrap(async (req, res) => {
  const title = str(req.body.title, 200);
  const setIds = [...new Set((Array.isArray(req.body.setIds) ? req.body.setIds : []).map(Number).filter(Number.isInteger))];
  if (!title) return bad(res, 'Judul wajib diisi');
  if (!setIds.length) return bad(res, 'Pilih minimal satu kumpulan test case');
  const { rows: sets } = await db.query('select id, kind from test_case_sets where id = any($1::int[]) and created_by=$2', [setIds, req.user.id]);
  if (sets.length !== setIds.length) return bad(res, 'Kumpulan test case tidak valid');
  const kinds = [...new Set(sets.map((s) => s.kind))];
  if (kinds.length !== 1) return bad(res, 'Pilih kumpulan dengan jenis yang sama (software atau hardware)');
  const kind = kinds[0];
  const client = await db.connect();
  try {
    await client.query('begin');
    const { rows: [ex] } = await client.query(
      `insert into test_executions(title, kind, build_version, environment, created_by)
       values($1,$2,$3,$4,$5) returning id`,
      [title, kind, str(req.body.build_version, 200) || null, str(req.body.environment, 200) || null, req.user.id]);
    await client.query(`update test_executions set code = 'EXE-' || to_char(now(),'YYYY') || '-' || lpad(id::text, 3, '0') where id=$1`, [ex.id]);
    await client.query('insert into test_execution_sets(execution_id, set_id) select $1, unnest($2::int[])', [ex.id, setIds]);
    const ins = await client.query(
      `insert into ${T[kind].results}(execution_id, test_case_id)
       select $1, id from ${T[kind].cases} where set_id = any($2::int[]) and is_active
       order by array_position($2::int[], set_id), position`, [ex.id, setIds]);
    if (!ins.rowCount) throw Object.assign(new Error('empty'), { status: 400, msg: 'Kumpulan yang dipilih tidak punya test case aktif' });
    await client.query('commit');
    res.status(201).json({ id: ex.id, kind, total: ins.rowCount });
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}));

app.get('/api/executions', wrap(async (req, res) => {
  const { rows } = await db.query(
    `select p.id, p.code, p.title, p.kind, p.exec_status as status,
            p.total::int, p.executed::int, p.pass::int, p.fail::int, p.blocked::int,
            e.build_version, e.environment, e.report_name, e.created_at
       from v_execution_progress p join test_executions e on e.id = p.id
      where e.created_by = $1 order by e.created_at desc`, [req.user.id]);
  res.json(rows);
}));

app.get('/api/executions/:id', wrap(async (req, res) => {
  const { rows: [ex] } = await db.query(
    `select id, code, title, kind, status, build_version, environment, report_name, report_size, created_at, completed_at
       from test_executions where id=$1 and created_by=$2`, [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Tidak ditemukan' });
  const t = T[ex.kind];
  const { rows: results } = await db.query(
    `select r.id, r.status, r.actual_result, r.evidence, r.bug_id, r.notes, r.tested_at,
            ${ex.kind === 'hardware' ? 'r.measured_value,' : ''} ${CASE_COLS[ex.kind]}
       from ${t.results} r join ${t.cases} c on c.id = r.test_case_id
      where r.execution_id = $1 order by r.id`, [ex.id]);
  const { rows: srcSets } = await db.query(
    `select s.id, s.title from test_execution_sets x join test_case_sets s on s.id = x.set_id
      where x.execution_id = $1 order by s.title`, [ex.id]);
  res.json({ ...ex, sets: srcSets, results });
}));

// ---------- 3. Update hasil tiap test case ----------
app.patch('/api/executions/:id/results/:rid', wrap(async (req, res) => {
  const { rows: [ex] } = await db.query('select id, kind from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Tidak ditemukan' });
  const b = req.body, sets = [], vals = [];
  const add = (col, v) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  if ('actual_result' in b) add('actual_result', str(b.actual_result, 5000));
  if ('bug_id' in b) add('bug_id', str(b.bug_id, 100) || null);
  if ('notes' in b) add('notes', str(b.notes, 5000));
  if ('evidence' in b) add('evidence', (Array.isArray(b.evidence) ? b.evidence : []).map((s) => str(s, 1000)).filter(Boolean).slice(0, 20));
  if (ex.kind === 'hardware' && 'measured_value' in b) add('measured_value', num(b.measured_value));
  if ('status' in b) {
    if (!STATUSES.includes(b.status)) return bad(res, 'Status tidak valid');
    add('status', b.status);
    if (b.status === 'Not Run') { add('tester_id', null); add('tested_at', null); }
    else { add('tester_id', req.user.id); sets.push('tested_at = now()'); }
  }
  if (!sets.length) return bad(res, 'Tidak ada perubahan');
  vals.push(req.params.rid, ex.id);
  const { rows: [r] } = await db.query(
    `update ${T[ex.kind].results} set ${sets.join(', ')}
      where id=$${vals.length - 1} and execution_id=$${vals.length}
      returning id, status, actual_result, evidence, bug_id, notes, tested_at`, vals);
  if (!r) return res.status(404).json({ error: 'Tidak ditemukan' });
  await db.query(`update test_executions set status='Running', started_at=now() where id=$1 and status='Draft'`, [ex.id]);
  res.json(r);
}));

// ---------- Upload report PDF -> selesai ----------
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_q, _f, cb) => cb(null, crypto.randomUUID() + '.pdf') }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_q, file, cb) => cb(null, /pdf$/i.test(file.originalname)),
});

app.post('/api/executions/:id/report', upload.single('report'), wrap(async (req, res) => {
  const f = req.file;
  if (!f) return bad(res, 'File PDF wajib diunggah');
  const head = Buffer.alloc(5);
  const fd = fs.openSync(f.path, 'r'); fs.readSync(fd, head, 0, 5, 0); fs.closeSync(fd);
  if (head.toString() !== '%PDF-') { fs.unlinkSync(f.path); return bad(res, 'File bukan PDF yang valid'); }
  const { rows: [ex] } = await db.query(
    `update test_executions set report_path=$1, report_name=$2, report_size=$3, status='Done', completed_at=now()
      where id=$4 and created_by=$5 returning id, title, status, report_name, completed_at`,
    [f.path, path.basename(f.originalname), f.size, req.params.id, req.user.id]);
  if (!ex) { fs.unlinkSync(f.path); return res.status(404).json({ error: 'Tidak ditemukan' }); }
  res.json(ex);
}));

app.get('/api/executions/:id/report', wrap(async (req, res) => {
  const { rows: [ex] } = await db.query('select report_path, report_name from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex?.report_path) return res.status(404).json({ error: 'Report belum ada' });
  res.download(ex.report_path, ex.report_name);
}));

app.use((err, _req, res, _next) => {
  if (err.status === 400) return res.status(400).json({ error: err.msg });
  if (err.code === '23505') return res.status(409).json({ error: 'TC ID duplikat dalam satu file' });
  if (err.code === '23503') return res.status(409).json({ error: 'Masih dipakai di test execution' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File terlalu besar (maks 20 MB)' });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

app.listen(PORT, () => console.log(`Server di port ${PORT}`));
