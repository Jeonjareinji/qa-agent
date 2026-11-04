import { useEffect, useRef, useState } from 'react'
import type { Jenis, PratinjauImport } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { TextField } from '../components/Fields.tsx'
import { Opsi } from '../components/Pilih.tsx'
import { Tag } from '../components/Badge.tsx'
import { unduhTemplate } from '../lib/api.ts'
import { parseExcelFile } from '../lib/excel.ts'
import type { HasilBacaExcel } from '../lib/excel.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'

function judulDariNama(nama: string): string {
  return nama.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function Pratinjau({ namaFile, data }: { namaFile: string; data: PratinjauImport | null }) {
  if (!data) return <div className="kilau" style={{ height: 120 }} />
  return (
    <div className="card rata">
      <div className="berkas">
        <span className="berkas-ikon ik-xls">XLS</span>
        <div className="grow col col-4">
          <span className="t-body w6 ell">{namaFile}</span>
          <span className="t-cap">
            Sheet {data.sheet} · {data.jumlah} baris
          </span>
        </div>
      </div>
      <div className="berkas-catatan">
        <Icon nama="centangBulat" ukuran={16} />
        Pratinjau isi file — {data.baris.length} baris valid pertama
      </div>
      <div className="col" style={{ padding: 16, gap: 10 }}>
        {data.baris.map((b) => (
          <div key={b.id} className="col col-4">
            <div className="row gap-8 wrap">
              <span className="mono t-sm w6">{b.id}</span>
              <Tag>{b.tipe}</Tag>
              <Tag>{b.level}</Tag>
              {b.area && b.area !== '-' && <Tag>{b.area}</Tag>}
            </div>
            <span className="t-sm">{b.scenario}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ImportTestCase({ nav }: { nav: Nav }) {
  const [jenis, setJenis] = useState<Jenis>('software')
  const [berkas, setBerkas] = useState<File | null>(null)
  const [namaFile, setNamaFile] = useState('')
  const [hasilBaca, setHasilBaca] = useState<HasilBacaExcel | null>(null)
  const [judul, setJudul] = useState('')
  const [coba, setCoba] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const judulKosong = judul.trim() === ''
  const siap = namaFile !== '' && !judulKosong && hasilBaca !== null

  useEffect(() => {
    if (!berkas) return
    let aktif = true
    parseExcelFile(berkas, jenis)
      .then((h) => {
        if (aktif) setHasilBaca(h)
      })
      .catch((err: unknown) => {
        if (aktif) void showAlert(err instanceof Error ? err.message : 'Gagal membaca file Excel.')
      })
    return () => {
      aktif = false
    }
  }, [berkas, jenis])

  function pilihBerkas(file: File | undefined) {
    if (!file) return
    setHasilBaca(null)
    setBerkas(file)
    setNamaFile(file.name)
    if (judul.trim() === '') setJudul(judulDariNama(file.name))
    haptic('pilih')
  }

  function lanjut() {
    setCoba(true)
    if (!siap || !hasilBaca) {
      haptic('gagal')
      return
    }
    nav.buka({
      nama: 'validasi',
      draft: {
        jenis,
        namaFile,
        judul: judul.trim(),
        sheet: hasilBaca.sheet,
        header: hasilBaca.header,
        cases: hasilBaca.cases,
        laporan: hasilBaca.laporan,
      },
    })
  }

  async function ambilTemplate() {
    try {
      await unduhTemplate(jenis)
      await showAlert(`Template ${jenis === 'software' ? 'Software' : 'Hardware'} berhasil diunduh.`)
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : 'Gagal mengunduh template.')
    }
  }

  return (
    <>
      <AppBar judul="Import Test Case" subjudul="Langkah 1 dari 3" onKembali={nav.kembali} />
      <div className="scroll">
        <div className="col col-8">
          <h2 className="t-h2">Jenis test case</h2>
          <div className="grid2">
            <Opsi terpilih={jenis === 'software'} onKlik={() => setJenis('software')}>
              <span className="t-body w7">Software</span>
              <span className="t-cap">11 kolom</span>
            </Opsi>
            <Opsi terpilih={jenis === 'hardware'} onKlik={() => setJenis('hardware')}>
              <span className="t-body w7">Hardware</span>
              <span className="t-cap">12 kolom</span>
            </Opsi>
          </div>
        </div>

        <div className="col col-8">
          <h2 className="t-h2">File Excel</h2>
          <input
            ref={input}
            type="file"
            hidden
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              pilihBerkas(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className="drop" onClick={() => input.current?.click()}>
            <span className="ico">
              <Icon nama="unggah" ukuran={26} />
            </span>
            <span className="t-body w7">{namaFile ? 'Ganti file' : 'Pilih file Excel'}</span>
            <span className="t-cap">Format .xlsx, sheet sesuai jenis test case</span>
          </button>
          {coba && namaFile === '' && <span className="help c-fail">Pilih file Excel terlebih dahulu.</span>}
          <button type="button" className="tautan" onClick={() => void ambilTemplate()}>
            Unduh template {jenis === 'software' ? 'software' : 'hardware'}
          </button>
        </div>

        {namaFile && <Pratinjau namaFile={namaFile} data={hasilBaca?.pratinjau ?? null} />}

        <TextField
          label="Judul kumpulan test case"
          nilai={judul}
          onUbah={setJudul}
          placeholder="Contoh: Modul Masuk Akun — Regression"
          bantuan="Judul ini dipakai saat memilih test case di Test Execution."
          galat={coba && judulKosong}
        />
        {coba && judulKosong && <span className="help c-fail">Judul wajib diisi.</span>}
      </div>
      <BottomBar>
        <Button blok onKlik={lanjut}>
          Validasi field
        </Button>
      </BottomBar>
    </>
  )
}
