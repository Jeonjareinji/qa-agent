// Satu-satunya lapisan data untuk semua layar.
// Sekarang isinya data dummy di memori (hilang saat dimuat ulang) dengan jeda kecil agar terasa seperti jaringan.
// Setiap fungsi bertanda "TODO backend" harus diganti ke panggilan API dan database nanti.
import { DAFTAR_STATUS, buatDataAwal, pratinjauContoh, validasiContoh } from '../data/dummy.ts'
import type {
  Bug,
  Dashboard,
  Db,
  DetailKumpulan,
  ExecutionLengkap,
  FormatLaporan,
  HasilExport,
  HasilImport,
  ImportDraft,
  InputBug,
  InputEvidence,
  InputExecution,
  Jenis,
  KasusExecution,
  KumpulanRingkas,
  KumpulanTestCase,
  LaporanValidasi,
  OpsiLaporan,
  Periode,
  PratinjauImport,
  Severity,
  StatusKasus,
  TestCase,
  TestExecution,
  User,
} from '../data/dummy.ts'
import { hitungStatus, jumlahDieksekusi, slug } from './hitung.ts'

const db: Db = buatDataAwal()

const jeda = (ms = 220): Promise<void> => new Promise((selesai) => setTimeout(selesai, ms))
const salin = <T>(nilai: T): T => structuredClone(nilai)

function namaUser(id: string): string {
  return db.users.find((u) => u.id === id)?.nama ?? 'Pengguna tidak dikenal'
}

function cariExecution(id: string): TestExecution {
  const e = db.executions.find((x) => x.id === id)
  if (!e) throw new Error('Test execution tidak ditemukan.')
  return e
}

function cariKasus(e: TestExecution, tcId: string): KasusExecution {
  const k = e.kasus.find((x) => x.tcId === tcId)
  if (!k) throw new Error('Test case tidak ditemukan di execution ini.')
  return k
}

function cariKumpulan(id: string): KumpulanTestCase {
  const k = db.kumpulan.find((x) => x.id === id)
  if (!k) throw new Error('Kumpulan test case tidak ditemukan.')
  return k
}

function lengkapi(e: TestExecution): ExecutionLengkap {
  return { ...salin(e), picNama: e.picIds.map(namaUser), dibuatOlehNama: namaUser(e.dibuatOleh) }
}

function nomorEvidence(): string {
  const n = db.urutan.evidence
  db.urutan.evidence += 1
  return 'ev-' + n
}

// ---------- Beranda ----------

export async function getDashboard(periode: Periode): Promise<Dashboard> {
  // TODO backend: GET /api/dashboard?periode=...
  await jeda()
  const hari = periode === '7' ? 7 : periode === 'sprint' ? 14 : 30
  const batas = Date.now() - hari * 86_400_000
  const dalamPeriode = db.executions.filter((e) => Date.parse(e.dibuatPada) >= batas)
  const hitung = hitungStatus(dalamPeriode.flatMap((e) => e.kasus))
  const dieksekusi = DAFTAR_STATUS.filter((s) => s !== 'Not Run').reduce((a, s) => a + hitung[s], 0)
  const bugPerSeverity: Record<Severity, number> = { Critical: 0, Major: 0, Minor: 0, Trivial: 0 }
  for (const b of db.bugs) bugPerSeverity[b.severity] += 1
  const aktif = db.executions.filter((e) => !e.selesai)
  return {
    passRate: dieksekusi === 0 ? 0 : Math.round((hitung.Pass / dieksekusi) * 100),
    dieksekusi,
    hitung,
    testCaseTersimpan: db.kumpulan.reduce((a, k) => a + k.testCases.length, 0),
    executionAktif: aktif.length,
    bugOpen: db.bugs.length,
    bugPerSeverity,
    progressAktif: aktif.map((e) => ({
      id: e.id,
      judul: e.judul,
      selesai: jumlahDieksekusi(e.kasus),
      total: e.kasus.length,
    })),
  }
}

export async function getUsers(): Promise<User[]> {
  // TODO backend: GET /api/users (anggota tim yang terdaftar di bot)
  await jeda(120)
  return salin(db.users)
}

// ---------- Import test case ----------

export async function getPratinjauImport(jenis: Jenis, namaFile: string): Promise<PratinjauImport> {
  // TODO backend: unggah file .xlsx lalu baca sheet TC_Software/TC_Hardware di server.
  await jeda(300)
  return pratinjauContoh(jenis, namaFile)
}

export async function validasiImport(jenis: Jenis): Promise<LaporanValidasi> {
  // TODO backend: validasi field di server terhadap file yang diunggah.
  await jeda(450)
  return validasiContoh(jenis)
}

export async function simpanImport(draft: ImportDraft): Promise<HasilImport> {
  // TODO backend: POST /api/kumpulan (simpan baris valid ke database)
  await jeda(500)
  const laporan = validasiContoh(draft.jenis)
  const hitungBaris = (tingkat: 'error' | 'peringatan'): number =>
    new Set(laporan.temuan.filter((t) => t.tingkat === tingkat).map((t) => t.baris)).size
  const nomor = db.urutan.kumpulan
  db.urutan.kumpulan += 1
  const awalan = draft.jenis === 'software' ? 'DMO-IMP-' : 'HWD-IMP-'
  const testCases: TestCase[] = Array.from({ length: laporan.jumlahValid }, (_, i) => ({
    id: awalan + String(i + 1).padStart(3, '0'),
    jenis: draft.jenis,
    modul: 'Modul Hasil Import',
    fitur: draft.jenis === 'software' ? 'Fitur Contoh' : '',
    refRequirement: 'REQ-DEMO-' + String(i + 1).padStart(3, '0'),
    scenario: 'Contoh test case hasil import ' + (i + 1),
    tipe: 'Positive',
    prioritas: draft.jenis === 'software' ? 'Medium' : 'High',
    precondition: 'Kondisi awal contoh.',
    testData: draft.jenis === 'software' ? 'Data uji contoh' : '',
    steps: ['Langkah contoh pertama', 'Langkah contoh kedua'],
    expected: 'Hasil contoh sesuai harapan.',
    ...(draft.jenis === 'hardware'
      ? { parameterDiukur: 'Parameter contoh', satuan: 'V', batasLulus: 'TBD', sumberSpec: '[belum ada]' }
      : {}),
  }))
  const kumpulan: KumpulanTestCase = {
    id: 'ks-' + nomor,
    judul: draft.judul,
    jenis: draft.jenis,
    namaFile: draft.namaFile,
    sheet: laporan.sheet,
    diimporPada: new Date().toISOString(),
    diimporOleh: db.users[0].id,
    versi: 1,
    header: pratinjauContoh(draft.jenis, draft.namaFile).header,
    testCases,
  }
  db.kumpulan.push(kumpulan)
  return {
    kumpulanId: kumpulan.id,
    judul: kumpulan.judul,
    jenis: kumpulan.jenis,
    namaFile: kumpulan.namaFile,
    sheet: kumpulan.sheet,
    tersimpan: testCases.length,
    dilewati: hitungBaris('error'),
    peringatan: hitungBaris('peringatan'),
    daftar: testCases.slice(0, 3).map((t) => ({ id: t.id, scenario: t.scenario })),
    diimporPada: kumpulan.diimporPada,
    diimporOlehNama: namaUser(kumpulan.diimporOleh),
  }
}

export async function unduhTemplate(jenis: Jenis): Promise<void> {
  // TODO backend: kirim file template QA-TPL-001 ke pengguna.
  await jeda(150)
  void jenis
}

export async function unduhDaftarTemuan(): Promise<void> {
  // TODO backend: buat dan kirim daftar temuan validasi (.xlsx).
  await jeda(150)
}

// ---------- Daftar dan detail test case ----------

export async function listKumpulan(): Promise<KumpulanRingkas[]> {
  // TODO backend: GET /api/kumpulan
  await jeda()
  return db.kumpulan.map((k) => ({
    id: k.id,
    judul: k.judul,
    jenis: k.jenis,
    jumlah: k.testCases.length,
    diimporPada: k.diimporPada,
    diimporOlehNama: namaUser(k.diimporOleh),
    dipakaiDi: db.executions.filter((e) => e.kumpulanIds.includes(k.id)).length,
  }))
}

export async function getKumpulan(id: string): Promise<DetailKumpulan> {
  // TODO backend: GET /api/kumpulan/:id
  await jeda()
  const k = cariKumpulan(id)
  return {
    ...salin(k),
    diimporOlehNama: namaUser(k.diimporOleh),
    dipakaiDi: db.executions.filter((e) => e.kumpulanIds.includes(k.id)).map((e) => e.judul),
  }
}

export async function updateTestCase(kumpulanId: string, tc: TestCase): Promise<DetailKumpulan> {
  // TODO backend: PUT /api/kumpulan/:id/test-case/:tcId (versi naik, execution lama tidak berubah)
  await jeda(350)
  const k = cariKumpulan(kumpulanId)
  const indeks = k.testCases.findIndex((t) => t.id === tc.id)
  if (indeks < 0) throw new Error('Test case tidak ditemukan.')
  k.testCases[indeks] = salin(tc)
  k.versi += 1
  return getKumpulan(kumpulanId)
}

export async function unduhExcelKumpulan(kumpulanId: string): Promise<void> {
  // TODO backend: buat dan kirim file Excel (.xlsx) berisi test case kumpulan ini.
  await jeda(150)
  void kumpulanId
}

// ---------- Test execution ----------

export async function listExecutions(): Promise<ExecutionLengkap[]> {
  // TODO backend: GET /api/executions
  await jeda()
  return [...db.executions].sort((a, b) => Date.parse(b.dibuatPada) - Date.parse(a.dibuatPada)).map(lengkapi)
}

export async function getExecution(id: string): Promise<ExecutionLengkap> {
  // TODO backend: GET /api/executions/:id
  await jeda(160)
  return lengkapi(cariExecution(id))
}

export async function buatExecution(input: InputExecution): Promise<ExecutionLengkap> {
  // TODO backend: POST /api/executions (salin test case ke execution, kirim notifikasi ke PIC lewat bot)
  await jeda(450)
  const kasus: KasusExecution[] = input.kumpulanIds.flatMap((id) =>
    cariKumpulan(id).testCases.map((t) => ({
      tcId: t.id,
      kumpulanId: id,
      jenis: t.jenis,
      modul: t.modul,
      prioritas: t.prioritas,
      tipe: t.tipe,
      scenario: t.scenario,
      steps: [...t.steps],
      expected: t.expected,
      asliSteps: [...t.steps],
      asliExpected: t.expected,
      diubah: false,
      status: 'Not Run' as const,
      actualResult: '',
      evidence: [],
      bugId: null,
    })),
  )
  const nomor = db.urutan.execution
  db.urutan.execution += 1
  const e: TestExecution = {
    id: 'ex-' + nomor,
    judul: input.judul,
    kumpulanIds: [...input.kumpulanIds],
    picIds: [...input.picIds],
    dibuatOleh: db.users[0].id, // TODO backend: ambil dari pengguna yang login (validasi initData)
    dibuatPada: new Date().toISOString(),
    selesai: false,
    kasus,
  }
  db.executions.push(e)
  return lengkapi(e)
}

export async function setStatusKasus(executionId: string, tcId: string, status: StatusKasus): Promise<ExecutionLengkap> {
  // TODO backend: PUT /api/executions/:id/kasus/:tcId/status
  await jeda(120)
  const e = cariExecution(executionId)
  cariKasus(e, tcId).status = status
  return lengkapi(e)
}

export async function simpanActualResult(executionId: string, tcId: string, teks: string): Promise<ExecutionLengkap> {
  // TODO backend: PUT /api/executions/:id/kasus/:tcId/actual-result
  await jeda(100)
  const e = cariExecution(executionId)
  cariKasus(e, tcId).actualResult = teks
  return lengkapi(e)
}

export async function ubahKasus(executionId: string, tcId: string, steps: string[], expected: string): Promise<ExecutionLengkap> {
  // TODO backend: PUT /api/executions/:id/kasus/:tcId (hanya mengubah salinan di execution ini)
  await jeda(250)
  const e = cariExecution(executionId)
  const k = cariKasus(e, tcId)
  k.steps = [...steps]
  k.expected = expected
  k.diubah = true
  return lengkapi(e)
}

export async function kembalikanKasus(executionId: string, tcId: string): Promise<ExecutionLengkap> {
  // TODO backend: POST /api/executions/:id/kasus/:tcId/kembalikan
  await jeda(200)
  const e = cariExecution(executionId)
  const k = cariKasus(e, tcId)
  k.steps = [...k.asliSteps]
  k.expected = k.asliExpected
  k.diubah = false
  return lengkapi(e)
}

export async function tambahEvidence(executionId: string, tcId: string, input: InputEvidence): Promise<ExecutionLengkap> {
  // TODO backend: unggah berkas ke penyimpanan lalu simpan referensinya.
  await jeda(250)
  const e = cariExecution(executionId)
  cariKasus(e, tcId).evidence.push({ id: nomorEvidence(), ...input, ditambahkanPada: new Date().toISOString() })
  return lengkapi(e)
}

export async function getBugBerikut(): Promise<string> {
  // TODO backend: Bug ID dibuat oleh server saat bug disimpan.
  await jeda(80)
  return 'BUG-' + String(db.urutan.bug).padStart(3, '0')
}

export async function catatBug(input: InputBug): Promise<Bug> {
  // TODO backend: POST /api/bugs (Bug ID dibuat server, evidence test case ikut terlampir)
  await jeda(400)
  const e = cariExecution(input.executionId)
  const k = cariKasus(e, input.tcId)
  const nomor = db.urutan.bug
  db.urutan.bug += 1
  const bug: Bug = {
    id: 'BUG-' + String(nomor).padStart(3, '0'),
    judul: input.judul,
    severity: input.severity,
    prioritas: input.prioritas,
    tipe: input.tipe,
    actualResult: input.actualResult,
    executionId: input.executionId,
    tcId: input.tcId,
    evidence: [
      ...salin(k.evidence),
      ...input.evidenceBaru.map((b) => ({ id: nomorEvidence(), ...b, ditambahkanPada: new Date().toISOString() })),
    ],
    dibuatPada: new Date().toISOString(),
    dibuatOleh: db.users[0].id, // TODO backend: pengguna yang login
  }
  db.bugs.push(bug)
  k.bugId = bug.id
  return salin(bug)
}

// ---------- Export report ----------

export async function selesaikanExecution(executionId: string, opsi: OpsiLaporan): Promise<HasilExport> {
  // TODO backend: simpan hasil, tandai execution selesai, lalu buat berkas PDF/Excel di server.
  await jeda(700)
  const e = cariExecution(executionId)
  e.selesai = true
  return {
    format: opsi.format,
    namaFile: 'Report_' + slug(e.judul) + (opsi.format === 'pdf' ? '.pdf' : '.xlsx'),
    dibuatPada: new Date().toISOString(),
  }
}

export async function unduhLaporan(executionId: string, format: FormatLaporan): Promise<void> {
  // TODO backend: kirim berkas laporan ke pengguna.
  await jeda(200)
  void executionId
  void format
}

export async function kirimLaporanKeBot(executionId: string, format: FormatLaporan): Promise<void> {
  // TODO backend: bot mengirim berkas laporan ke chat pengguna lewat Bot API.
  await jeda(400)
  void executionId
  void format
}
