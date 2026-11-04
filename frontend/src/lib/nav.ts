// Navigasi sederhana tanpa router: App menyimpan tumpukan layar dan membagikan objek Nav ke tiap layar.
import type { HasilImport, ImportDraft } from '../data/dummy.ts'

export type Rute =
  | { nama: 'beranda' }
  | { nama: 'import' }
  | { nama: 'validasi'; draft: ImportDraft }
  | { nama: 'hasilImport'; hasil: HasilImport }
  | { nama: 'buatExecution' }
  | { nama: 'hasilExecution'; executionId: string }
  | { nama: 'daftarExecution' }
  | { nama: 'jalankan'; executionId: string }
  | { nama: 'export'; executionId: string }
  | { nama: 'daftarTestCase' }
  | { nama: 'detailTestCase'; kumpulanId: string }
  | { nama: 'editTestCase'; kumpulanId: string; tcId: string }
  | { nama: 'daftarBug' }

export interface Nav {
  buka(rute: Rute): void // tambah layar di atas tumpukan
  ganti(rute: Rute): void // ganti layar teratas
  kembali(): void // buang layar teratas
  mulaiDari(...rute: Rute[]): void // ganti seluruh tumpukan
  beranda(): void
}

// Tautan dari bot: ?layar=import, ?layar=buat, ?layar=execution, ?layar=testcase, ?layar=bug
export function ruteAwal(pencarian: string): Rute[] {
  const layar = new URLSearchParams(pencarian).get('layar')
  switch (layar) {
    case 'import':
      return [{ nama: 'beranda' }, { nama: 'import' }]
    case 'buat':
      return [{ nama: 'beranda' }, { nama: 'buatExecution' }]
    case 'execution':
      return [{ nama: 'beranda' }, { nama: 'daftarExecution' }]
    case 'testcase':
      return [{ nama: 'beranda' }, { nama: 'daftarTestCase' }]
    case 'bug':
      return [{ nama: 'beranda' }, { nama: 'daftarBug' }]
    default:
      return [{ nama: 'beranda' }]
  }
}
