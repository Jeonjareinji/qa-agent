import { useRef, useState } from 'react'
import type { Jenis } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Banner } from '../components/Banner.tsx'
import { Icon } from '../components/Icon.tsx'
import { TextField } from '../components/Fields.tsx'
import { Opsi } from '../components/Pilih.tsx'
import { Tag } from '../components/Badge.tsx'
import { getPratinjauImport, unduhTemplate } from '../lib/api.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

function judulDariNama(nama: string): string {
  return nama.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function Pratinjau({ jenis, namaFile }: { jenis: Jenis; namaFile: string }) {
  const { data } = useLoad('pratinjau:' + jenis + namaFile, () => getPratinjauImport(jenis, namaFile))
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
        Contoh isi (data fiktif) — {data.baris.length} baris pertama
      </div>
      <div className="col" style={{ padding: 16, gap: 10 }}>
        {data.baris.map((b) => (
          <div key={b.id} className="col col-4">
            <div className="row gap-8 wrap">
              <span className="mono t-sm w6">{b.id}</span>
              <Tag>{b.tipe}</Tag>
              <Tag>{b.level}</Tag>
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
  const [namaFile, setNamaFile] = useState('')
  const [judul, setJudul] = useState('')
  const [coba, setCoba] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const judulKosong = judul.trim() === ''
  const siap = namaFile !== '' && !judulKosong

  function pilihBerkas(berkas: File | undefined) {
    if (!berkas) return
    // TODO backend: unggah berkas dan baca isinya di server. Di sini hanya nama berkas yang dipakai.
    setNamaFile(berkas.name)
    if (judul.trim() === '') setJudul(judulDariNama(berkas.name))
    haptic('pilih')
  }

  function lanjut() {
    setCoba(true)
    if (!siap) {
      haptic('gagal')
      return
    }
    nav.buka({ nama: 'validasi', draft: { jenis, namaFile, judul: judul.trim() } })
  }

  async function ambilTemplate() {
    await unduhTemplate(jenis)
    await showAlert('Template contoh diunduh (simulasi).')
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
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            <span className="t-cap">Format .xlsx, sheet pertama dibaca</span>
          </button>
          {coba && namaFile === '' && <span className="help c-fail">Pilih file Excel terlebih dahulu.</span>}
          <button type="button" className="tautan" onClick={() => void ambilTemplate()}>
            Unduh template {jenis === 'software' ? 'software' : 'hardware'}
          </button>
        </div>

        {namaFile && <Pratinjau jenis={jenis} namaFile={namaFile} />}

        <TextField
          label="Judul kumpulan test case"
          nilai={judul}
          onUbah={setJudul}
          placeholder="Contoh: Modul Masuk Akun — Regression"
          bantuan="Judul ini dipakai saat memilih test case di Test Execution."
          galat={coba && judulKosong}
        />
        {coba && judulKosong && <span className="help c-fail">Judul wajib diisi.</span>}

        <Banner jenis="info">
          <span className="t-sm">
            Berkas tidak diproses sungguhan: pratinjau dan validasi memakai data contoh sampai backend tersedia.
          </span>
        </Banner>
      </div>
      <BottomBar>
        <Button blok onKlik={lanjut}>
          Validasi field
        </Button>
      </BottomBar>
    </>
  )
}
