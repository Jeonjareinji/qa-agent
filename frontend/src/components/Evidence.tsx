import { useEffect, useRef, useState } from 'react'
import type { InputEvidence } from '../data/dummy.ts'
import { unggahEvidenceFile } from '../lib/api.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import { Sheet } from './Sheet.tsx'
import type { ItemThumb } from './evidenceItem.ts'

// Batas ukuran video di sisi klien.
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

// Tombol kamera, galeri, video, dan tautan. Mendukung akses langsung kamera HP (getUserMedia) + upload ke backend.
export function PemilihEvidence({ mode, onTambah }: PemilihProps) {
  const kamera = useRef<HTMLInputElement>(null)
  const galeri = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLInputElement>(null)
  const videoKameraRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [tampilLink, setTampilLink] = useState(false)
  const [tautan, setTautan] = useState('')
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [arahKamera, setArahKamera] = useState<'environment' | 'user'>('environment')
  const [memuatKamera, setMemuatKamera] = useState(false)

  function hentikanStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    return () => hentikanStream()
  }, [])

  async function nyalakanStream(arah: 'environment' | 'user') {
    hentikanStream()
    if (!navigator.mediaDevices?.getUserMedia) {
      setKameraTerbuka(false)
      kamera.current?.click()
      return
    }
    setMemuatKamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: arah },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoKameraRef.current) {
        videoKameraRef.current.srcObject = stream
        await videoKameraRef.current.play().catch(() => {})
      }
      setMemuatKamera(false)
    } catch {
      setMemuatKamera(false)
      setKameraTerbuka(false)
      // Fallback ke input file native kamera HP bila izin WebRTC ditolak / tidak didukung WebView
      kamera.current?.click()
    }
  }

  function bukaKamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      kamera.current?.click()
      return
    }
    setKameraTerbuka(true)
    void nyalakanStream(arahKamera)
  }

  function tutupKamera() {
    hentikanStream()
    setKameraTerbuka(false)
  }

  function gantiArahKamera() {
    const baru = arahKamera === 'environment' ? 'user' : 'environment'
    setArahKamera(baru)
    haptic('ringan')
    void nyalakanStream(baru)
  }

  function jepretFoto() {
    const vid = videoKameraRef.current
    if (!vid || vid.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = vid.videoWidth
    canvas.height = vid.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (arahKamera === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const namaFile = `kamera-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jpg`
        const berkas = new File([blob], namaFile, { type: 'image/jpeg' })
        tutupKamera()
        void dariBerkas('foto', [berkas])
      },
      'image/jpeg',
      0.9,
    )
  }

  async function dariBerkas(jenis: 'foto' | 'galeri' | 'video', daftar: FileList | File[] | null) {
    if (!daftar) return
    let ditambah = false
    for (const berkas of Array.from(daftar)) {
      if (jenis === 'video' && berkas.size > MAKS_VIDEO_MB * 1024 * 1024) {
        haptic('gagal')
        void showAlert(`Video "${berkas.name}" terlalu besar. Maksimal ${MAKS_VIDEO_MB} MB.`)
        continue
      }
      const url = await unggahEvidenceFile(berkas)
      onTambah({ jenis, nama: berkas.name, url })
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
          void dariBerkas('foto', e.target.files)
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
          void dariBerkas('galeri', e.target.files)
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
          void dariBerkas('video', e.target.files)
          e.target.value = ''
        }}
      />
      {mode === 'tiga' ? (
        <div className="grid2 grid-8">
          <Button varian="secondary" kecil ikon="kamera" onKlik={bukaKamera}>
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
          <Button varian="secondary" kecil ikon="kamera" onKlik={bukaKamera}>
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

      {kameraTerbuka && (
        <Sheet
          diAtas
          judul="Ambil Foto Evidence"
          subjudul={
            <span className="t-sm c-2">
              {arahKamera === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
            </span>
          }
          onTutup={tutupKamera}
          kaki={
            <>
              <Button varian="secondary" blok onKlik={gantiArahKamera} nonaktif={memuatKamera}>
                Putar Kamera
              </Button>
              <Button blok ikon="kamera" onKlik={jepretFoto} nonaktif={memuatKamera}>
                Jepret Foto
              </Button>
            </>
          }
        >
          <div className="col col-12">
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', minHeight: 260 }}>
              <video
                ref={videoKameraRef}
                className="evidence-media"
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxHeight: '55dvh',
                  objectFit: 'cover',
                  transform: arahKamera === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
              {memuatKamera && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                  }}
                >
                  Membuka kamera…
                </div>
              )}
            </div>
            <Button
              varian="ghost"
              kecil
              blok
              onKlik={() => {
                tutupKamera()
                kamera.current?.click()
              }}
            >
              Gunakan aplikasi kamera bawaan HP
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
