import { useState } from 'react'
import { DAFTAR_STATUS } from '../data/dummy.ts'
import type { FormatLaporan, HasilExport } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { Banner } from '../components/Banner.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Galat, Memuat } from '../components/Kosong.tsx'
import { CentangBaris, Opsi } from '../components/Pilih.tsx'
import { SuksesTanda } from '../components/SuksesTanda.tsx'
import { KUNCI_STATUS } from '../components/statusInfo.ts'
import { getExecution, getLaporan, kirimLaporanKeBot, selesaikanExecution, unduhLaporan } from '../lib/api.ts'
import { formatTanggal, hitungStatus, jumlahDieksekusi, persen } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

function KartuBerkas({ hasil, executionId, nav }: { hasil: HasilExport; executionId: string; nav: Nav }) {
  const [sibuk, setSibuk] = useState<'unduh' | 'kirim' | null>(null)

  async function unduh() {
    setSibuk('unduh')
    try {
      await unduhLaporan(executionId, hasil.format)
      haptic('sukses')
      await showAlert(`File ${hasil.namaFile} berhasil diunduh.`)
    } catch (e) {
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal mengunduh file laporan.')
    } finally {
      setSibuk(null)
    }
  }

  async function kirim() {
    setSibuk('kirim')
    try {
      const res = await kirimLaporanKeBot(executionId, hasil.format)
      if (res.ok) {
        haptic('sukses')
        await showAlert('Laporan berhasil dikirim ke chat bot Telegram.')
      } else {
        await showAlert(res.message || 'Bot belum terhubung, silakan unduh langsung filenya.')
      }
    } catch (e) {
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal mengirim laporan ke bot.')
    } finally {
      setSibuk(null)
    }
  }

  return (
    <>
      <AppBar judul="Report" onKembali={nav.kembali} />
      <div className="scroll muncul">
        <div className="sukses">
          <SuksesTanda />
          <h1 className="t-title">Execution selesai</h1>
          <span className="t-body c-2">Laporan {hasil.format === 'pdf' ? 'PDF' : 'Excel'} sudah siap.</span>
        </div>
        <div className="card rata">
          <div className="berkas">
            <span className={'berkas-ikon ' + (hasil.format === 'pdf' ? 'ik-pdf' : 'ik-xls')}>
              {hasil.format === 'pdf' ? 'PDF' : 'XLS'}
            </span>
            <div className="grow col col-4">
              <span className="t-body w6 ell">{hasil.namaFile}</span>
              <span className="t-cap">{formatTanggal(hasil.dibuatPada)}</span>
            </div>
          </div>
        </div>
        <Banner jenis="success">
          <span className="t-sm">
            Berkas laporan siap diunduh dalam format {hasil.format === 'pdf' ? 'PDF' : 'Excel'}.
          </span>
        </Banner>
      </div>
      <BottomBar>
        <div className="grid2">
          <Button varian="secondary" ikon="unduh" nonaktif={sibuk !== null} onKlik={() => void unduh()}>
            Unduh
          </Button>
          <Button varian="secondary" ikon="kirim" nonaktif={sibuk !== null} onKlik={() => void kirim()}>
            Kirim ke bot
          </Button>
        </div>
        <Button blok onKlik={nav.beranda}>
          Beranda
        </Button>
      </BottomBar>
    </>
  )
}

export function ExportReport({ nav, executionId }: { nav: Nav; executionId: string }) {
  const { data, galat, muatUlang } = useLoad('export:' + executionId, () => getExecution(executionId))
  const laporan = useLoad('laporan:' + executionId, () => getLaporan(executionId))
  const [format, setFormat] = useState<FormatLaporan>('pdf')
  const [actual, setActual] = useState(true)
  const [langkah, setLangkah] = useState(false)
  const [evidence, setEvidence] = useState(true)
  const [membuat, setMembuat] = useState(false)
  const [hasil, setHasil] = useState<HasilExport | null>(null)

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />
  // Execution yang sudah selesai langsung menampilkan laporannya (bukan form pembuatan).
  if (!hasil && data.selesai) {
    return laporan.data ? <KartuBerkas hasil={laporan.data} executionId={executionId} nav={nav} /> : <Memuat />
  }
  if (hasil) return <KartuBerkas hasil={hasil} executionId={executionId} nav={nav} />

  const hitung = hitungStatus(data.kasus)
  const dieksekusi = jumlahDieksekusi(data.kasus)
  const passRate = persen(hitung.Pass, dieksekusi)

  async function buat() {
    setMembuat(true)
    try {
      const h = await selesaikanExecution(executionId, {
        format,
        sertakanActual: actual,
        sertakanLangkah: langkah,
        sertakanEvidence: evidence,
      })
      haptic('sukses')
      setHasil(h)
    } catch (e) {
      setMembuat(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal membuat laporan.')
    }
  }

  return (
    <>
      <AppBar judul="Export report" subjudul={data.judul} onKembali={nav.kembali} />
      <div className="scroll">
        <section className="col col-8">
          <div className="row between">
            <h2 className="t-h2">Ringkasan hasil</h2>
            <span className="t-sm c-2">
              Pass rate <b className="mono">{passRate}%</b>
            </span>
          </div>
          <div className="grid5">
            {DAFTAR_STATUS.map((s) => (
              <div key={s} className={'stat t-' + (s === 'Blocked' ? 'warn' : KUNCI_STATUS[s])}>
                <b>{hitung[s]}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </section>

        {hitung['Not Run'] > 0 && (
          <Banner jenis="warn">
            <span className="t-sm">
              {hitung['Not Run']} test case masih Not Run dan akan ditulis apa adanya di laporan.
            </span>
          </Banner>
        )}

        <section className="col col-8">
          <h2 className="t-h2">Format laporan</h2>
          <div className="grid2">
            <Opsi terpilih={format === 'pdf'} onKlik={() => setFormat('pdf')}>
              <span className="t-body w7">PDF</span>
              <span className="t-cap">Siap dibagikan</span>
            </Opsi>
            <Opsi terpilih={format === 'xlsx'} onKlik={() => setFormat('xlsx')}>
              <span className="t-body w7">Excel</span>
              <span className="t-cap">Bisa diolah lagi</span>
            </Opsi>
          </div>
        </section>

        <section className="col col-8">
          <h2 className="t-h2">Isi laporan</h2>
          <CentangBaris label="Sertakan actual result" terpilih={actual} onKlik={() => setActual((v) => !v)} />
          <CentangBaris label="Sertakan langkah test" terpilih={langkah} onKlik={() => setLangkah((v) => !v)} />
          <CentangBaris label="Sertakan evidence" terpilih={evidence} onKlik={() => setEvidence((v) => !v)} />
        </section>
      </div>
      <BottomBar>
        <Button blok onKlik={() => void buat()} nonaktif={membuat}>
          {membuat ? 'Membuat laporan…' : 'Selesai & buat laporan'}
        </Button>
      </BottomBar>
    </>
  )
}
