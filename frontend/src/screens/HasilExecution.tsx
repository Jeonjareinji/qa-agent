import { AppBar } from '../components/AppBar.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Galat, Memuat } from '../components/Kosong.tsx'
import { SuksesTanda } from '../components/SuksesTanda.tsx'
import { getExecution } from '../lib/api.ts'
import { formatTanggal } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { useLoad } from '../lib/useLoad.ts'

export function HasilExecution({ nav, executionId }: { nav: Nav; executionId: string }) {
  const { data, galat, muatUlang } = useLoad('execution:' + executionId, () => getExecution(executionId))
  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  return (
    <>
      <AppBar judul="Execution dibuat" />
      <div className="scroll muncul">
        <div className="sukses">
          <SuksesTanda />
          <h1 className="t-title">{data.judul}</h1>
          <span className="t-body c-2">{data.kasus.length} test case siap dijalankan.</span>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>ID</dt>
            <dd className="mono">{data.id}</dd>
            <dt>Test case</dt>
            <dd>{data.kasus.length}</dd>
            <dt>PIC</dt>
            <dd>{data.picNama.length > 0 ? data.picNama.join(', ') : 'Belum ditentukan'}</dd>
            <dt>Dibuat</dt>
            <dd>
              {formatTanggal(data.dibuatPada)} oleh {data.dibuatOlehNama}
            </dd>
          </dl>
        </div>
        <span className="t-sm c-2">
          Test case disalin ke execution ini. Mengubah langkah di sini tidak mengubah test case utama.
        </span>
      </div>
      <BottomBar dua>
        <Button varian="secondary" onKlik={nav.beranda}>
          Beranda
        </Button>
        <Button onKlik={() => nav.ganti({ nama: 'jalankan', executionId: data.id })}>Mulai jalankan</Button>
      </BottomBar>
    </>
  )
}
