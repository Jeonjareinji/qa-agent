// Satu-satunya lapisan data untuk semua layar.
// Terhubung ke backend Express + PostgreSQL (/api/...), dengan fallback memori lokal bila server belum dijalankan.
import { DAFTAR_STATUS, FIELD_HARDWARE, FIELD_SOFTWARE, buatDataAwal, pratinjauContoh, validasiContoh } from '../data/dummy.ts'
import * as XLSX from 'xlsx'
import type {
  Bug,
  BugLengkap,
  Dashboard,
  Db,
  DetailKumpulan,
  ExecutionLengkap,
  FormatLaporan,
  HasilExport,
  HasilImport,
  ImportDraft,
  InputBug,
  InputUbahBug,
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
import { bugTerbuka, hitungStatus, jumlahDieksekusi, slug } from './hitung.ts'

const db: Db = buatDataAwal()

const jeda = (ms = 220): Promise<void> => new Promise((selesai) => setTimeout(selesai, ms))
const salin = <T>(nilai: T): T => structuredClone(nilai)

function unduhBlob(blob: Blob, namaFile: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const KUNCI_MODE_STORAGE = 'qa_agent_mode'

// Menentukan apakah aplikasi berjalan dalam Mode Statis (tanpa backend).
// Bisa diaktifkan lewat:
// 1. Parameter URL: ?mode=static (atau ?mode=backend untuk kembali ke backend)
// 2. Perintah npm: npm run dev:static / npm run build:static (VITE mode = 'static')
// 3. Env var: VITE_STATIC_MODE=true
export function isStaticMode(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const modeParam = params.get('mode')?.toLowerCase()
    if (modeParam === 'static') {
      sessionStorage.setItem(KUNCI_MODE_STORAGE, 'static')
      return true
    }
    if (modeParam === 'backend' || modeParam === 'api') {
      sessionStorage.setItem(KUNCI_MODE_STORAGE, 'backend')
      return false
    }
    const tersimpan = sessionStorage.getItem(KUNCI_MODE_STORAGE)
    if (tersimpan === 'static') return true
    if (tersimpan === 'backend') return false

    // Otomatis aktifkan mode statis jika berjalan di domain GitHub Pages (*.github.io)
    if (window.location.hostname.endsWith('.github.io')) {
      return true
    }
  }

  if (import.meta.env.MODE === 'static' || import.meta.env.VITE_STATIC_MODE === 'true') {
    return true
  }

  return false
}

class ApiHttpError extends Error {
  status: number
  constructor(pesan: string, status: number) {
    super(pesan)
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (isStaticMode()) {
    throw new Error('STATIC_MODE')
  }
  const initData = window.Telegram?.WebApp?.initData || ''
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (initData) {
    headers.set('Authorization', `tma ${initData}`)
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    // Bila bukan JSON dari backend (misal Vite proxy error 500/502 saat backend mati, atau 404 HTML di static hosting),
    // lempar Error biasa agar otomatis fallback ke mode statis tanpa error di UI.
    if (!contentType.includes('application/json') || res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`BACKEND_UNAVAILABLE_${res.status}`)
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    if (!body || typeof body.error !== 'string') {
      throw new Error(`BACKEND_UNAVAILABLE_${res.status}`)
    }
    throw new ApiHttpError(body.error || `HTTP ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('INVALID_API_RESPONSE')
  }
  return (await res.json()) as T
}

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
  try {
    return await apiFetch<Dashboard>(`/api/dashboard?periode=${encodeURIComponent(periode)}`)
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda()
    const hari = periode === '7' ? 7 : periode === 'sprint' ? 14 : 30
    const batas = Date.now() - hari * 86_400_000
    const dalamPeriode = db.executions.filter((ex) => Date.parse(ex.dibuatPada) >= batas)
    const hitung = hitungStatus(dalamPeriode.flatMap((ex) => ex.kasus))
    const dieksekusi = DAFTAR_STATUS.filter((s) => s !== 'Not Run').reduce((a, s) => a + hitung[s], 0)
    const bugPerSeverity: Record<Severity, number> = { Critical: 0, Major: 0, Minor: 0, Trivial: 0 }
    const bugAktif = db.bugs.filter((b) => bugTerbuka(b.status))
    for (const b of bugAktif) bugPerSeverity[b.severity] += 1
    const aktif = db.executions.filter((ex) => !ex.selesai)
    return {
      passRate: dieksekusi === 0 ? 0 : Math.round((hitung.Pass / dieksekusi) * 100),
      dieksekusi,
      hitung,
      testCaseTersimpan: db.kumpulan.reduce((a, k) => a + k.testCases.length, 0),
      executionAktif: aktif.length,
      bugOpen: bugAktif.length,
      bugPerSeverity,
      progressAktif: aktif.map((ex) => ({
        id: ex.id,
        judul: ex.judul,
        selesai: jumlahDieksekusi(ex.kasus),
        total: ex.kasus.length,
      })),
    }
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const rows = await apiFetch<{ id: string; nama: string; username?: string; peran?: User['peran'] }[]>('/api/users')
    if (rows.length > 0) {
      return rows.map((u) => ({
        id: String(u.id),
        nama: u.nama || 'Dev User',
        peran: u.peran || 'QA Software',
        username: u.username ? (u.username.startsWith('@') ? u.username : '@' + u.username) : '@tester',
      }))
    }
  } catch {
    // Fallback ke dummy
  }
  await jeda(120)
  return salin(db.users)
}

// ---------- Import test case ----------

export async function getPratinjauImport(jenis: Jenis, namaFile: string): Promise<PratinjauImport> {
  await jeda(300)
  return pratinjauContoh(jenis, namaFile)
}

export async function validasiImport(jenis: Jenis, draft?: ImportDraft): Promise<LaporanValidasi> {
  if (draft?.laporan) {
    return salin(draft.laporan)
  }
  await jeda(450)
  return validasiContoh(jenis)
}

export async function simpanImport(draft: ImportDraft): Promise<HasilImport> {
  const laporan = draft.laporan ?? validasiContoh(draft.jenis)
  const hitungBaris = (tingkat: 'error' | 'peringatan'): number =>
    new Set(laporan.temuan.filter((t) => t.tingkat === tingkat).map((t) => t.baris)).size

  const awalan = draft.jenis === 'software' ? 'DMO-IMP-' : 'HWD-IMP-'
  const testCases: TestCase[] =
    draft.cases && draft.cases.length > 0
      ? salin(draft.cases)
      : Array.from({ length: laporan.jumlahValid }, (_, i) => ({
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

  try {
    const res = await apiFetch<HasilImport>('/api/kumpulan', {
      method: 'POST',
      body: JSON.stringify({
        jenis: draft.jenis,
        judul: draft.judul,
        namaFile: draft.namaFile,
        sheet: draft.sheet ?? laporan.sheet,
        cases: testCases,
      }),
    })
    return {
      ...res,
      dilewati: Math.max(res.dilewati ?? 0, hitungBaris('error')),
      peringatan: hitungBaris('peringatan'),
    }
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(500)
    const nomor = db.urutan.kumpulan
    db.urutan.kumpulan += 1
    const kumpulan: KumpulanTestCase = {
      id: 'ks-' + nomor,
      judul: draft.judul,
      jenis: draft.jenis,
      namaFile: draft.namaFile,
      sheet: draft.sheet ?? laporan.sheet,
      diimporPada: new Date().toISOString(),
      diimporOleh: db.users[0].id,
      versi: 1,
      header: draft.header ?? pratinjauContoh(draft.jenis, draft.namaFile).header,
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
}

export async function unduhTemplate(jenis: Jenis): Promise<void> {
  try {
    if (isStaticMode()) throw new Error('STATIC_MODE')
    const res = await fetch(`/api/template/${encodeURIComponent(jenis)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) throw new Error('STATIC_FALLBACK')
    const blob = await res.blob()
    unduhBlob(blob, `Template_QA_${jenis === 'software' ? 'Software' : 'Hardware'}.xlsx`)
  } catch {
    const wb = XLSX.utils.book_new()
    const sheetName = jenis === 'software' ? 'TC_Software' : 'TC_Hardware'
    const headers = jenis === 'software' ? FIELD_SOFTWARE : FIELD_HARDWARE
    const aoa = [
      ['Project / Produk', 'Demo App'],
      ['Modul', 'Demo Module'],
      ['Versi Build / Release', '1.0.0'],
      ['Environment', 'SIT'],
      [],
      [],
      [],
      [],
      headers,
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `Template_QA_${jenis}.xlsx`)
  }
}

export async function unduhDaftarTemuan(): Promise<void> {
  const wb = XLSX.utils.book_new()
  const aoa = [
    ['DAFTAR TEMUAN VALIDASI EXCEL'],
    [],
    ['Baris', 'TC ID', 'Field', 'Tingkat', 'Pesan'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, 'Temuan')
  XLSX.writeFile(wb, 'Daftar_Temuan_Validasi.xlsx')
}

// ---------- Daftar dan detail test case ----------

export async function listKumpulan(): Promise<KumpulanRingkas[]> {
  try {
    return await apiFetch<KumpulanRingkas[]>('/api/kumpulan')
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda()
    return db.kumpulan.map((k) => ({
      id: k.id,
      judul: k.judul,
      jenis: k.jenis,
      jumlah: k.testCases.length,
      diimporPada: k.diimporPada,
      diimporOlehNama: namaUser(k.diimporOleh),
      dipakaiDi: db.executions.filter((ex) => ex.kumpulanIds.includes(k.id)).length,
    }))
  }
}

export async function getKumpulan(id: string): Promise<DetailKumpulan> {
  try {
    const k = await apiFetch<DetailKumpulan>(`/api/kumpulan/${encodeURIComponent(id)}`)
    return {
      ...k,
      header: Array.isArray(k.header)
        ? k.header.filter((h): h is { label: string; nilai: string } => Boolean(h && typeof h === 'object' && 'label' in h))
        : [],
    }
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda()
    const k = cariKumpulan(id)
    return {
      ...salin(k),
      diimporOlehNama: namaUser(k.diimporOleh),
      dipakaiDi: db.executions.filter((ex) => ex.kumpulanIds.includes(k.id)).map((ex) => ex.judul),
    }
  }
}

export async function updateTestCase(kumpulanId: string, tc: TestCase): Promise<DetailKumpulan> {
  try {
    return await apiFetch<DetailKumpulan>(
      `/api/kumpulan/${encodeURIComponent(kumpulanId)}/test-case/${encodeURIComponent(tc.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(tc),
      },
    )
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(350)
    const k = cariKumpulan(kumpulanId)
    const indeks = k.testCases.findIndex((t) => t.id === tc.id)
    if (indeks < 0) throw new Error('Test case tidak ditemukan.', { cause: e })
    k.testCases[indeks] = salin(tc)
    k.versi += 1
    return getKumpulan(kumpulanId)
  }
}

export async function unduhExcelKumpulan(kumpulanId: string): Promise<void> {
  const initData = window.Telegram?.WebApp?.initData || ''
  const headers: HeadersInit = {}
  if (initData) headers['Authorization'] = `tma ${initData}`
  try {
    if (isStaticMode()) throw new Error('STATIC_MODE')
    const res = await fetch(`/api/kumpulan/${encodeURIComponent(kumpulanId)}/download`, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) throw new Error('STATIC_FALLBACK')
    const blob = await res.blob()
    unduhBlob(blob, `Kumpulan_${kumpulanId}.xlsx`)
  } catch {
    const k = cariKumpulan(kumpulanId)
    const wb = XLSX.utils.book_new()
    const aoa = [
      ['TC ID', 'Modul / Menu', 'Fitur', 'Ref Requirement', 'Scenario', 'Tipe', 'Priority', 'Precondition', 'Test Data', 'Test Steps', 'Expected Result'],
      ...k.testCases.map((t) => [
        t.id,
        t.modul,
        t.fitur,
        t.refRequirement,
        t.scenario,
        t.tipe,
        t.prioritas,
        t.precondition,
        t.testData,
        t.steps.join('\n'),
        t.expected,
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, k.sheet || 'TC_Software')
    XLSX.writeFile(wb, `${slug(k.judul)}.xlsx`)
  }
}

// ---------- Test execution ----------

export async function listExecutions(): Promise<ExecutionLengkap[]> {
  try {
    return await apiFetch<ExecutionLengkap[]>('/api/executions')
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda()
    return [...db.executions].sort((a, b) => Date.parse(b.dibuatPada) - Date.parse(a.dibuatPada)).map(lengkapi)
  }
}

export async function getExecution(id: string): Promise<ExecutionLengkap> {
  try {
    return await apiFetch<ExecutionLengkap>(`/api/executions/${encodeURIComponent(id)}`)
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(160)
    return lengkapi(cariExecution(id))
  }
}

export async function buatExecution(input: InputExecution): Promise<ExecutionLengkap> {
  try {
    return await apiFetch<ExecutionLengkap>('/api/executions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(450)
    const kasus: KasusExecution[] = input.kumpulanIds.flatMap((id) =>
      cariKumpulan(id).testCases.map((t) => ({
        tcId: t.id,
        kumpulanId: id,
        jenis: t.jenis,
        modul: t.modul,
        fitur: t.fitur,
        refRequirement: t.refRequirement,
        precondition: t.precondition,
        testData: t.testData,
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
    const ex: TestExecution = {
      id: 'ex-' + nomor,
      judul: input.judul,
      kumpulanIds: [...input.kumpulanIds],
      picIds: [...input.picIds],
      dibuatOleh: db.users[0].id,
      dibuatPada: new Date().toISOString(),
      selesai: false,
      kasus,
    }
    db.executions.push(ex)
    return lengkapi(ex)
  }
}

export async function setStatusKasus(executionId: string, tcId: string, status: StatusKasus): Promise<ExecutionLengkap> {
  try {
    return await apiFetch<ExecutionLengkap>(
      `/api/executions/${encodeURIComponent(executionId)}/kasus/${encodeURIComponent(tcId)}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
    )
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(120)
    const ex = cariExecution(executionId)
    cariKasus(ex, tcId).status = status
    return lengkapi(ex)
  }
}

export async function simpanActualResult(executionId: string, tcId: string, teks: string): Promise<ExecutionLengkap> {
  try {
    return await apiFetch<ExecutionLengkap>(
      `/api/executions/${encodeURIComponent(executionId)}/kasus/${encodeURIComponent(tcId)}/actual-result`,
      {
        method: 'PUT',
        body: JSON.stringify({ actualResult: teks }),
      },
    )
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(100)
    const ex = cariExecution(executionId)
    cariKasus(ex, tcId).actualResult = teks
    return lengkapi(ex)
  }
}

export async function ubahKasus(executionId: string, tcId: string, steps: string[], expected: string): Promise<ExecutionLengkap> {
  await jeda(250)
  const e = cariExecution(executionId)
  const k = cariKasus(e, tcId)
  k.steps = [...steps]
  k.expected = expected
  k.diubah = true
  return lengkapi(e)
}

export async function kembalikanKasus(executionId: string, tcId: string): Promise<ExecutionLengkap> {
  await jeda(200)
  const e = cariExecution(executionId)
  const k = cariKasus(e, tcId)
  k.steps = [...k.asliSteps]
  k.expected = k.asliExpected
  k.diubah = false
  return lengkapi(e)
}

export async function tambahEvidence(executionId: string, tcId: string, input: InputEvidence): Promise<ExecutionLengkap> {
  try {
    return await apiFetch<ExecutionLengkap>(
      `/api/executions/${encodeURIComponent(executionId)}/kasus/${encodeURIComponent(tcId)}/evidence`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(250)
    const ex = cariExecution(executionId)
    cariKasus(ex, tcId).evidence.push({ id: nomorEvidence(), ...input, ditambahkanPada: new Date().toISOString() })
    return lengkapi(ex)
  }
}

export async function getBugBerikut(): Promise<string> {
  try {
    const r = await apiFetch<{ id: string }>('/api/bugs/next-id')
    return r.id
  } catch {
    await jeda(80)
    return 'BUG-' + String(db.urutan.bug).padStart(3, '0')
  }
}

export async function catatBug(input: InputBug): Promise<Bug> {
  try {
    return await apiFetch<Bug>('/api/bugs', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(400)
    const ex = cariExecution(input.executionId)
    const k = input.tcId === null ? null : cariKasus(ex, input.tcId)
    const nomor = db.urutan.bug
    db.urutan.bug += 1
    const bug: Bug = {
      id: 'BUG-' + String(nomor).padStart(3, '0'),
      judul: input.judul,
      status: 'Open',
      severity: input.severity,
      prioritas: input.prioritas,
      tipe: input.tipe,
      actualResult: input.actualResult,
      executionId: input.executionId,
      tcId: input.tcId,
      evidence: [
        ...(k ? salin(k.evidence) : []),
        ...input.evidenceBaru.map((b) => ({ id: nomorEvidence(), ...b, ditambahkanPada: new Date().toISOString() })),
      ],
      dibuatPada: new Date().toISOString(),
      dibuatOleh: db.users[0].id,
    }
    db.bugs.push(bug)
    if (k) k.bugId = bug.id
    return salin(bug)
  }
}

export async function updateBug(id: string, input: InputUbahBug): Promise<Bug> {
  try {
    return await apiFetch<Bug>(`/api/bugs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(350)
    const b = db.bugs.find((x) => x.id === id)
    if (!b) throw new Error('Bug tidak ditemukan.', { cause: e })
    b.judul = input.judul
    b.status = input.status
    b.severity = input.severity
    b.prioritas = input.prioritas
    b.tipe = input.tipe
    b.actualResult = input.actualResult
    b.evidence.push(...input.evidenceBaru.map((ev) => ({ id: nomorEvidence(), ...ev, ditambahkanPada: new Date().toISOString() })))
    return salin(b)
  }
}

// Semua bug, terbaru dulu.
export async function listBug(): Promise<BugLengkap[]> {
  try {
    return await apiFetch<BugLengkap[]>('/api/bugs')
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda()
    return [...db.bugs]
      .sort((a, b) => Date.parse(b.dibuatPada) - Date.parse(a.dibuatPada))
      .map((b) => ({
        ...salin(b),
        executionJudul: db.executions.find((ex) => ex.id === b.executionId)?.judul ?? b.executionId,
        dibuatOlehNama: namaUser(b.dibuatOleh),
      }))
  }
}

// Bug di luar scenario milik satu execution (bug yang terikat test case tampil di baris test case-nya).
export async function listBugDiLuarScenario(executionId: string): Promise<Bug[]> {
  try {
    return await apiFetch<Bug[]>(`/api/executions/${encodeURIComponent(executionId)}/bugs?tcId=null`)
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(120)
    return salin(db.bugs.filter((b) => b.executionId === executionId && b.tcId === null))
  }
}

// ---------- Export report ----------

export async function selesaikanExecution(executionId: string, opsi: OpsiLaporan): Promise<HasilExport> {
  try {
    return await apiFetch<HasilExport>(`/api/executions/${encodeURIComponent(executionId)}/finish`, {
      method: 'POST',
      body: JSON.stringify(opsi),
    })
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(700)
    const ex = cariExecution(executionId)
    ex.selesai = true
    return {
      format: opsi.format,
      namaFile: 'Report_' + slug(ex.judul) + (opsi.format === 'pdf' ? '.pdf' : '.xlsx'),
      dibuatPada: new Date().toISOString(),
    }
  }
}

// Laporan terakhir milik execution yang sudah selesai (null kalau belum selesai).
export async function getLaporan(executionId: string): Promise<HasilExport | null> {
  try {
    return await apiFetch<HasilExport | null>(`/api/executions/${encodeURIComponent(executionId)}/laporan`)
  } catch (e) {
    if (e instanceof ApiHttpError) throw e
    await jeda(150)
    const ex = cariExecution(executionId)
    if (!ex.selesai) return null
    return { format: 'pdf', namaFile: 'Report_' + slug(ex.judul) + '.pdf', dibuatPada: new Date().toISOString() }
  }
}

function buatPdfLaporanStatis(ex: TestExecution): Blob {
  const clean = (s: string) =>
    String(s || '')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')

  const hitung = hitungStatus(ex.kasus)
  const total = ex.kasus.length
  const dieksekusi = jumlahDieksekusi(ex.kasus)
  const passRate = dieksekusi > 0 ? Math.round((hitung.Pass / dieksekusi) * 100) : 0

  const cmds: string[] = []
  cmds.push('0.08 0.64 0.75 rg 36 764 523 42 re f')
  cmds.push('BT /F2 12 Tf 1 1 1 rg 48 780 Td (QA AGENT | TEST EXECUTION REPORT) Tj ET')
  cmds.push(`BT /F2 16 Tf 0.04 0.1 0.14 rg 36 736 Td (${clean(ex.judul)}) Tj ET`)
  cmds.push(
    `BT /F1 9.5 Tf 0.35 0.44 0.5 rg 36 718 Td (Total: ${total} | Pass Rate: ${passRate}% | Pass: ${hitung.Pass} | Fail: ${hitung.Fail} | Blocked: ${hitung.Blocked} | Not Run: ${hitung['Not Run']}) Tj ET`,
  )

  let y = 690
  for (const k of ex.kasus.slice(0, 22)) {
    if (y < 60) break
    cmds.push('0.96 0.98 0.99 rg 0.86 0.9 0.93 RG 36 ' + (y - 22) + ' 523 26 re b')
    cmds.push(`BT /F2 8.5 Tf 0.08 0.14 0.2 rg 44 ${y - 12} Td ([${clean(k.status)}] ${clean(k.tcId)} - ${clean(k.scenario).slice(0, 68)}) Tj ET`)
    y -= 30
  }

  const stream = cmds.join('\n')
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const o of objs) {
    offsets.push(pdf.length)
    pdf += o
  }
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export async function unduhLaporan(executionId: string, format: FormatLaporan): Promise<void> {
  const initData = window.Telegram?.WebApp?.initData || ''
  const headers: HeadersInit = {}
  if (initData) headers['Authorization'] = `tma ${initData}`

  const url = `/api/executions/${encodeURIComponent(executionId)}/download?format=${format}`
  try {
    if (isStaticMode()) throw new Error('STATIC_MODE')
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) throw new Error('STATIC_FALLBACK')
    const blob = await res.blob()

    let namaFile = `Report_${executionId}.${format}`
    const disp = res.headers.get('content-disposition')
    if (disp) {
      const match = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i.exec(disp)
      if (match?.[1]) namaFile = decodeURIComponent(match[1])
    }
    unduhBlob(blob, namaFile)
  } catch (e) {
    // Client fallback untuk Mode Statis atau bila server tidak dapat diakses
    try {
      const ex = cariExecution(executionId)
      const namaFile = `Report_${slug(ex.judul)}.${format}`
      if (format === 'xlsx') {
        const wb = XLSX.utils.book_new()
        const aoa = [
          ['QA AGENT — TEST EXECUTION REPORT'],
          ['Judul', ex.judul],
          ['Status', ex.selesai ? 'Done' : 'Running'],
          [],
          ['TC ID', 'Modul', 'Scenario', 'Status', 'Actual Result'],
          ...ex.kasus.map((k) => [k.tcId, k.modul, k.scenario, k.status, k.actualResult]),
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        XLSX.utils.book_append_sheet(wb, ws, 'Report')
        XLSX.writeFile(wb, namaFile)
        return
      }
      if (format === 'pdf') {
        const pdfBlob = buatPdfLaporanStatis(ex)
        unduhBlob(pdfBlob, namaFile)
        return
      }
    } catch (err) {
      void err
    }
    throw new Error('Gagal mengunduh file laporan.', { cause: e })
  }
}

export async function kirimLaporanKeBot(
  executionId: string,
  format: FormatLaporan,
): Promise<{ ok: boolean; message?: string }> {
  try {
    return await apiFetch<{ ok: boolean; message?: string }>(
      `/api/executions/${encodeURIComponent(executionId)}/kirim-bot`,
      {
        method: 'POST',
        body: JSON.stringify({ format }),
      },
    )
  } catch {
    await jeda(300)
    return { ok: true, message: 'Laporan dikirim' }
  }
}
