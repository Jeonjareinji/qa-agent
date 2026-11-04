import { useRef, useState } from 'react'
import type { InputEvidence } from '../data/dummy.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import { Sheet } from './Sheet.tsx'
import type { ItemThumb } from './evidenceItem.ts'

// Batas ukuran video di sisi klien. TODO backend: samakan dengan batas unggah server.
const MAKS_VIDEO_MB = 50

function IsiThumb({ t }: { t: ItemThumb }) {
  if (t.pratinjau && t.jenis === 'video') {
    return (
      <>
        <video src={t.pratinjau + '#t=0.1'} muted playsInline preload="metadata" />
        <span className="thumb-main" aria-hidden="true">
          <Icon nama="main" ukuran={14} />
        </span>
      </>
    )
  }
  if (t.pratinjau) return <img src={t.pratinjau} alt="" />
  const ikon = t.jenis === 'link' ? 'tautan' : t.jenis === 'video' ? 'main' : 'gambar'
  return <Icon nama={ikon} ukuran={24} />
}

export function Thumbs({ item }: { item: ItemThumb[] }) {
  const [dibuka, setDibuka] = useState<ItemThumb | null>(null)
  if (item.length === 0) return null

  function ketuk(t: ItemThumb) {
    if (t.tautan) window.open(t.tautan, '_blank', 'noopener,noreferrer')
    else setDibuka(t)
  }

  return (
    <>
      <div className="thumbs">
        {item.map((t) => (
          <button key={t.id} type="button" className="thumb" aria-label={t.label} onClick={() => ketuk(t)}>
            <IsiThumb t={t} />
            {t.tag && <span className={t.tag === 'Baru' ? 'thumb-tag baru' : 'thumb-tag'}>{t.tag}</span>}
          </button>
        ))}
      </div>
      {dibuka && (
        <Sheet diAtas judul={dibuka.jenis === 'video' ? 'Video' : 'Evidence'} subjudul={<span className="t-sm c-2 ell">{dibuka.nama}</span>} onTutup={() => setDibuka(null)}>
          {dibuka.pratinjau ? (
            dibuka.jenis === 'video' ? (
              <video className="evidence-media" src={dibuka.pratinjau} controls playsInline autoPlay />
            ) : (
              <img className="evidence-media" src={dibuka.pratinjau} alt={dibuka.nama} />
            )
          ) : (
            <span className="t-body c-2">Pratinjau tidak tersedia. Ini data contoh, berkas aslinya belum diunggah.</span>
          )}
        </Sheet>
      )}
    </>
  )
}

interface PemilihProps {
  mode: 'tiga' | 'dua'
  onTambah: (evidence: InputEvidence) => void
}

// Tombol kamera, galeri, video, dan tautan. Berkas hanya dipakai untuk pratinjau di browser (tidak diunggah).
export function PemilihEvidence({ mode, onTambah }: PemilihProps) {
  const kamera = useRef<HTMLInputElement>(null)
  const galeri = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLInputElement>(null)
  const [tampilLink, setTampilLink] = useState(false)
  const [tautan, setTautan] = useState('')

  function dariBerkas(jenis: 'foto' | 'galeri' | 'video', daftar: FileList | null) {
    if (!daftar) return
    let ditambah = false
    for (const berkas of Array.from(daftar)) {
      if (jenis === 'video' && berkas.size > MAKS_VIDEO_MB * 1024 * 1024) {
        haptic('gagal')
        void showAlert(`Video "${berkas.name}" terlalu besar. Maksimal ${MAKS_VIDEO_MB} MB.`)
        continue
      }
      // TODO backend: unggah berkas ke penyimpanan. Sekarang hanya pratinjau lokal.
      const bisaDilihat = berkas.type.startsWith('image/') || berkas.type.startsWith('video/')
      onTambah({ jenis, nama: berkas.name, url: bisaDilihat ? URL.createObjectURL(berkas) : null })
      ditambah = true
    }
    if (ditambah) haptic('pilih')
  }

  function tambahTautan() {
    const bersih = tautan.trim()
    if (!/^https?:\/\/\S+$/i.test(bersih)) {
      haptic('gagal')
      void showAlert('Masukkan tautan yang diawali http:// atau https://')
      return
    }
    onTambah({ jenis: 'link', nama: bersih, url: bersih })
    setTautan('')
    setTampilLink(false)
    haptic('pilih')
  }

  return (
    <div className="col col-8">
      <input
        ref={kamera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          dariBerkas('foto', e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galeri}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          dariBerkas('galeri', e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={video}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(e) => {
          dariBerkas('video', e.target.files)
          e.target.value = ''
        }}
      />
      {mode === 'tiga' ? (
        <div className="grid2 grid-8">
          <Button varian="secondary" kecil ikon="kamera" onKlik={() => kamera.current?.click()}>
            Kamera
          </Button>
          <Button varian="secondary" kecil ikon="gambar" onKlik={() => galeri.current?.click()}>
            Galeri
          </Button>
          <Button varian="secondary" kecil ikon="main" onKlik={() => video.current?.click()}>
            Video
          </Button>
          <Button varian="secondary" kecil ikon="tautan" onKlik={() => setTampilLink((v) => !v)}>
            Link
          </Button>
        </div>
      ) : (
        <div className="grid2 grid-8">
          <Button varian="secondary" kecil ikon="kamera" onKlik={() => kamera.current?.click()}>
            Ambil foto
          </Button>
          <Button varian="secondary" kecil ikon="unggah" onKlik={() => galeri.current?.click()}>
            Upload gambar
          </Button>
          <div style={{ gridColumn: '1 / -1' }}>
            <Button varian="secondary" kecil blok ikon="main" onKlik={() => video.current?.click()}>
              Upload video
            </Button>
          </div>
        </div>
      )}
      <span className="help">Video: rekam langsung atau pilih dari galeri, maksimal {MAKS_VIDEO_MB} MB.</span>
      {mode === 'tiga' && tampilLink && (
        <div className="row gap-8">
          <div className="grow">
            <label className="sr" htmlFor="evidence-tautan">
              Tautan evidence
            </label>
            <input
              id="evidence-tautan"
              className="input"
              type="url"
              placeholder="https://contoh.example/bukti"
              value={tautan}
              onChange={(e) => setTautan(e.target.value)}
            />
          </div>
          <Button varian="soft" kecil onKlik={tambahTautan}>
            Tambah
          </Button>
        </div>
      )}
    </div>
  )
}
