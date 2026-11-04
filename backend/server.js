import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { pool } from './db/index.js';
import { generateExcelReport, generatePdfReport } from './lib/reportGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8787;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV_USER_ID = Number(process.env.DEV_USER_ID || 1001);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

const STATUSES = ['Not Run', 'Fail', 'Blocked', 'Pass', 'N/A'];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const T = {
  software: { cases: 'test_cases_software', results: 'execution_results_software' },
  hardware: { cases: 'test_cases_hardware', results: 'execution_results_hardware' },
};

const FIELDS = {
  software: ['tc_id', 'module_menu', 'feature', 'ref_requirement', 'scenario', 'tc_type', 'priority', 'precondition', 'test_data', 'test_steps', 'expected_result', 'notes'],
  hardware: ['tc_id', 'component_subsystem', 'scenario', 'tc_type', 'criticality', 'precondition', 'test_steps', 'parameter', 'unit', 'pass_limit', 'spec_source', 'expected_result', 'notes'],
};

const ENUM = {
  tc_type: ['Positive', 'Negative', 'Edge'],
  priority: ['Low', 'Medium', 'High'],
  criticality: ['Low', 'Medium', 'High', 'Critical', 'Safety-Critical'],
};

const DEFAULTS = {
  tc_type: 'Positive',
  priority: 'Medium',
  criticality: 'Medium',
  ref_requirement: '[isi ref]',
};

const str = (v, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const bad = (res, msg, status = 400) => res.status(status).json({ error: msg });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function parseEvidenceList(rawList) {
  return (Array.isArray(rawList) ? rawList : []).map((raw, idx) => {
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        return {
          id: parsed.id || `ev-${idx + 1}`,
          jenis: parsed.jenis || 'foto',
          nama: parsed.nama || `bukti-${idx + 1}.jpg`,
          url: parsed.url ?? null,
          ditambahkanPada: parsed.ditambahkanPada || new Date().toISOString(),
        };
      } catch {
        // lanjut ke fallback string biasa
      }
    }
    const url = typeof raw === 'string' ? raw : null;
    return {
      id: `ev-${idx + 1}`,
      jenis: url && /^https?:\/\//i.test(url) ? 'link' : 'foto',
      nama: url ? path.basename(url) || `bukti-${idx + 1}` : `bukti-${idx + 1}.jpg`,
      url,
      ditambahkanPada: new Date().toISOString(),
    };
  });
}

function serializeEvidence(item, idx = 1) {
  if (!item || typeof item !== 'object') return str(item, 2000);
  return JSON.stringify({
    id: item.id || `ev-${Date.now()}-${idx}`,
    jenis: item.jenis || 'foto',
    nama: str(item.nama || `bukti-${idx}.jpg`, 300),
    url: item.url || item.uri || null,
    ditambahkanPada: item.ditambahkanPada || new Date().toISOString(),
  });
}

// ---------- Autentikasi ----------
function verifyTelegramInitData(initData, maxAgeSec = 86400) {
  if (!BOT_TOKEN) return null;
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
  const authHeader = req.get('authorization') || '';
  let user = authHeader.startsWith('tma ') ? verifyTelegramInitData(authHeader.slice(4)) : null;

  if (!user) {
    user = { id: DEV_USER_ID, first_name: 'Dev User', username: 'developer' };
  }

  if (ALLOWED_USER_IDS.length && !ALLOWED_USER_IDS.includes(String(user.id))) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  try {
    await pool.query(
      `insert into users (id, username, full_name) values ($1, $2, $3)
       on conflict (id) do update set username = excluded.username, full_name = excluded.full_name`,
      [user.id, user.username || null, [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Dev User']
    );
  } catch (err) {
    // Abaikan jika DB belum aktif
  }

  req.user = user;
  next();
}));

// ---------- Health Check ----------
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date(), user: req.user }));

// ---------- 1. Users ----------
app.get('/api/users', wrap(async (req, res) => {
  const { rows } = await pool.query('select id::text as id, coalesce(full_name, username, id::text) as nama, username from users order by created_at desc');
  res.json(rows);
}));

// ---------- Helper: Fetch Execution Lengkap ----------
async function getExecutionFull(exId, userId) {
  const { rows: [ex] } = await pool.query(
    `select e.id::text as id, e.code, e.title as judul, e.kind as jenis, e.status, e.build_version,
            e.environment, e.report_name, e.created_by::text as "dibuatOleh", e.created_at as "dibuatPada",
            e.completed_at, (e.status = 'Done') as selesai,
            coalesce(u.full_name, u.username, 'Dev User') as "dibuatOlehNama"
       from test_executions e
       left join users u on u.id = e.created_by
      where e.id = $1 and e.created_by = $2`,
    [exId, userId]
  );
  if (!ex) return null;

  const { rows: setRows } = await pool.query(
    'select set_id::text from test_execution_sets where execution_id = $1',
    [exId]
  );
  const kumpulanIds = setRows.map((r) => r.set_id);

  const t = T[ex.jenis];
  const { rows: results } = await pool.query(
    `select r.id as result_id, r.status, r.actual_result as "actualResult", r.evidence, r.bug_id as "bugId", r.notes, r.tested_at,
            ${ex.jenis === 'hardware' ? 'r.measured_value,' : ''}
            c.id as tc_db_id, c.tc_id as "tcId", c.scenario, c.test_steps, c.expected_result as expected,
            c.module_menu as modul, ${ex.jenis === 'software' ? 'c.feature as fitur,' : ''}
            c.ref_requirement as "refRequirement", c.precondition, c.test_data as "testData",
            c.priority as prioritas, c.tc_type as tipe, c.set_id::text as "kumpulanId"
       from ${t.results} r join ${t.cases} c on c.id = r.test_case_id
      where r.execution_id = $1 order by r.id`,
    [ex.id]
  );

  const kasus = results.map((r) => {
    const steps = (r.test_steps || '').split('\n').filter(Boolean);
    return {
      tcId: r.tcId,
      kumpulanId: r.kumpulanId || (kumpulanIds[0] || ''),
      jenis: ex.jenis,
      modul: r.modul || '',
      fitur: r.fitur || '',
      refRequirement: r.refRequirement || '',
      precondition: r.precondition || '',
      testData: r.testData || '',
      prioritas: r.prioritas || 'Medium',
      tipe: r.tipe || 'Positive',
      scenario: r.scenario,
      steps,
      expected: r.expected || '',
      asliSteps: steps,
      asliExpected: r.expected || '',
      diubah: false,
      status: r.status || 'Not Run',
      actualResult: r.actualResult || '',
      evidence: parseEvidenceList(r.evidence),
      bugId: r.bugId || null,
    };
  });

  return {
    ...ex,
    kumpulanIds,
    picIds: [ex.dibuatOleh],
    picNama: [ex.dibuatOlehNama],
    kasus,
  };
}

// ---------- 2. Dashboard ----------
app.get('/api/dashboard', wrap(async (req, res) => {
  const { rows: setRows } = await pool.query(
    `select coalesce(sum((select count(*) from test_cases_software c where c.set_id = s.id and c.is_active)
           + (select count(*) from test_cases_hardware c where c.set_id = s.id and c.is_active)), 0)::int as count
       from test_case_sets s where s.created_by = $1`, [req.user.id]
  );
  const testCaseTersimpan = setRows[0]?.count || 0;

  const { rows: progress } = await pool.query(
    `select p.id::text as id, p.code, p.title as judul, p.kind as jenis, p.exec_status as status,
            p.total::int, p.executed::int as selesai, p.pass::int, p.fail::int, p.blocked::int
       from v_execution_progress p join test_executions e on e.id = p.id
      where e.created_by = $1 order by e.created_at desc`, [req.user.id]
  );

  const totalExecuted = progress.reduce((a, x) => a + x.selesai, 0);
  const totalPass = progress.reduce((a, x) => a + x.pass, 0);
  const totalFail = progress.reduce((a, x) => a + x.fail, 0);
  const totalBlocked = progress.reduce((a, x) => a + x.blocked, 0);
  const totalCases = progress.reduce((a, x) => a + x.total, 0);

  const passRate = totalExecuted > 0 ? Math.round((totalPass / totalExecuted) * 100) : 0;
  const aktif = progress.filter((p) => p.status !== 'Done');

  let bugCount = 0;
  const bugPerSeverity = { Critical: 0, Major: 0, Minor: 0, Trivial: 0 };
  try {
    const { rows: bugs } = await pool.query(
      `select severity, count(*)::int as c from bugs
        where created_by=$1 and coalesce(status, 'Open') in ('Open', 'In Progress')
        group by severity`,
      [req.user.id]
    );
    for (const b of bugs) {
      if (bugPerSeverity[b.severity] !== undefined) bugPerSeverity[b.severity] = b.c;
      bugCount += b.c;
    }
  } catch {
    bugCount = totalFail;
  }

  res.json({
    passRate,
    dieksekusi: totalExecuted,
    hitung: {
      Pass: totalPass,
      Fail: totalFail,
      Blocked: totalBlocked,
      'N/A': 0,
      'Not Run': Math.max(0, totalCases - totalExecuted),
    },
    testCaseTersimpan,
    executionAktif: aktif.length,
    bugOpen: bugCount,
    bugPerSeverity,
    progressAktif: aktif.map((p) => ({
      id: p.id,
      judul: p.judul,
      selesai: p.selesai,
      total: p.total,
    })),
  });
}));

// ---------- 3. Kumpulan & Test Case ----------
function cleanCase(kind, c, i) {
  const o = { position: i };

  // 1. TC ID
  o.tc_id = str(c.tc_id || c.id || c['TC ID'] || `TC-${String(i + 1).padStart(3, '0')}`, 100);

  // 2. Modul / Menu / Komponen
  o.module_menu = str(c.module_menu || c.modul || c['Modul / Menu'] || c.component_subsystem || '', 5000);
  if (kind === 'hardware') {
    o.component_subsystem = o.module_menu;
  }

  // 3. Fitur
  o.feature = str(c.feature || c.fitur || c.Fitur || '', 5000);

  // 4. Ref Requirement
  o.ref_requirement = str(c.ref_requirement || c.refRequirement || c['Ref Requirement'] || '[isi ref]', 5000);

  // 5. Scenario
  o.scenario = str(c.scenario || c.sc || c.Scenario || c.skenario || '', 5000);

  // 6. Tipe (Positive / Negative)
  const rawTipe = str(c.tc_type || c.tipe || c.Tipe || 'Positive');
  o.tc_type = ENUM.tc_type.find((x) => x.toLowerCase() === rawTipe.toLowerCase()) || 'Positive';

  // 7. Priority / Criticality
  const rawPrio = str(c.priority || c.prioritas || c.criticality || 'Medium');
  o.priority = ENUM.priority.find((x) => x.toLowerCase() === rawPrio.toLowerCase()) || 'Medium';
  if (kind === 'hardware') {
    o.criticality = ENUM.criticality.find((x) => x.toLowerCase() === rawPrio.toLowerCase()) || 'Medium';
  }

  // 8. Precondition
  o.precondition = str(c.precondition || c.Precondition || c.prasyarat || '', 5000);

  // 9. Test Data
  o.test_data = str(c.test_data || c.testData || c['Test Data'] || '', 5000);

  // 10. Test Steps
  const rawSteps = c.test_steps || c.steps || c.st || c['Test Steps'] || '';
  o.test_steps = Array.isArray(rawSteps) ? rawSteps.join('\n') : str(rawSteps, 5000);

  // 11. Expected Result
  o.expected_result = str(c.expected_result || c.expected || c.ex || c['Expected Result'] || '', 5000);

  // 12. Notes
  o.notes = str(c.notes || c.case_notes || c.catatan || '', 5000);

  // Hardware specifics
  if (kind === 'hardware') {
    o.parameter = str(c.parameter || c.parameterDiukur || '', 500);
    o.unit = str(c.unit || c.satuan || '', 100);
    o.pass_limit = str(c.pass_limit || c.batasLulus || '', 500);
    o.spec_source = str(c.spec_source || c.sumberSpec || '', 500);
    o.spec_min = num(c.spec_min);
    o.spec_max = num(c.spec_max);
  }

  return o;
}

const listSetsHandler = wrap(async (req, res) => {
  const { rows } = await pool.query(
    `select s.id::text as id, s.kind as jenis, s.title as judul, s.created_at as "diimporPada",
            ((select count(*) from test_cases_software c where c.set_id = s.id and c.is_active)
           + (select count(*) from test_cases_hardware c where c.set_id = s.id and c.is_active))::int as jumlah,
            coalesce(u.full_name, u.username, 'Admin') as "diimporOlehNama",
            (select count(*) from test_execution_sets x where x.set_id = s.id)::int as "dipakaiDi"
       from test_case_sets s
       left join users u on u.id = s.created_by
      where s.created_by = $1 order by s.created_at desc`, [req.user.id]
  );
  res.json(rows);
});

app.get('/api/sets', listSetsHandler);
app.get('/api/kumpulan', listSetsHandler);

const createSetHandler = wrap(async (req, res) => {
  const kind = req.body.kind || req.body.jenis || 'software';
  const title = str(req.body.title || req.body.judul, 200);
  const namaFile = str(req.body.namaFile || req.body.file, 200) || 'import.xlsx';
  const sheet = str(req.body.sheet, 100) || (kind === 'software' ? 'TC_Software' : 'TC_Hardware');

  if (!T[kind]) return bad(res, 'Jenis harus software atau hardware');
  if (!title) return bad(res, 'Judul kumpulan wajib diisi');

  const src = Array.isArray(req.body.cases || req.body.testCases) ? (req.body.cases || req.body.testCases).slice(0, 5000) : [];
  const semua = src.filter((c) => str(c.scenario || c.sc, 5000)).map((c, i) => cleanCase(kind, c, i));

  // Pengaman: TC ID harus unik dalam satu kumpulan (constraint unique(set_id, tc_id)).
  // Baris dengan TC ID yang sudah muncul sebelumnya tidak disimpan.
  const sudahAda = new Set();
  const duplikat = [];
  const cases = [];
  for (const c of semua) {
    if (sudahAda.has(c.tc_id)) {
      duplikat.push(c.tc_id);
      continue;
    }
    sudahAda.add(c.tc_id);
    c.position = cases.length;
    cases.push(c);
  }
  if (duplikat.length) {
    console.warn(`⚠️ Import "${title}": ${duplikat.length} baris dengan TC ID duplikat dilewati: ${[...new Set(duplikat)].join(', ')}`);
  }

  if (!cases.length) return bad(res, 'Minimal harus ada 1 test case dengan skenario valid');

  const cols = [...FIELDS[kind], ...(kind === 'hardware' ? ['spec_min', 'spec_max'] : []), 'position'];
  const typed = cols.map((c) => `${c} ${c === 'position' ? 'int' : c.startsWith('spec_m') ? 'numeric' : 'text'}`).join(', ');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: [set] } = await client.query(
      'insert into test_case_sets (kind, title, created_by) values ($1, $2, $3) returning id, kind, title, created_at',
      [kind, title, req.user.id]
    );

    await client.query(
      `insert into ${T[kind].cases} (set_id, ${cols.join(', ')})
       select $1, ${cols.map((c) => 'x.' + c).join(', ')} from jsonb_to_recordset($2::jsonb) as x(${typed})`,
      [set.id, JSON.stringify(cases)]
    );

    await client.query('commit');

    res.status(201).json({
      kumpulanId: String(set.id),
      judul: set.title,
      jenis: set.kind,
      namaFile,
      sheet,
      tersimpan: cases.length,
      dilewati: duplikat.length,
      peringatan: 0,
      daftar: cases.slice(0, 3).map((c) => ({ id: c.tc_id, scenario: c.scenario })),
      diimporPada: set.created_at,
      diimporOlehNama: req.user.first_name || 'Dev User',
    });
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
});

app.post('/api/sets', createSetHandler);
app.post('/api/kumpulan', createSetHandler);

const getSetDetailHandler = wrap(async (req, res) => {
  const { rows: [set] } = await pool.query(
    `select s.id::text as id, s.kind as jenis, s.title as judul, s.created_at as "diimporPada",
            s.created_by::text as "diimporOleh", coalesce(u.full_name, u.username, 'Admin') as "diimporOlehNama"
       from test_case_sets s
       left join users u on u.id = s.created_by
      where s.id=$1 and s.created_by=$2`,
    [req.params.id, req.user.id]
  );
  if (!set) return res.status(404).json({ error: 'Kumpulan test case tidak ditemukan' });

  const { rows: execs } = await pool.query(
    `select e.title from test_execution_sets x join test_executions e on e.id = x.execution_id where x.set_id = $1`,
    [set.id]
  );
  const dipakaiDi = execs.map((e) => e.title);

  const querySql = set.jenis === 'software'
    ? `select id, tc_id, module_menu, feature, ref_requirement, scenario, tc_type, priority,
              precondition, test_data, test_steps, expected_result, notes, position, is_active
         from test_cases_software where set_id=$1 and is_active order by position, id`
    : `select id, tc_id, component_subsystem as module_menu, '' as feature, '' as ref_requirement, scenario, tc_type, criticality as priority,
              precondition, '' as test_data, test_steps, expected_result, notes, parameter, unit, pass_limit, spec_source, position, is_active
         from test_cases_hardware where set_id=$1 and is_active order by position, id`;

  const { rows: rawCases } = await pool.query(querySql, [set.id]);

  const testCases = rawCases.map((c) => ({
    id: c.tc_id,
    jenis: set.jenis,
    modul: c.module_menu || '',
    fitur: c.feature || '',
    refRequirement: c.ref_requirement || '',
    scenario: c.scenario,
    tipe: c.tc_type || 'Positive',
    prioritas: c.priority || 'Medium',
    precondition: c.precondition || '',
    testData: c.test_data || '',
    steps: (c.test_steps || '').split('\n').filter(Boolean),
    expected: c.expected_result,
    notes: c.notes,
    ...(set.jenis === 'hardware'
      ? {
          parameterDiukur: c.parameter || '',
          satuan: c.unit || '',
          batasLulus: c.pass_limit || '',
          sumberSpec: c.spec_source || '',
        }
      : {}),
  }));

  res.json({
    ...set,
    namaFile: `${set.judul}.xlsx`,
    sheet: set.jenis === 'software' ? 'TC_Software' : 'TC_Hardware',
    versi: 1,
    dipakaiDi,
    header: [],
    testCases,
  });
});

app.get('/api/sets/:id', getSetDetailHandler);
app.get('/api/kumpulan/:id', getSetDetailHandler);

const deleteSetHandler = wrap(async (req, res) => {
  const r = await pool.query('delete from test_case_sets where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  r.rowCount ? res.status(204).end() : res.status(404).json({ error: 'Tidak ditemukan' });
});

app.delete('/api/sets/:id', deleteSetHandler);
app.delete('/api/kumpulan/:id', deleteSetHandler);

// Update single test case
app.put('/api/kumpulan/:id/test-case/:tcId', wrap(async (req, res) => {
  const { rows: [set] } = await pool.query('select kind from test_case_sets where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!set) return res.status(404).json({ error: 'Kumpulan tidak ditemukan' });

  const b = req.body;
  const t = T[set.kind];
  if (set.kind === 'software') {
    await pool.query(
      `update ${t.cases} set
         scenario = coalesce($1, scenario),
         test_steps = coalesce($2, test_steps),
         expected_result = coalesce($3, expected_result),
         notes = coalesce($4, notes),
         priority = coalesce($5, priority),
         tc_type = coalesce($6, tc_type),
         module_menu = coalesce($7, module_menu),
         feature = coalesce($8, feature),
         ref_requirement = coalesce($9, ref_requirement),
         precondition = coalesce($10, precondition),
         test_data = coalesce($11, test_data)
       where set_id=$12 and tc_id=$13`,
      [
        b.scenario !== undefined ? str(b.scenario) : null,
        b.steps ? (Array.isArray(b.steps) ? b.steps.join('\n') : str(b.steps)) : (b.test_steps ? str(b.test_steps) : null),
        b.expected !== undefined ? str(b.expected) : (b.expected_result ? str(b.expected_result) : null),
        b.notes !== undefined ? str(b.notes) : null,
        b.prioritas || b.priority || null,
        b.tipe || b.tc_type || null,
        b.modul !== undefined ? str(b.modul) : (b.module_menu !== undefined ? str(b.module_menu) : null),
        b.fitur !== undefined ? str(b.fitur) : (b.feature !== undefined ? str(b.feature) : null),
        b.refRequirement !== undefined ? str(b.refRequirement) : (b.ref_requirement !== undefined ? str(b.ref_requirement) : null),
        b.precondition !== undefined ? str(b.precondition) : null,
        b.testData !== undefined ? str(b.testData) : (b.test_data !== undefined ? str(b.test_data) : null),
        req.params.id,
        req.params.tcId,
      ]
    );
  } else {
    await pool.query(
      `update ${t.cases} set
         scenario = coalesce($1, scenario),
         test_steps = coalesce($2, test_steps),
         expected_result = coalesce($3, expected_result),
         notes = coalesce($4, notes),
         criticality = coalesce($5, criticality),
         tc_type = coalesce($6, tc_type),
         component_subsystem = coalesce($7, component_subsystem),
         precondition = coalesce($8, precondition),
         parameter = coalesce($9, parameter),
         unit = coalesce($10, unit),
         pass_limit = coalesce($11, pass_limit),
         spec_source = coalesce($12, spec_source)
       where set_id=$13 and tc_id=$14`,
      [
        b.scenario !== undefined ? str(b.scenario) : null,
        b.steps ? (Array.isArray(b.steps) ? b.steps.join('\n') : str(b.steps)) : (b.test_steps ? str(b.test_steps) : null),
        b.expected !== undefined ? str(b.expected) : (b.expected_result ? str(b.expected_result) : null),
        b.notes !== undefined ? str(b.notes) : null,
        b.prioritas || b.criticality || b.priority || null,
        b.tipe || b.tc_type || null,
        b.modul !== undefined ? str(b.modul) : (b.component_subsystem !== undefined ? str(b.component_subsystem) : null),
        b.precondition !== undefined ? str(b.precondition) : null,
        b.parameterDiukur !== undefined ? str(b.parameterDiukur, 500) : null,
        b.satuan !== undefined ? str(b.satuan, 100) : null,
        b.batasLulus !== undefined ? str(b.batasLulus, 500) : null,
        b.sumberSpec !== undefined ? str(b.sumberSpec, 500) : null,
        req.params.id,
        req.params.tcId,
      ]
    );
  }

  return getSetDetailHandler(req, res);
}));

// ---------- 4. Test Execution ----------
app.post('/api/executions', wrap(async (req, res) => {
  const title = str(req.body.title || req.body.judul, 200);
  const rawSetIds = req.body.setIds || req.body.kumpulanIds || [];
  const setIds = [...new Set((Array.isArray(rawSetIds) ? rawSetIds : []).map(Number).filter(Number.isInteger))];

  if (!title) return bad(res, 'Judul test execution wajib diisi');
  if (!setIds.length) return bad(res, 'Pilih minimal satu kumpulan test case');

  const { rows: sets } = await pool.query(
    'select id, kind from test_case_sets where id = any($1::int[]) and created_by=$2',
    [setIds, req.user.id]
  );
  if (sets.length !== setIds.length) return bad(res, 'Satu atau lebih kumpulan test case tidak valid');

  const kind = sets[0].kind;
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: [ex] } = await client.query(
      `insert into test_executions (title, kind, build_version, environment, created_by)
       values ($1, $2, $3, $4, $5) returning id`,
      [title, kind, str(req.body.build_version) || null, str(req.body.environment) || null, req.user.id]
    );

    await client.query(
      `update test_executions set code = 'EXE-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 3, '0') where id=$1`,
      [ex.id]
    );

    await client.query(
      'insert into test_execution_sets (execution_id, set_id) select $1, unnest($2::int[])',
      [ex.id, setIds]
    );

    const ins = await client.query(
      `insert into ${T[kind].results} (execution_id, test_case_id)
       select $1, id from ${T[kind].cases} where set_id = any($2::int[]) and is_active
       order by array_position($2::int[], set_id), position`,
      [ex.id, setIds]
    );

    if (!ins.rowCount) throw Object.assign(new Error('Kumpulan yang dipilih tidak memiliki test case aktif'), { status: 400 });

    await client.query('commit');

    const result = await getExecutionFull(ex.id, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}));

app.get('/api/executions', wrap(async (req, res) => {
  const { rows: execs } = await pool.query(
    'select id from test_executions where created_by=$1 order by created_at desc',
    [req.user.id]
  );

  const results = [];
  for (const row of execs) {
    const full = await getExecutionFull(row.id, req.user.id);
    if (full) results.push(full);
  }

  res.json(results);
}));

app.get('/api/executions/:id', wrap(async (req, res) => {
  const ex = await getExecutionFull(req.params.id, req.user.id);
  if (!ex) return res.status(404).json({ error: 'Test execution tidak ditemukan' });
  res.json(ex);
}));

// Update status per kasus
app.put('/api/executions/:id/kasus/:tcId/status', wrap(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return bad(res, 'Status tidak valid');

  const { rows: [ex] } = await pool.query('select id, kind from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Execution tidak ditemukan' });

  const t = T[ex.kind];
  const { rows: [resRecord] } = await pool.query(
    `select r.id from ${t.results} r join ${t.cases} c on c.id = r.test_case_id
     where r.execution_id=$1 and c.tc_id=$2`,
    [ex.id, req.params.tcId]
  );
  if (!resRecord) return res.status(404).json({ error: 'Test case tidak ditemukan di execution ini' });

  await pool.query(
    `update ${t.results} set status = $1, tester_id = $2, tested_at = now() where id = $3`,
    [status, req.user.id, resRecord.id]
  );

  await pool.query(`update test_executions set status='Running', started_at=now() where id=$1 and status='Draft'`, [ex.id]);

  const full = await getExecutionFull(ex.id, req.user.id);
  res.json(full);
}));

// Update actual result per kasus
app.put('/api/executions/:id/kasus/:tcId/actual-result', wrap(async (req, res) => {
  const { rows: [ex] } = await pool.query('select id, kind from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Execution tidak ditemukan' });

  const t = T[ex.kind];
  const { rows: [resRecord] } = await pool.query(
    `select r.id from ${t.results} r join ${t.cases} c on c.id = r.test_case_id
     where r.execution_id=$1 and c.tc_id=$2`,
    [ex.id, req.params.tcId]
  );
  if (!resRecord) return res.status(404).json({ error: 'Test case tidak ditemukan di execution ini' });

  await pool.query(`update ${t.results} set actual_result = $1 where id = $2`, [str(req.body.actualResult || req.body.actual_result || ''), resRecord.id]);

  const full = await getExecutionFull(ex.id, req.user.id);
  res.json(full);
}));

// Tambah evidence per kasus
app.post('/api/executions/:id/kasus/:tcId/evidence', wrap(async (req, res) => {
  const { rows: [ex] } = await pool.query('select id, kind from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Execution tidak ditemukan' });

  const t = T[ex.kind];
  const { rows: [resRecord] } = await pool.query(
    `select r.id, r.evidence from ${t.results} r join ${t.cases} c on c.id = r.test_case_id
     where r.execution_id=$1 and c.tc_id=$2`,
    [ex.id, req.params.tcId]
  );
  if (!resRecord) return res.status(404).json({ error: 'Test case tidak ditemukan di execution ini' });

  const entry = serializeEvidence(req.body, (resRecord.evidence || []).length + 1);
  if (entry) {
    const list = [...(resRecord.evidence || []), entry];
    await pool.query(`update ${t.results} set evidence = $1 where id = $2`, [list, resRecord.id]);
  }

  const full = await getExecutionFull(ex.id, req.user.id);
  res.json(full);
}));

// Selesaikan execution
app.post('/api/executions/:id/finish', wrap(async (req, res) => {
  const format = req.body.format || 'pdf';
  const { rows: [ex] } = await pool.query('select id, title from test_executions where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!ex) return res.status(404).json({ error: 'Execution tidak ditemukan' });

  const namaFile = `Report_${ex.title.replace(/[^a-z0-9]+/gi, '_')}.${format}`;
  await pool.query(
    `update test_executions set status='Done', completed_at=now(), report_name=$1 where id=$2`,
    [namaFile, ex.id]
  );
  res.json({
    format,
    namaFile,
    dibuatPada: new Date().toISOString(),
  });
}));

// Unduh file laporan (PDF atau XLSX)
app.get('/api/executions/:id/download', wrap(async (req, res) => {
  const format = (req.query.format || 'pdf').toLowerCase() === 'xlsx' ? 'xlsx' : 'pdf';
  const ex = await getExecutionFull(req.params.id, req.user.id);
  if (!ex) return res.status(404).json({ error: 'Test execution tidak ditemukan' });

  let bugs = [];
  try {
    const { rows } = await pool.query(
      `select b.*, e.title as execution_judul, coalesce(u.full_name, u.username, 'Dev User') as dibuat_oleh_nama
         from bugs b
         left join test_executions e on e.id = b.execution_id
         left join users u on u.id = b.created_by
        where b.execution_id = $1 and b.created_by = $2
        order by b.created_at desc`,
      [ex.id, req.user.id]
    );
    bugs = rows.map(mapBugRow);
  } catch {}

  const options = {
    sertakanActual: req.query.actual !== 'false',
    sertakanLangkah: req.query.langkah !== 'false',
    sertakanEvidence: req.query.evidence !== 'false',
  };

  const filename = `Report_${(ex.judul || 'Execution').replace(/[^a-z0-9_-]+/gi, '_')}.${format}`;
  const buffer = format === 'xlsx'
    ? generateExcelReport(ex, bugs, options)
    : generatePdfReport(ex, bugs, options);

  res.setHeader(
    'Content-Type',
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}));

// Kirim dokumen laporan ke Telegram Chat pengguna lewat Bot
app.post('/api/executions/:id/kirim-bot', wrap(async (req, res) => {
  const format = (req.body.format || 'pdf').toLowerCase() === 'xlsx' ? 'xlsx' : 'pdf';
  const ex = await getExecutionFull(req.params.id, req.user.id);
  if (!ex) return res.status(404).json({ error: 'Test execution tidak ditemukan' });

  if (!BOT_TOKEN) {
    return res.json({ ok: false, message: 'BOT_TOKEN belum disetel di backend/.env' });
  }

  let bugs = [];
  try {
    const { rows } = await pool.query(
      `select * from bugs where execution_id = $1 and created_by = $2 order by created_at desc`,
      [ex.id, req.user.id]
    );
    bugs = rows.map(mapBugRow);
  } catch {}

  const filename = `Report_${(ex.judul || 'Execution').replace(/[^a-z0-9_-]+/gi, '_')}.${format}`;
  const buffer = format === 'xlsx' ? generateExcelReport(ex, bugs) : generatePdfReport(ex, bugs);

  try {
    const form = new FormData();
    form.append('chat_id', String(req.user.id));
    form.append(
      'caption',
      `📊 *Laporan Test Execution*\n*${ex.judul}*\nKode: \`${ex.code || '-'}\``
    );
    form.append('parse_mode', 'Markdown');
    form.append('document', new Blob([buffer]), filename);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form,
    });
    const tgData = await tgRes.json();
    return res.json({ ok: tgData.ok, message: tgData.description || 'Laporan terkirim ke chat bot' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}));

// Unduh kumpulan test case utama dalam format Excel (.xlsx)
app.get('/api/kumpulan/:id/download', wrap(async (req, res) => {
  const { rows: [set] } = await pool.query(
    `select s.id, s.kind as jenis, s.title as judul from test_case_sets s where s.id=$1 and s.created_by=$2`,
    [req.params.id, req.user.id]
  );
  if (!set) return res.status(404).json({ error: 'Kumpulan test case tidak ditemukan' });

  const querySql =
    set.jenis === 'software'
      ? `select tc_id, module_menu, feature, ref_requirement, scenario, tc_type, priority,
              precondition, test_data, test_steps, expected_result
         from test_cases_software where set_id=$1 and is_active order by position, id`
      : `select tc_id, component_subsystem as module_menu, '' as feature, '' as ref_requirement, scenario, tc_type, criticality as priority,
              precondition, '' as test_data, test_steps, expected_result, parameter, unit, pass_limit, spec_source
         from test_cases_hardware where set_id=$1 and is_active order by position, id`;

  const { rows: cases } = await pool.query(querySql, [set.id]);

  const wb = XLSX.utils.book_new();
  const sheetName = set.jenis === 'software' ? 'TC_Software' : 'TC_Hardware';
  const headers =
    set.jenis === 'software'
      ? ['TC ID', 'Modul / Menu', 'Fitur', 'Ref Requirement', 'Scenario', 'Tipe', 'Priority', 'Precondition', 'Test Data', 'Test Steps', 'Expected Result']
      : ['TC ID', 'Komponen / Subsistem', 'Scenario', 'Tipe', 'Criticality', 'Precondition', 'Test Steps', 'Parameter Diukur', 'Satuan', 'Batas Lulus (Spec)', 'Sumber Spec', 'Expected Result'];

  const aoa = [
    ['Project / Produk', set.judul],
    ['Modul', set.judul],
    ['Versi Build', '1.0.0'],
    ['Environment', 'SIT'],
    [],
    [],
    [],
    [],
    headers,
  ];

  for (const c of cases) {
    if (set.jenis === 'software') {
      aoa.push([
        c.tc_id,
        c.module_menu || '',
        c.feature || '',
        c.ref_requirement || '',
        c.scenario || '',
        c.tc_type || 'Positive',
        c.priority || 'Medium',
        c.precondition || '',
        c.test_data || '',
        c.test_steps || '',
        c.expected_result || '',
      ]);
    } else {
      aoa.push([
        c.tc_id,
        c.module_menu || '',
        c.scenario || '',
        c.tc_type || 'Positive',
        c.priority || 'Medium',
        c.precondition || '',
        c.test_steps || '',
        c.parameter || '',
        c.unit || '',
        c.pass_limit || '',
        c.spec_source || '',
        c.expected_result || '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `${(set.judul || 'TestCases').replace(/[^a-z0-9_-]+/gi, '_')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}));

// Unduh template standar (.xlsx)
app.get('/api/template/:jenis', (req, res) => {
  const jenis = req.params.jenis === 'hardware' ? 'hardware' : 'software';
  const wb = XLSX.utils.book_new();
  const sheetName = jenis === 'software' ? 'TC_Software' : 'TC_Hardware';
  const headers =
    jenis === 'software'
      ? ['TC ID', 'Modul / Menu', 'Fitur', 'Ref Requirement', 'Scenario', 'Tipe', 'Priority', 'Precondition', 'Test Data', 'Test Steps', 'Expected Result']
      : ['TC ID', 'Komponen / Subsistem', 'Scenario', 'Tipe', 'Criticality', 'Precondition', 'Test Steps', 'Parameter Diukur', 'Satuan', 'Batas Lulus (Spec)', 'Sumber Spec', 'Expected Result'];

  const meta =
    jenis === 'software'
      ? [
          ['Project / Produk', 'Nama Proyek Contoh'],
          ['Modul', 'Nama Modul'],
          ['Versi Build / Release', '1.0.0'],
          ['Environment', 'SIT'],
          ['Jenis Testing', 'Functional Testing'],
          ['Tester', 'QA Team'],
          [],
          [],
          headers,
          ['SW-001', 'Modul Utama', 'Login', 'FR-01', 'Login dengan akun valid', 'Positive', 'High', 'User memiliki akun aktif', 'user@example.com', '1. Buka aplikasi\n2. Masukkan email & password\n3. Klik Login', 'User berhasil masuk'],
        ]
      : [
          ['Produk & Model', 'Perangkat IoT X1'],
          ['Serial Number / Unit ID', 'SN-001'],
          ['Versi Firmware / Software', 'v1.0.0'],
          ['Jenis Testing', 'Hardware Functional'],
          ['Referensi Spesifikasi', 'SPEC-01'],
          ['Lokasi Uji', 'Lab Elektronik'],
          [],
          [],
          headers,
          ['HW-001', 'Power Supply', 'Tegangan keluaran stabil 3.3V', 'Positive', 'Safety-Critical', 'Device menyala', '1. Pasang probe ke VCC\n2. Ukur tegangan', 'Tegangan Keluaran', 'V', '3.3V ± 5%', 'Datasheet rev 2', 'Tegangan stabil di rentang 3.135 - 3.465 V'],
        ];

  const ws = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Template_QA_${jenis === 'software' ? 'Software' : 'Hardware'}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

// Ambil laporan terakhir dari execution yang sudah selesai
app.get('/api/executions/:id/laporan', wrap(async (req, res) => {
  const { rows: [ex] } = await pool.query(
    'select id, title, status, report_name, completed_at from test_executions where id=$1 and created_by=$2',
    [req.params.id, req.user.id]
  );
  if (!ex) return res.status(404).json({ error: 'Execution tidak ditemukan' });
  if (ex.status !== 'Done') return res.json(null);
  const namaFile = ex.report_name || `Report_${ex.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`;
  const format = namaFile.endsWith('.xlsx') ? 'xlsx' : 'pdf';
  res.json({
    format,
    namaFile,
    dibuatPada: ex.completed_at || new Date().toISOString(),
  });
}));

// ---------- 5. Bugs ----------
function mapBugRow(row) {
  return {
    id: row.id,
    judul: row.title,
    status: row.status || 'Open',
    severity: row.severity || 'Major',
    prioritas: row.priority || 'P2 - High',
    tipe: row.bug_type || 'Functional',
    actualResult: row.actual_result || '',
    executionId: String(row.execution_id || ''),
    tcId: row.tc_id ?? null,
    evidence: parseEvidenceList(row.evidence),
    dibuatPada: row.created_at,
    dibuatOleh: String(row.created_by || ''),
    ...(row.execution_judul !== undefined ? { executionJudul: row.execution_judul || String(row.execution_id || '') } : {}),
    ...(row.dibuat_oleh_nama !== undefined ? { dibuatOlehNama: row.dibuat_oleh_nama || 'Dev User' } : {}),
  };
}

app.get('/api/bugs/next-id', wrap(async (req, res) => {
  try {
    const { rows: [r] } = await pool.query('select count(*)::int as count from bugs');
    const nextNumber = (r?.count || 0) + 1;
    res.json({ id: `BUG-${String(nextNumber).padStart(3, '0')}` });
  } catch (err) {
    if (err.code === '42P01') return res.json({ id: 'BUG-001' });
    throw err;
  }
}));

app.get('/api/bugs', wrap(async (req, res) => {
  try {
    const { rows } = await pool.query(
      `select b.*, e.title as execution_judul, coalesce(u.full_name, u.username, 'Dev User') as dibuat_oleh_nama
         from bugs b
         left join test_executions e on e.id = b.execution_id
         left join users u on u.id = b.created_by
        where b.created_by = $1
        order by b.created_at desc`,
      [req.user.id]
    );
    res.json(rows.map(mapBugRow));
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    throw err;
  }
}));

app.get('/api/executions/:id/bugs', wrap(async (req, res) => {
  try {
    const hanyaLuarScenario = req.query.tcId === 'null';
    const { rows } = await pool.query(
      `select * from bugs
        where execution_id = $1 and created_by = $2
          ${hanyaLuarScenario ? 'and tc_id is null' : ''}
        order by created_at desc`,
      [req.params.id, req.user.id]
    );
    res.json(rows.map(mapBugRow));
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    throw err;
  }
}));

app.post('/api/bugs', wrap(async (req, res) => {
  const { judul, severity, prioritas, tipe, actualResult, executionId, tcId, evidenceBaru } = req.body;
  const { rows: [r] } = await pool.query('select count(*)::int as count from bugs');
  const bugId = `BUG-${String((r?.count || 0) + 1).padStart(3, '0')}`;

  const evidenceList = (Array.isArray(evidenceBaru) ? evidenceBaru : []).map((b, i) => serializeEvidence(b, i + 1)).filter(Boolean);
  const tcIdNorm = tcId === null || tcId === undefined || tcId === '' ? null : str(tcId, 100);

  const { rows: [inserted] } = await pool.query(
    `insert into bugs (id, title, status, severity, priority, bug_type, kind, actual_result, execution_id, tc_id, evidence, created_by)
     values ($1, $2, 'Open', $3, $4, $5, 'software', $6, $7, $8, $9, $10)
     returning *`,
    [
      bugId,
      str(judul),
      severity || 'Major',
      prioritas || 'P2 - High',
      str(tipe || 'Functional', 100),
      str(actualResult),
      Number(executionId),
      tcIdNorm,
      evidenceList,
      req.user.id,
    ]
  );

  // Pasang bugId ke execution_results bila terikat ke tcId
  if (tcIdNorm) {
    for (const kindKey of ['software', 'hardware']) {
      try {
        await pool.query(
          `update ${T[kindKey].results} r set bug_id=$1
           from ${T[kindKey].cases} c where c.id = r.test_case_id and r.execution_id=$2 and c.tc_id=$3`,
          [bugId, Number(executionId), tcIdNorm]
        );
      } catch {}
    }
  }

  res.status(201).json(mapBugRow(inserted));
}));

app.put('/api/bugs/:id', wrap(async (req, res) => {
  const { judul, status, severity, prioritas, tipe, actualResult, evidenceBaru } = req.body;
  const { rows: [existing] } = await pool.query('select * from bugs where id=$1 and created_by=$2', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Bug tidak ditemukan' });

  const tambahan = (Array.isArray(evidenceBaru) ? evidenceBaru : []).map((b, i) =>
    serializeEvidence(b, (existing.evidence || []).length + i + 1)
  );
  const gabunganEvidence = [...(existing.evidence || []), ...tambahan];

  const { rows: [updated] } = await pool.query(
    `update bugs set
       title = coalesce($1, title),
       status = coalesce($2, status),
       severity = coalesce($3, severity),
       priority = coalesce($4, priority),
       bug_type = coalesce($5, bug_type),
       actual_result = coalesce($6, actual_result),
       evidence = $7
     where id = $8 and created_by = $9
     returning *`,
    [
      judul !== undefined ? str(judul) : null,
      status !== undefined ? str(status, 50) : null,
      severity !== undefined ? str(severity, 50) : null,
      prioritas !== undefined ? str(prioritas, 50) : null,
      tipe !== undefined ? str(tipe, 100) : null,
      actualResult !== undefined ? str(actualResult) : null,
      gabunganEvidence,
      req.params.id,
      req.user.id,
    ]
  );

  res.json(mapBugRow(updated));
}));

// ---------- 6. Upload ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return bad(res, 'File wajib diunggah');
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename, size: req.file.size });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  if (err.status) return res.status(err.status).json({ error: err.message || err.msg });
  if (err.code === '23505') {
    const m = /\(([^)]*)\)=\(([^)]*)\)/.exec(err.detail || '');
    return res.status(409).json({ error: m ? `Data duplikat: ${m[1]} = ${m[2]} sudah ada.` : 'Data duplikat terdeteksi' });
  }
  if (err.code === '23503') return res.status(409).json({ error: 'Data masih berelasi dengan tabel lain' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Ukuran file melebihi batas maksimal' });
  res.status(500).json({ error: 'Terjadi kesalahan pada server backend' });
});

async function migrateSchema() {
  try {
    await pool.query(`alter table bugs add column if not exists status text not null default 'Open'`);
    await pool.query(`alter table bugs add column if not exists bug_type text not null default 'Functional'`);
    await pool.query(`alter table bugs alter column tc_id drop not null`);
    await pool.query(`alter table bugs drop constraint if exists bugs_priority_check`);
    await pool.query(`alter table execution_results_software drop constraint if exists execution_results_software_status_check`);
    await pool.query(`alter table execution_results_software add constraint execution_results_software_status_check check (status in ('Not Run','Fail','Blocked','Pass','N/A'))`);
    await pool.query(`alter table execution_results_hardware drop constraint if exists execution_results_hardware_status_check`);
    await pool.query(`alter table execution_results_hardware add constraint execution_results_hardware_status_check check (status in ('Not Run','Fail','Blocked','Pass','N/A'))`);
  } catch {
    // Abaikan jika tabel belum dibuat atau DB belum berjalan
  }
}

app.listen(PORT, () => {
  void migrateSchema();
  console.log(`🚀 QA Agent Backend berjalan di http://localhost:${PORT}`);
  console.log(`📡 Database terhubung ke: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Belum diatur'}`);
});
