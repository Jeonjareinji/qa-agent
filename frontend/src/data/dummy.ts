// Tipe data dan data contoh QA Agent.
// Semua data di sini FIKTIF. Perubahan hanya tersimpan di memori selama sesi.

export type Jenis = 'software' | 'hardware'
export type Tipe = 'Positive' | 'Negative' | 'Edge'
export type Prioritas = 'High' | 'Medium' | 'Low'
export type Criticality = 'Safety-Critical' | 'High' | 'Medium' | 'Low'
export type StatusKasus = 'Not Run' | 'Pass' | 'Fail' | 'Blocked' | 'N/A'
export type Severity = 'Critical' | 'Major' | 'Minor' | 'Trivial'
export type PrioritasBug = 'P1 - Urgent' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low'
export type TipeBug =
  | 'Functional'
  | 'UI/UX'
  | 'Validation'
  | 'API'
  | 'Data'
  | 'Performance'
  | 'Security'
  | 'Compatibility'
  | 'Integration'
export type Periode = '30' | '7' | 'sprint'
export type StatusBug = 'Open' | 'In Progress' | 'Resolved' | 'Closed'
export type StatusExecution = 'belum' | 'berjalan' | 'selesai'
export type FormatLaporan = 'pdf' | 'xlsx'
export type JenisEvidence = 'foto' | 'galeri' | 'video' | 'link'

export const DAFTAR_STATUS: StatusKasus[] = ['Pass', 'Fail', 'Blocked', 'N/A', 'Not Run']
export const DAFTAR_STATUS_BUG: StatusBug[] = ['Open', 'In Progress', 'Resolved', 'Closed']
export const DAFTAR_SEVERITY: Severity[] = ['Critical', 'Major', 'Minor', 'Trivial']
export const DAFTAR_PRIORITAS_BUG: PrioritasBug[] = ['P1 - Urgent', 'P2 - High', 'P3 - Medium', 'P4 - Low']
export const DAFTAR_TIPE_BUG: TipeBug[] = [
  'Functional',
  'UI/UX',
  'Validation',
  'API',
  'Data',
  'Performance',
  'Security',
  'Compatibility',
  'Integration',
]
export const DAFTAR_PERIODE: { nilai: Periode; label: string }[] = [
  { nilai: '30', label: '30 hari terakhir' },
  { nilai: '7', label: '7 hari terakhir' },
  { nilai: 'sprint', label: 'Sprint ini' },
]

// ---------- Entitas ----------

export interface User {
  id: string
  nama: string
  peran: 'QA Software' | 'QA Hardware' | 'Engineer'
  username: string
}

export interface TestCase {
  id: string
  jenis: Jenis
  modul: string // software: Modul / Menu. hardware: Komponen / Subsistem.
  fitur: string // hanya software ('' untuk hardware).
  refRequirement: string
  scenario: string
  tipe: Tipe
  prioritas: Prioritas | Criticality // software: Priority. hardware: Criticality.
  precondition: string
  testData: string
  steps: string[]
  expected: string
  // Khusus hardware
  parameterDiukur?: string
  satuan?: string
  batasLulus?: string
  sumberSpec?: string
}

export interface HeaderSheet {
  label: string
  nilai: string
}

export interface KumpulanTestCase {
  id: string
  judul: string
  jenis: Jenis
  namaFile: string
  sheet: string
  diimporPada: string
  diimporOleh: string // id User
  versi: number
  header: HeaderSheet[]
  testCases: TestCase[]
}

export interface Evidence {
  id: string
  jenis: JenisEvidence
  nama: string
  url: string | null // alamat pratinjau (foto/galeri) atau tautan (link)
  ditambahkanPada: string
}

export interface KasusExecution {
  tcId: string
  kumpulanId: string
  jenis: Jenis
  modul: string
  fitur?: string
  refRequirement?: string
  precondition?: string
  testData?: string
  prioritas: Prioritas | Criticality
  tipe: Tipe
  scenario: string
  // Salinan saat execution dibuat. Mengubahnya tidak mengubah test case utama.
  steps: string[]
  expected: string
  asliSteps: string[]
  asliExpected: string
  diubah: boolean
  status: StatusKasus
  actualResult: string
  evidence: Evidence[]
  bugId: string | null
}

export interface TestExecution {
  id: string
  judul: string
  kumpulanIds: string[]
  picIds: string[]
  dibuatOleh: string // id User
  dibuatPada: string
  selesai: boolean
  kasus: KasusExecution[]
}

export interface Bug {
  id: string
  judul: string
  status: StatusBug
  severity: Severity
  prioritas: PrioritasBug
  tipe: TipeBug
  actualResult: string
  executionId: string
  tcId: string | null // null = bug di luar scenario (masih dalam satu execution)
  evidence: Evidence[]
  dibuatPada: string
  dibuatOleh: string
}

// ---------- Tipe untuk layar ----------

export interface BugLengkap extends Bug {
  executionJudul: string
  dibuatOlehNama: string
}

export interface KumpulanRingkas {
  id: string
  judul: string
  jenis: Jenis
  jumlah: number
  diimporPada: string
  diimporOlehNama: string
  dipakaiDi: number
}

export interface DetailKumpulan extends KumpulanTestCase {
  diimporOlehNama: string
  dipakaiDi: string[] // judul execution
}

export interface ExecutionLengkap extends TestExecution {
  picNama: string[]
  dibuatOlehNama: string
}

export interface Dashboard {
  passRate: number
  dieksekusi: number
  hitung: Record<StatusKasus, number>
  testCaseTersimpan: number
  executionAktif: number
  bugOpen: number
  bugPerSeverity: Record<Severity, number>
  progressAktif: { id: string; judul: string; selesai: number; total: number }[]
}

export interface BarisPratinjau {
  id: string
  area: string
  scenario: string
  tipe: Tipe
  levelKey: 'Priority' | 'Criticality'
  level: string
  parameter?: string
  batasLulus?: string
}

export interface PratinjauImport {
  sheet: string
  jumlah: number
  header: HeaderSheet[]
  baris: BarisPratinjau[]
}

export interface Temuan {
  baris: number
  id: string
  field: string
  pesan: string
  tingkat: 'error' | 'peringatan'
}

export interface CekHeader {
  label: string
  terisi: boolean
}

export interface LaporanValidasi {
  jenis: Jenis
  sheet: string
  fields: string[]
  header: CekHeader[]
  catatanDiabaikan: string
  temuan: Temuan[]
  jumlahBaris: number
  jumlahValid: number
}

export interface ImportDraft {
  jenis: Jenis
  namaFile: string
  judul: string
  sheet?: string
  header?: HeaderSheet[]
  cases?: TestCase[]
  laporan?: LaporanValidasi
}

export interface HasilImport {
  kumpulanId: string
  judul: string
  jenis: Jenis
  namaFile: string
  sheet: string
  tersimpan: number
  dilewati: number
  peringatan: number
  daftar: { id: string; scenario: string }[]
  diimporPada: string
  diimporOlehNama: string
}

export interface InputExecution {
  judul: string
  kumpulanIds: string[]
  picIds: string[]
}

export interface InputEvidence {
  jenis: JenisEvidence
  nama: string
  url: string | null
}

export interface InputBug {
  executionId: string
  tcId: string | null // null = bug di luar scenario (masih dalam satu execution)
  judul: string
  severity: Severity
  prioritas: PrioritasBug
  tipe: TipeBug
  actualResult: string
  evidenceBaru: InputEvidence[]
}

export interface InputUbahBug {
  judul: string
  status: StatusBug
  severity: Severity
  prioritas: PrioritasBug
  tipe: TipeBug
  actualResult: string
  evidenceBaru: InputEvidence[]
}

export interface OpsiLaporan {
  format: FormatLaporan
  sertakanActual: boolean
  sertakanLangkah: boolean
  sertakanEvidence: boolean
}

export interface HasilExport {
  format: FormatLaporan
  namaFile: string
  dibuatPada: string
}

export interface Db {
  users: User[]
  kumpulan: KumpulanTestCase[]
  executions: TestExecution[]
  bugs: Bug[]
  urutan: { kumpulan: number; execution: number; bug: number; evidence: number }
}

// ---------- Konstanta validasi (contoh) ----------

export const FIELD_SOFTWARE = [
  'TC ID',
  'Modul / Menu',
  'Fitur',
  'Ref Requirement',
  'Scenario',
  'Tipe',
  'Priority',
  'Precondition',
  'Test Data',
  'Test Steps',
  'Expected Result',
]

export const FIELD_HARDWARE = [
  'TC ID',
  'Komponen / Subsistem',
  'Scenario',
  'Tipe',
  'Criticality',
  'Precondition (kondisi device)',
  'Test Steps',
  'Parameter Diukur',
  'Satuan',
  'Batas Lulus (Spec)',
  'Sumber Spec',
  'Expected Result',
]

const hariLalu = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString()

// ---------- Pembangun data contoh ----------

type BarisSw = [id: string, tipe: Tipe, prioritas: Prioritas, scenario: string, langkah: string, expected: string]
type BarisHw = [
  id: string,
  tipe: Tipe,
  criticality: Criticality,
  scenario: string,
  langkah: string,
  expected: string,
  parameter: string,
  satuan: string,
  batas: string,
  sumber: string,
]

function buatSoftware(modul: string, fitur: string, pre: string, data: string, baris: BarisSw[]): TestCase[] {
  return baris.map(([id, tipe, prioritas, scenario, langkah, expected]) => ({
    id,
    jenis: 'software',
    modul,
    fitur,
    refRequirement: 'REQ-DEMO-' + id.slice(-3),
    scenario,
    tipe,
    prioritas,
    precondition: pre,
    testData: data,
    steps: langkah.split('|'),
    expected,
  }))
}

function buatHardware(pre: string, baris: BarisHw[]): TestCase[] {
  return baris.map(([id, tipe, criticality, scenario, langkah, expected, parameter, satuan, batas, sumber]) => ({
    id,
    jenis: 'hardware',
    modul: id.startsWith('HWD-DAYA') ? 'Modul Daya' : id.startsWith('HWD-SUHU') ? 'Sensor Suhu' : 'Mekanik',
    fitur: '',
    refRequirement: 'SPEC-DEMO-' + id.slice(-3),
    scenario,
    tipe,
    prioritas: criticality,
    precondition: pre,
    testData: '',
    steps: langkah.split('|'),
    expected,
    parameterDiukur: parameter,
    satuan,
    batasLulus: batas,
    sumberSpec: sumber,
  }))
}

const HEADER_SOFTWARE: HeaderSheet[] = [
  { label: 'Project / Produk', nilai: 'Aplikasi Contoh' },
  { label: 'Modul', nilai: 'Contoh Modul' },
  { label: 'Versi Build', nilai: '2.4.0-demo' },
  { label: 'Environment', nilai: 'SIT' },
]

const HEADER_HARDWARE: HeaderSheet[] = [
  { label: 'Produk & Model', nilai: 'Perangkat Contoh X1' },
  { label: 'Serial Number', nilai: 'DEMO-0001' },
  { label: 'Versi Firmware', nilai: '1.0.0-demo' },
  { label: 'Lokasi Uji', nilai: 'Lab Contoh' },
]

function kasusDari(k: KumpulanTestCase): KasusExecution[] {
  return k.testCases.map((t) => ({
    tcId: t.id,
    kumpulanId: k.id,
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
    status: 'Not Run',
    actualResult: '',
    evidence: [],
    bugId: null,
  }))
}

export function buatDataAwal(): Db {
  const users: User[] = [
    { id: 'usr-1', nama: 'Tester Alfa', peran: 'QA Software', username: '@demo_alfa' },
    { id: 'usr-2', nama: 'Tester Beta', peran: 'QA Software', username: '@demo_beta' },
    { id: 'usr-3', nama: 'Tester Gamma', peran: 'QA Hardware', username: '@demo_gamma' },
    { id: 'usr-4', nama: 'Engineer Delta', peran: 'Engineer', username: '@demo_delta' },
  ]

  const ks1: KumpulanTestCase = {
    id: 'ks-1',
    judul: 'Modul Masuk Akun — Regression',
    jenis: 'software',
    namaFile: 'contoh_masuk_akun.xlsx',
    sheet: 'TC_Software',
    diimporPada: hariLalu(25),
    diimporOleh: 'usr-1',
    versi: 1,
    header: HEADER_SOFTWARE.map((h) => (h.label === 'Modul' ? { ...h, nilai: 'Masuk Akun' } : h)),
    testCases: buatSoftware('Halaman Masuk', 'Masuk Akun', 'Pengguna memiliki akun aktif dan berada di halaman Masuk.', 'Email: [akun uji] · Kata sandi: [kata sandi uji]', [
      ['DMO-MASUK-001', 'Positive', 'High', 'Masuk dengan email dan kata sandi yang valid', 'Buka halaman Masuk|Isi email dan kata sandi valid|Ketuk Masuk', 'Pengguna masuk ke Beranda.'],
      ['DMO-MASUK-002', 'Negative', 'High', 'Masuk dengan kata sandi yang salah', 'Buka halaman Masuk|Isi kata sandi yang salah|Ketuk Masuk', 'Muncul pesan galat dan pengguna tetap di halaman Masuk.'],
      ['DMO-MASUK-003', 'Positive', 'Medium', 'Lupa kata sandi dan kirim tautan reset', 'Ketuk "Lupa kata sandi"|Isi email terdaftar|Ketuk Kirim', 'Tautan reset terkirim dan muncul konfirmasi.'],
      ['DMO-MASUK-004', 'Positive', 'Medium', 'Keluar dari menu profil', 'Buka menu Profil|Ketuk Keluar|Konfirmasi', 'Pengguna kembali ke halaman Masuk.'],
      ['DMO-MASUK-005', 'Edge', 'Low', 'Ingat saya setelah aplikasi ditutup', 'Centang "Ingat saya"|Masuk|Tutup dan buka ulang aplikasi', 'Pengguna tetap masuk.'],
      ['DMO-MASUK-006', 'Negative', 'Medium', 'Masuk dengan email yang belum terdaftar', 'Buka halaman Masuk|Isi email yang belum terdaftar|Ketuk Masuk', 'Muncul pesan bahwa akun tidak ditemukan.'],
      ['DMO-MASUK-007', 'Negative', 'High', 'Akun dikunci setelah 5 kali salah', 'Isi kata sandi salah 5 kali berturut-turut|Ketuk Masuk', 'Akun dikunci sementara dan muncul informasi waktu tunggu.'],
      ['DMO-MASUK-008', 'Edge', 'Low', 'Email dengan huruf besar dan spasi', 'Isi email dengan huruf besar dan spasi di ujung|Ketuk Masuk', 'Email dirapikan dan pengguna berhasil masuk.'],
      ['DMO-MASUK-009', 'Positive', 'Medium', 'Tampilkan atau sembunyikan kata sandi', 'Isi kata sandi|Ketuk ikon mata', 'Kata sandi tampil lalu tersembunyi kembali.'],
      ['DMO-MASUK-010', 'Negative', 'Low', 'Kolom kosong menampilkan pesan wajib diisi', 'Kosongkan email dan kata sandi|Ketuk Masuk', 'Muncul pesan "wajib diisi" di tiap kolom.'],
      ['DMO-MASUK-011', 'Edge', 'Medium', 'Masuk saat koneksi terputus', 'Matikan koneksi|Isi email dan kata sandi|Ketuk Masuk', 'Muncul pesan koneksi terputus tanpa menutup aplikasi.'],
      ['DMO-MASUK-012', 'Positive', 'High', 'Sesi berakhir otomatis setelah 30 menit', 'Masuk|Diamkan aplikasi 30 menit|Buka kembali', 'Pengguna diminta masuk lagi.'],
    ]),
  }

  const ks2: KumpulanTestCase = {
    id: 'ks-2',
    judul: 'Keranjang & Pembayaran',
    jenis: 'software',
    namaFile: 'contoh_keranjang.xlsx',
    sheet: 'TC_Software',
    diimporPada: hariLalu(18),
    diimporOleh: 'usr-2',
    versi: 1,
    header: HEADER_SOFTWARE.map((h) => (h.label === 'Modul' ? { ...h, nilai: 'Keranjang' } : h)),
    testCases: buatSoftware('Keranjang', 'Checkout', 'Pengguna sudah masuk dan ada produk di katalog.', 'Kartu uji: [kartu uji]', [
      ['DMO-BAYAR-001', 'Positive', 'High', 'Tambah produk ke keranjang', 'Buka katalog|Pilih produk|Ketuk Tambah ke keranjang', 'Produk muncul di keranjang dengan jumlah 1.'],
      ['DMO-BAYAR-002', 'Positive', 'High', 'Ubah jumlah produk di keranjang', 'Buka keranjang|Ketuk tambah jumlah|Ketuk kurangi jumlah', 'Jumlah dan total harga ikut berubah.'],
      ['DMO-BAYAR-003', 'Negative', 'High', 'Pembayaran ditolak saat saldo tidak cukup', 'Buka keranjang|Pilih metode saldo kosong|Ketuk Bayar', 'Pembayaran ditolak dengan pesan saldo tidak cukup.'],
      ['DMO-BAYAR-004', 'Positive', 'High', 'Pembayaran berhasil dengan kartu uji', 'Buka keranjang|Pilih kartu uji|Ketuk Bayar', 'Pembayaran berhasil dan status pesanan menjadi Dibayar.'],
      ['DMO-BAYAR-005', 'Edge', 'Medium', 'Jumlah produk melebihi stok', 'Buka keranjang|Isi jumlah melebihi stok|Ketuk Bayar', 'Muncul pesan stok tidak mencukupi.'],
      ['DMO-BAYAR-006', 'Positive', 'Medium', 'Terapkan kode promo yang valid', 'Buka keranjang|Isi kode promo valid|Ketuk Terapkan', 'Potongan harga tampil di ringkasan.'],
      ['DMO-BAYAR-007', 'Negative', 'Low', 'Kode promo kedaluwarsa ditolak', 'Buka keranjang|Isi kode promo kedaluwarsa|Ketuk Terapkan', 'Muncul pesan kode promo tidak berlaku.'],
      ['DMO-BAYAR-008', 'Positive', 'Medium', 'Struk pembayaran dapat dibagikan', 'Selesaikan pembayaran|Ketuk Bagikan struk', 'Lembar bagikan terbuka berisi struk.'],
    ]),
  }

  const ks3: KumpulanTestCase = {
    id: 'ks-3',
    judul: 'Notifikasi Dorong',
    jenis: 'software',
    namaFile: 'contoh_notifikasi.xlsx',
    sheet: 'TC_Software',
    diimporPada: hariLalu(10),
    diimporOleh: 'usr-1',
    versi: 1,
    header: HEADER_SOFTWARE.map((h) => (h.label === 'Modul' ? { ...h, nilai: 'Notifikasi' } : h)),
    testCases: buatSoftware('Notifikasi', 'Pengaturan Notifikasi', 'Pengguna sudah masuk dan izin notifikasi aktif.', 'Pesanan uji: [pesanan uji]', [
      ['DMO-NOTIF-001', 'Positive', 'High', 'Notifikasi muncul saat pesanan dikirim', 'Ubah status pesanan menjadi Dikirim|Tunggu notifikasi', 'Notifikasi pesanan dikirim muncul di perangkat.'],
      ['DMO-NOTIF-002', 'Positive', 'Medium', 'Matikan notifikasi dari pengaturan', 'Buka Pengaturan|Matikan Notifikasi|Ubah status pesanan', 'Tidak ada notifikasi yang muncul.'],
      ['DMO-NOTIF-003', 'Negative', 'Medium', 'Tidak ada notifikasi saat izin ditolak', 'Tolak izin notifikasi|Ubah status pesanan', 'Tidak ada notifikasi dan aplikasi tidak galat.'],
      ['DMO-NOTIF-004', 'Edge', 'Low', 'Notifikasi bertumpuk dikelompokkan', 'Kirim 5 notifikasi berturut-turut|Buka pusat notifikasi', 'Notifikasi dikelompokkan dalam satu tumpukan.'],
      ['DMO-NOTIF-005', 'Positive', 'Low', 'Ketuk notifikasi membuka layar pesanan', 'Terima notifikasi|Ketuk notifikasi', 'Layar detail pesanan terbuka.'],
      ['DMO-NOTIF-006', 'Negative', 'Medium', 'Notifikasi tidak dikirim saat mode senyap', 'Aktifkan mode senyap|Ubah status pesanan', 'Notifikasi ditahan sampai mode senyap selesai.'],
    ]),
  }

  const ks4: KumpulanTestCase = {
    id: 'ks-4',
    judul: 'Uji Unit Contoh X1 — Lab',
    jenis: 'hardware',
    namaFile: 'contoh_perangkat.xlsx',
    sheet: 'TC_Hardware',
    diimporPada: hariLalu(6),
    diimporOleh: 'usr-3',
    versi: 1,
    header: HEADER_HARDWARE,
    testCases: buatHardware('Perangkat menyala dan siap diuji.', [
      ['HWD-DAYA-001', 'Positive', 'Safety-Critical', 'Tegangan keluaran stabil saat beban penuh', 'Pasang beban penuh|Catat tegangan keluaran selama 10 menit', 'Tegangan keluaran tetap dalam batas lulus.', 'Tegangan keluaran', 'V', '11,4–12,6', '[usulan demo]'],
      ['HWD-SUHU-001', 'Positive', 'High', 'Suhu casing tetap di bawah batas', 'Jalankan perangkat 30 menit|Catat suhu casing', 'Suhu casing tercatat dan di bawah batas.', 'Suhu casing maksimum', '°C', 'TBD', '[belum ada]'],
      ['HWD-SUHU-002', 'Positive', 'High', 'Suhu baterai stabil selama siklus', 'Jalankan 3 siklus pengisian|Catat suhu baterai', 'Suhu baterai tercatat tiap siklus.', 'Suhu baterai maksimum', '°C', 'TBD', '[belum ada]'],
      ['HWD-MEKA-001', 'Positive', 'Medium', 'Penutup terbuka penuh dalam batas waktu', 'Tekan tombol Buka|Ukur waktu sampai terbuka penuh', 'Penutup terbuka penuh dan waktu tercatat.', 'Waktu buka penutup', 'detik', 'TBD', '[belum ada]'],
      ['HWD-DAYA-002', 'Negative', 'Medium', 'Perangkat mati aman saat tegangan rendah', 'Turunkan tegangan masukan bertahap|Amati perilaku perangkat', 'Perangkat mati aman tanpa kerusakan.', 'Tegangan cut-off', 'V', '10,8', '[usulan demo]'],
    ]),
  }

  const kumpulan = [ks1, ks2, ks3, ks4]
  const kasusDi = (daftar: KasusExecution[], tcId: string): KasusExecution => {
    const ditemukan = daftar.find((k) => k.tcId === tcId)
    if (!ditemukan) throw new Error('Data contoh tidak konsisten: ' + tcId)
    return ditemukan
  }
  let urutBukti = 0
  const bukti = (jumlah: number): Evidence[] =>
    Array.from({ length: jumlah }, () => {
      urutBukti += 1
      return {
        id: 'ev-' + urutBukti,
        jenis: 'foto' as const,
        nama: 'bukti-' + urutBukti + '.jpg',
        url: null,
        ditambahkanPada: hariLalu(2),
      }
    })

  // Execution 1: berjalan (8 dari 18 sudah dieksekusi)
  const kasus1 = [...kasusDari(ks1), ...kasusDari(ks3)]
  const atur1: [string, StatusKasus, number, string | null][] = [
    ['DMO-MASUK-001', 'Pass', 2, null],
    ['DMO-MASUK-002', 'Pass', 1, null],
    ['DMO-MASUK-003', 'Pass', 1, null],
    ['DMO-MASUK-004', 'Fail', 1, 'BUG-001'],
    ['DMO-MASUK-005', 'Pass', 1, null],
    ['DMO-MASUK-006', 'Pass', 1, null],
    ['DMO-MASUK-007', 'Blocked', 0, null],
    ['DMO-MASUK-008', 'Pass', 1, null],
  ]
  for (const [tcId, status, jumlahBukti, bugId] of atur1) {
    const k = kasusDi(kasus1, tcId)
    k.status = status
    k.evidence = bukti(jumlahBukti)
    k.bugId = bugId
  }
  const diubah = kasusDi(kasus1, 'DMO-MASUK-009')
  diubah.steps = [...diubah.asliSteps, 'Periksa ikon mata kembali ke keadaan semula']
  diubah.expected = 'Kata sandi tampil lalu tersembunyi kembali tanpa kehilangan isian.'
  diubah.diubah = true

  // Execution 4: selesai (20 kasus dieksekusi)
  const kasus4 = [...kasusDari(ks1), ...kasusDari(ks2)]
  const bugKasus4: Record<number, string> = { 3: 'BUG-002', 9: 'BUG-003', 13: 'BUG-004', 18: 'BUG-005' }
  kasus4.forEach((k, i) => {
    k.status = bugKasus4[i] ? 'Fail' : i === 7 ? 'Blocked' : i === 16 ? 'N/A' : 'Pass'
    k.evidence = bukti(1)
    k.bugId = bugKasus4[i] ?? null
  })

  const executions: TestExecution[] = [
    {
      id: 'ex-1',
      judul: 'Regression Sprint 24',
      kumpulanIds: ['ks-1', 'ks-3'],
      picIds: ['usr-1'],
      dibuatOleh: 'usr-1',
      dibuatPada: hariLalu(2),
      selesai: false,
      kasus: kasus1,
    },
    {
      id: 'ex-2',
      judul: 'Smoke Test Rilis 2.4',
      kumpulanIds: ['ks-3'],
      picIds: ['usr-2'],
      dibuatOleh: 'usr-1',
      dibuatPada: hariLalu(1),
      selesai: false,
      kasus: kasusDari(ks3),
    },
    {
      id: 'ex-3',
      judul: 'UAT Keranjang',
      kumpulanIds: ['ks-2'],
      picIds: ['usr-1', 'usr-2'],
      dibuatOleh: 'usr-2',
      dibuatPada: hariLalu(3),
      selesai: false,
      kasus: kasusDari(ks2),
    },
    {
      id: 'ex-4',
      judul: 'Regression Sprint 23',
      kumpulanIds: ['ks-1', 'ks-2'],
      picIds: ['usr-2'],
      dibuatOleh: 'usr-2',
      dibuatPada: hariLalu(20),
      selesai: true,
      kasus: kasus4,
    },
  ]

  const bug = (id: string, judul: string, severity: Severity, prioritas: PrioritasBug, tipe: TipeBug, executionId: string, tcId: string, hari: number): Bug => ({
    id,
    judul,
    status: 'Open',
    severity,
    prioritas,
    tipe,
    actualResult: 'Perilaku tidak sesuai dengan expected result (data contoh).',
    executionId,
    tcId,
    evidence: [],
    dibuatPada: hariLalu(hari),
    dibuatOleh: 'usr-1',
  })
  const bugs: Bug[] = [
    bug('BUG-001', 'Tombol Keluar tidak menutup sesi', 'Major', 'P2 - High', 'Functional', 'ex-1', 'DMO-MASUK-004', 2),
    bug('BUG-002', 'Keluar dari profil memunculkan layar kosong', 'Critical', 'P1 - Urgent', 'Functional', 'ex-4', 'DMO-MASUK-004', 20),
    bug('BUG-003', 'Ikon mata tidak berubah saat diketuk', 'Major', 'P2 - High', 'UI/UX', 'ex-4', 'DMO-MASUK-010', 20),
    bug('BUG-004', 'Total harga tidak ikut berubah', 'Minor', 'P3 - Medium', 'Data', 'ex-4', 'DMO-BAYAR-002', 20),
    bug('BUG-005', 'Struk terpotong di layar kecil', 'Trivial', 'P4 - Low', 'UI/UX', 'ex-4', 'DMO-BAYAR-007', 20),
  ]

  return {
    users,
    kumpulan,
    executions,
    bugs,
    urutan: { kumpulan: 5, execution: 5, bug: 6, evidence: urutBukti + 1 },
  }
}

// ---------- Contoh hasil import dan validasi (data tetap) ----------

export function pratinjauContoh(jenis: Jenis, namaFile: string): PratinjauImport {
  if (jenis === 'hardware') {
    return {
      sheet: 'TC_Hardware',
      jumlah: 12,
      header: HEADER_HARDWARE,
      baris: [
        { id: 'HWD-DAYA-001', area: 'Modul Daya', scenario: 'Tegangan keluaran stabil saat beban penuh', tipe: 'Positive', levelKey: 'Criticality', level: 'Safety-Critical', parameter: 'Tegangan keluaran', batasLulus: '11,4–12,6 V' },
        { id: 'HWD-MEKA-001', area: 'Mekanik', scenario: 'Penutup terbuka penuh dalam batas waktu', tipe: 'Positive', levelKey: 'Criticality', level: 'Medium', parameter: 'Waktu buka penutup', batasLulus: 'TBD detik' },
      ],
    }
  }
  return {
    sheet: 'TC_Software',
    jumlah: 18,
    header: HEADER_SOFTWARE.map((h) => (h.label === 'Modul' ? { ...h, nilai: namaFile.replace(/\.[^.]+$/, '') } : h)),
    baris: [
      { id: 'DMO-MASUK-001', area: 'Halaman Masuk', scenario: 'Masuk dengan email dan kata sandi yang valid', tipe: 'Positive', levelKey: 'Priority', level: 'High' },
      { id: 'DMO-MASUK-002', area: 'Halaman Masuk', scenario: 'Masuk dengan kata sandi yang salah', tipe: 'Negative', levelKey: 'Priority', level: 'High' },
    ],
  }
}

export function validasiContoh(jenis: Jenis): LaporanValidasi {
  if (jenis === 'hardware') {
    return {
      jenis,
      sheet: 'TC_Hardware',
      fields: FIELD_HARDWARE,
      header: [
        { label: 'Produk & Model', terisi: true },
        { label: 'Serial Number / Unit ID', terisi: false },
        { label: 'Versi Firmware / Software', terisi: true },
        { label: 'Jenis Testing', terisi: true },
        { label: 'Referensi Spesifikasi', terisi: true },
        { label: 'Lokasi Uji', terisi: true },
      ],
      catatanDiabaikan:
        'Nilai Terukur, Actual Result, Status, Evidence, Bug ID, Tester, Tanggal Test, Notes dan kolom [Opsional] diabaikan saat import. Kolom hasil ini diisi di Test Execution.',
      jumlahBaris: 12,
      jumlahValid: 8,
      temuan: [
        { baris: 15, id: '(kosong)', field: 'TC ID', pesan: 'Wajib diisi.', tingkat: 'error' },
        { baris: 16, id: 'HWD-DAYA-001', field: 'TC ID', pesan: 'Duplikat dengan baris 14.', tingkat: 'error' },
        { baris: 18, id: 'HWD-MEKA-002', field: 'Criticality', pesan: '"Critical" tidak ada di daftar. Pilih: Safety-Critical, High, Medium, Low.', tingkat: 'error' },
        { baris: 19, id: 'HWD-DAYA-003', field: 'Satuan', pesan: 'Wajib diisi karena Parameter Diukur terisi.', tingkat: 'error' },
        { baris: 17, id: 'HWD-SUHU-001', field: 'Batas Lulus (Spec)', pesan: 'Masih TBD. Test case ini tidak bisa berstatus Pass sampai batas lulus diisi.', tingkat: 'peringatan' },
        { baris: 17, id: 'HWD-SUHU-001', field: 'Sumber Spec', pesan: 'Masih placeholder "[belum ada]".', tingkat: 'peringatan' },
      ],
    }
  }
  return {
    jenis,
    sheet: 'TC_Software',
    fields: FIELD_SOFTWARE,
    header: [
      { label: 'Project / Produk', terisi: true },
      { label: 'Modul', terisi: true },
      { label: 'Versi Build / Release', terisi: true },
      { label: 'Environment', terisi: true },
      { label: 'Jenis Testing', terisi: false },
      { label: 'Tester', terisi: true },
    ],
    catatanDiabaikan:
      'Actual Result, Status, Evidence, Bug ID, Tester, Tanggal Test dan Notes diabaikan saat import. Kolom hasil ini diisi di Test Execution.',
    jumlahBaris: 18,
    jumlahValid: 12,
    temuan: [
      { baris: 15, id: '(kosong)', field: 'TC ID', pesan: 'Wajib diisi.', tingkat: 'error' },
      { baris: 17, id: 'DMO-LGN-07', field: 'TC ID', pesan: 'Format harus [PRODUK]-[MODUL]-[3 digit], mis. DMO-MASUK-007.', tingkat: 'error' },
      { baris: 18, id: 'DMO-MASUK-002', field: 'TC ID', pesan: 'Duplikat dengan baris 13.', tingkat: 'error' },
      { baris: 20, id: 'DMO-MASUK-009', field: 'Tipe', pesan: '"Positif" tidak ada di daftar. Pilih: Positive, Negative, Edge.', tingkat: 'error' },
      { baris: 21, id: 'DMO-MASUK-010', field: 'Priority', pesan: '"Urgent" tidak ada di daftar. Pilih: High, Medium, Low.', tingkat: 'error' },
      { baris: 22, id: 'DMO-MASUK-011', field: 'Expected Result', pesan: 'Wajib diisi.', tingkat: 'error' },
      { baris: 19, id: 'DMO-MASUK-008', field: 'Ref Requirement', pesan: 'Masih placeholder "[isi ref]".', tingkat: 'peringatan' },
      { baris: 24, id: 'DMO-MASUK-013', field: 'Test Data', pesan: 'Masih placeholder "[akun uji]".', tingkat: 'peringatan' },
    ],
  }
}
