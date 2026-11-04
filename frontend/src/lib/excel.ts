import * as XLSX from 'xlsx'
import { FIELD_HARDWARE, FIELD_SOFTWARE } from '../data/dummy.ts'
import type {
  BarisPratinjau,
  CekHeader,
  Criticality,
  HeaderSheet,
  Jenis,
  LaporanValidasi,
  PratinjauImport,
  Prioritas,
  Temuan,
  TestCase,
  Tipe,
} from '../data/dummy.ts'

export interface HasilBacaExcel {
  sheet: string
  header: HeaderSheet[]
  cases: TestCase[]
  pratinjau: PratinjauImport
  laporan: LaporanValidasi
  temuan: Temuan[]
}

const TIPE_VALID: Tipe[] = ['Positive', 'Negative', 'Edge']
const PRIORITAS_VALID: Prioritas[] = ['High', 'Medium', 'Low']
const CRITICALITY_VALID: Criticality[] = ['Safety-Critical', 'High', 'Medium', 'Low']

const LABEL_HEADER_SW = ['Project / Produk', 'Modul', 'Versi Build / Release', 'Environment', 'Jenis Testing', 'Tester']
const LABEL_HEADER_HW = [
  'Produk & Model',
  'Serial Number / Unit ID',
  'Versi Firmware / Software',
  'Jenis Testing',
  'Referensi Spesifikasi',
  'Lokasi Uji',
]

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function normKunci(s: unknown): string {
  return norm(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function pecahLangkah(teks: string): string[] {
  return teks
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

function cariBarisHeader(aoa: unknown[][]): number {
  const kataKunci = ['tcid', 'scenario', 'skenario', 'teststeps', 'expectedresult', 'modulmenu', 'komponensubsistem']
  let terbaik = 0
  let skorTerbaik = -1

  const batas = Math.min(aoa.length, 30)
  for (let r = 0; r < batas; r++) {
    const baris = aoa[r] || []
    let skor = 0
    for (const sel of baris) {
      const k = normKunci(sel)
      if (kataKunci.some((kw) => k === kw || (kw.length > 4 && k.includes(kw)))) {
        skor += 1
      }
    }
    if (skor > skorTerbaik) {
      skorTerbaik = skor
      terbaik = r
    }
  }
  return skorTerbaik >= 2 ? terbaik : 0
}

function bacaMetadataAtas(aoa: unknown[][], barisHeader: number, jenis: Jenis): { header: HeaderSheet[]; cek: CekHeader[] } {
  const peta = new Map<string, string>()
  for (let r = 0; r < barisHeader; r++) {
    const baris = aoa[r] || []
    for (let c = 0; c < baris.length - 1; c++) {
      const k = norm(baris[c]).replace(/:$/, '').trim()
      const v = norm(baris[c + 1])
      if (k && v && k.length < 40) {
        peta.set(normKunci(k), v)
      }
    }
  }

  const daftarLabel = jenis === 'software' ? LABEL_HEADER_SW : LABEL_HEADER_HW
  const header: HeaderSheet[] = []
  const cek: CekHeader[] = []

  for (const label of daftarLabel) {
    const kata = label.split('/')[0].trim()
    const kunci = normKunci(kata)
    let nilai = ''
    for (const [k, v] of peta.entries()) {
      if (k.includes(kunci) || kunci.includes(k)) {
        nilai = v
        break
      }
    }
    cek.push({ label, terisi: nilai !== '' && !nilai.startsWith('[') })
    if (nilai) {
      header.push({ label: kata, nilai })
    }
  }

  return { header, cek }
}

interface PetaKolom {
  id: number
  modul: number
  fitur: number
  ref: number
  scenario: number
  tipe: number
  prioritas: number
  precondition: number
  testData: number
  steps: number
  expected: number
  parameter: number
  satuan: number
  batas: number
  sumber: number
}

function petakanKolom(barisHeader: unknown[]): PetaKolom {
  const idx = (predikat: (k: string) => boolean): number => {
    for (let i = 0; i < barisHeader.length; i++) {
      const k = normKunci(barisHeader[i])
      if (k && predikat(k)) return i
    }
    return -1
  }

  return {
    id: idx((k) => k === 'tcid' || k === 'id' || k === 'testcaseid' || k === 'kode'),
    modul: idx((k) => k.includes('modul') || k.includes('menu') || k.includes('komponen') || k.includes('subsistem')),
    fitur: idx((k) => k === 'fitur' || k === 'feature' || k.includes('subfitur')),
    ref: idx((k) => k.includes('ref') || k.includes('requirement') || k.includes('prd')),
    scenario: idx((k) => k.includes('scenario') || k.includes('skenario') || k.includes('judul')),
    tipe: idx((k) => k === 'tipe' || k === 'type' || k === 'tctype' || k.includes('jenistest')),
    prioritas: idx((k) => k.includes('priority') || k.includes('prioritas') || k.includes('criticality')),
    precondition: idx((k) => k.includes('precondition') || k.includes('prasyarat') || k.includes('kondisi')),
    testData: idx((k) => k.includes('testdata') || k.includes('datauji')),
    steps: idx((k) => k.includes('step') || k.includes('langkah')),
    expected: idx((k) => k.includes('expected') || k.includes('ekspektasi') || k.includes('harapan')),
    parameter: idx((k) => k.includes('parameter')),
    satuan: idx((k) => k === 'satuan' || k === 'unit'),
    batas: idx((k) => k.includes('batas') || k.includes('passlimit') || k === 'spec'),
    sumber: idx((k) => k.includes('sumber') || k.includes('specsource')),
  }
}

interface BarisMentah {
  barisExcel: number
  id: string
  modul: string
  fitur: string
  refRequirement: string
  scenario: string
  tipeRaw: string
  prioritasRaw: string
  precondition: string
  testData: string
  steps: string[]
  expected: string
  parameterDiukur: string
  satuan: string
  batasLulus: string
  sumberSpec: string
}

export function parseExcelBufferLengkap(
  buffer: ArrayBuffer | Uint8Array,
  jenis: Jenis,
  sheetHint?: string,
): HasilBacaExcel {
  const wb = XLSX.read(buffer, { type: 'array' })
  const targetSheet =
    (sheetHint && wb.SheetNames.includes(sheetHint) ? sheetHint : undefined) ??
    wb.SheetNames.find((n) => n.toLowerCase().includes(jenis)) ??
    wb.SheetNames.find((n) => n.toLowerCase().includes('tc')) ??
    wb.SheetNames[0] ??
    (jenis === 'software' ? 'TC_Software' : 'TC_Hardware')

  const ws = wb.Sheets[targetSheet]
  const aoa: unknown[][] = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : []

  const idxHeader = cariBarisHeader(aoa)
  const kolom = petakanKolom(aoa[idxHeader] || [])
  const { header, cek: cekHeader } = bacaMetadataAtas(aoa, idxHeader, jenis)

  const ambil = (baris: unknown[], c: number): string => (c >= 0 && c < baris.length ? norm(baris[c]) : '')

  const daftarMentah: BarisMentah[] = []
  let terakhir: BarisMentah | null = null

  for (let r = idxHeader + 1; r < aoa.length; r++) {
    const baris = aoa[r] || []
    const id = ambil(baris, kolom.id)
    const modul = ambil(baris, kolom.modul)
    const fitur = ambil(baris, kolom.fitur)
    const ref = ambil(baris, kolom.ref)
    const scenario = ambil(baris, kolom.scenario)
    const tipeRaw = ambil(baris, kolom.tipe)
    const prioritasRaw = ambil(baris, kolom.prioritas)
    const precondition = ambil(baris, kolom.precondition)
    const testData = ambil(baris, kolom.testData)
    const stepsTeks = ambil(baris, kolom.steps)
    const expected = ambil(baris, kolom.expected)
    const parameterDiukur = ambil(baris, kolom.parameter)
    const satuan = ambil(baris, kolom.satuan)
    const batasLulus = ambil(baris, kolom.batas)
    const sumberSpec = ambil(baris, kolom.sumber)

    const semuaKosong =
      !id && !modul && !fitur && !ref && !scenario && !stepsTeks && !expected && !precondition && !testData
    if (semuaKosong) continue

    // Cek apakah baris ini adalah kelanjutan langkah dari test case di atasnya:
    // 1) Merged cell vertikal: TC ID & Scenario kosong, tetapi ada Test Steps / Expected Result
    // 2) TC ID diulang sama persis dengan baris sebelumnya dan Scenario kosong atau sama persis
    const lanjutanMerged = !id && !scenario && terakhir !== null && Boolean(stepsTeks || expected)
    const lanjutanIdSama =
      Boolean(id) &&
      terakhir !== null &&
      id === terakhir.id &&
      (!scenario || scenario === terakhir.scenario) &&
      Boolean(stepsTeks || expected)

    if ((lanjutanMerged || lanjutanIdSama) && terakhir) {
      if (stepsTeks) {
        terakhir.steps.push(...pecahLangkah(stepsTeks))
      }
      if (expected && !terakhir.expected) {
        terakhir.expected = expected
      }
      if (precondition && !terakhir.precondition) {
        terakhir.precondition = precondition
      }
      if (testData && !terakhir.testData) {
        terakhir.testData = testData
      }
      continue
    }

    const item: BarisMentah = {
      barisExcel: r + 1,
      id,
      modul,
      fitur,
      refRequirement: ref,
      scenario,
      tipeRaw,
      prioritasRaw,
      precondition,
      testData,
      steps: pecahLangkah(stepsTeks),
      expected,
      parameterDiukur,
      satuan,
      batasLulus,
      sumberSpec,
    }
    daftarMentah.push(item)
    terakhir = item
  }

  const temuan: Temuan[] = []
  const cases: TestCase[] = []
  const barisIdPertama = new Map<string, number>()

  for (const m of daftarMentah) {
    const idTampil = m.id || '(kosong)'
    let adaError = false

    if (!m.id) {
      temuan.push({ baris: m.barisExcel, id: idTampil, field: 'TC ID', pesan: 'Wajib diisi.', tingkat: 'error' })
      adaError = true
    } else if (barisIdPertama.has(m.id)) {
      temuan.push({
        baris: m.barisExcel,
        id: m.id,
        field: 'TC ID',
        pesan: `Duplikat dengan baris ${barisIdPertama.get(m.id)}.`,
        tingkat: 'error',
      })
      adaError = true
    } else {
      barisIdPertama.set(m.id, m.barisExcel)
    }

    if (!m.scenario) {
      temuan.push({ baris: m.barisExcel, id: idTampil, field: 'Scenario', pesan: 'Wajib diisi.', tingkat: 'error' })
      adaError = true
    }

    const tipeCocok = TIPE_VALID.find((x) => x.toLowerCase() === (m.tipeRaw || 'Positive').toLowerCase())
    if (m.tipeRaw && !tipeCocok) {
      temuan.push({
        baris: m.barisExcel,
        id: idTampil,
        field: 'Tipe',
        pesan: `"${m.tipeRaw}" tidak ada di daftar. Pilih: Positive, Negative, Edge.`,
        tingkat: 'error',
      })
      adaError = true
    }

    let prioritasFinal: Prioritas | Criticality = 'Medium'
    if (jenis === 'software') {
      const pCocok = PRIORITAS_VALID.find((x) => x.toLowerCase() === (m.prioritasRaw || 'Medium').toLowerCase())
      if (m.prioritasRaw && !pCocok) {
        temuan.push({
          baris: m.barisExcel,
          id: idTampil,
          field: 'Priority',
          pesan: `"${m.prioritasRaw}" tidak ada di daftar. Pilih: High, Medium, Low.`,
          tingkat: 'error',
        })
        adaError = true
      } else if (pCocok) {
        prioritasFinal = pCocok
      }
    } else {
      const cCocok = CRITICALITY_VALID.find((x) => x.toLowerCase() === (m.prioritasRaw || 'Medium').toLowerCase())
      if (m.prioritasRaw && !cCocok) {
        temuan.push({
          baris: m.barisExcel,
          id: idTampil,
          field: 'Criticality',
          pesan: `"${m.prioritasRaw}" tidak ada di daftar. Pilih: Safety-Critical, High, Medium, Low.`,
          tingkat: 'error',
        })
        adaError = true
      } else if (cCocok) {
        prioritasFinal = cCocok
      }
    }

    if (!m.expected) {
      temuan.push({
        baris: m.barisExcel,
        id: idTampil,
        field: 'Expected Result',
        pesan: 'Wajib diisi.',
        tingkat: 'error',
      })
      adaError = true
    }

    // Peringatan placeholder
    if (m.refRequirement.includes('[') && m.refRequirement.includes(']')) {
      temuan.push({
        baris: m.barisExcel,
        id: idTampil,
        field: 'Ref Requirement',
        pesan: `Masih placeholder "${m.refRequirement}".`,
        tingkat: 'peringatan',
      })
    }
    if (m.testData.includes('[') && m.testData.includes(']')) {
      temuan.push({
        baris: m.barisExcel,
        id: idTampil,
        field: 'Test Data',
        pesan: `Masih placeholder "${m.testData}".`,
        tingkat: 'peringatan',
      })
    }
    if (jenis === 'hardware' && m.batasLulus.toUpperCase() === 'TBD') {
      temuan.push({
        baris: m.barisExcel,
        id: idTampil,
        field: 'Batas Lulus (Spec)',
        pesan: 'Masih TBD. Test case ini tidak bisa berstatus Pass sampai batas lulus diisi.',
        tingkat: 'peringatan',
      })
    }

    if (!adaError) {
      cases.push({
        id: m.id,
        jenis,
        modul: m.modul,
        fitur: jenis === 'software' ? m.fitur : '',
        refRequirement: m.refRequirement || '[isi ref]',
        scenario: m.scenario,
        tipe: tipeCocok ?? 'Positive',
        prioritas: prioritasFinal,
        precondition: m.precondition,
        testData: jenis === 'software' ? m.testData : '',
        steps: m.steps.length > 0 ? m.steps : ['-'],
        expected: m.expected,
        ...(jenis === 'hardware'
          ? {
              parameterDiukur: m.parameterDiukur,
              satuan: m.satuan,
              batasLulus: m.batasLulus,
              sumberSpec: m.sumberSpec,
            }
          : {}),
      })
    }
  }

  const barisPratinjau: BarisPratinjau[] = cases.slice(0, 5).map((c) => ({
    id: c.id,
    area: c.modul || '-',
    scenario: c.scenario,
    tipe: c.tipe,
    levelKey: jenis === 'software' ? 'Priority' : 'Criticality',
    level: c.prioritas,
    ...(jenis === 'hardware'
      ? { parameter: c.parameterDiukur, batasLulus: [c.batasLulus, c.satuan].filter(Boolean).join(' ') }
      : {}),
  }))

  const pratinjau: PratinjauImport = {
    sheet: targetSheet,
    jumlah: daftarMentah.length,
    header,
    baris: barisPratinjau,
  }

  const laporan: LaporanValidasi = {
    jenis,
    sheet: targetSheet,
    fields: jenis === 'software' ? FIELD_SOFTWARE : FIELD_HARDWARE,
    header: cekHeader,
    catatanDiabaikan:
      jenis === 'software'
        ? 'Actual Result, Status, Evidence, Bug ID, Tester, Tanggal Test dan Notes diabaikan saat import. Kolom hasil ini diisi di Test Execution.'
        : 'Nilai Terukur, Actual Result, Status, Evidence, Bug ID, Tester, Tanggal Test, Notes dan kolom [Opsional] diabaikan saat import. Kolom hasil ini diisi di Test Execution.',
    temuan,
    jumlahBaris: daftarMentah.length,
    jumlahValid: cases.length,
  }

  return {
    sheet: targetSheet,
    header,
    cases,
    pratinjau,
    laporan,
    temuan,
  }
}

export async function parseExcelFile(file: File, jenis: Jenis): Promise<HasilBacaExcel> {
  const buffer = await file.arrayBuffer()
  return parseExcelBufferLengkap(buffer, jenis)
}

