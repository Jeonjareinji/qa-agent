import type { HasilImport as DataHasil } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { SuksesTanda } from '../components/SuksesTanda.tsx'
import { formatTanggal } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'

export function HasilImport({ nav, hasil }: { nav: Nav; hasil: DataHasil }) {
  return (
    <>
      <AppBar judul="Hasil import" subjudul="Langkah 3 dari 3" />
      <div className="scroll muncul">
        <div className="sukses">
          <SuksesTanda />
          <h1 className="t-title">{hasil.tersimpan} test case tersimpan</h1>
          <span className="t-body c-2">“{hasil.judul}” siap dipakai di Test Execution.</span>
        </div>

        <div className="grid3">
          <div className="stat t-pass">
            <b>{hasil.tersimpan}</b>
            <span>Tersimpan</span>
          </div>
          <div className="stat t-fail">
            <b>{hasil.dilewati}</b>
            <span>Dilewati</span>
          </div>
          <div className="stat t-warn">
            <b>{hasil.peringatan}</b>
            <span>Peringatan</span>
          </div>
        </div>

        <div className="card">
          <dl className="kv">
            <dt>Jenis</dt>
            <dd>{hasil.jenis === 'software' ? 'Software' : 'Hardware'}</dd>
            <dt>File</dt>
            <dd>{hasil.namaFile}</dd>
            <dt>Sheet</dt>
            <dd>{hasil.sheet}</dd>
            <dt>Diimpor</dt>
            <dd>
              {formatTanggal(hasil.diimporPada)} oleh {hasil.diimporOlehNama}
            </dd>
          </dl>
        </div>

        <section className="col col-8">
          <h2 className="t-h2">Contoh test case tersimpan</h2>
          <div className="card rata">
            <div className="daftar">
              {hasil.daftar.slice(0, 5).map((t) => (
                <div key={t.id} className="daftar-item">
                  <span className="mono t-sm w6">{t.id}</span>
                  <span className="t-sm grow">{t.scenario}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <BottomBar dua>
        <Button varian="secondary" onKlik={nav.beranda}>
          Beranda
        </Button>
        <Button onKlik={() => nav.mulaiDari({ nama: 'beranda' }, { nama: 'buatExecution' })}>Buat execution</Button>
      </BottomBar>
    </>
  )
}
