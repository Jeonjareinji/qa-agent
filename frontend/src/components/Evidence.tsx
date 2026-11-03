import { useRef, useState } from 'react'
import type { InputEvidence } from '../data/dummy.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import type { ItemThumb } from './evidenceItem.ts'

export function Thumbs({ item }: { item: ItemThumb[] }) {
  if (item.length === 0) return null
  return (
    <div className="thumbs">
      {item.map((t) => (
        <div key={t.id} className="thumb" role="img" aria-label={t.label}>
          {t.pratinjau ? <img src={t.pratinjau} alt="" /> : <Icon nama={t.jenis === 'link' ? 'tautan' : 'gambar'} ukuran={24} />}
          {t.tag && <span className={t.tag === 'Baru' ? 'thumb-tag baru' : 'thumb-tag'}>{t.tag}</span>}
        </div>
      ))}
    </div>
  )
}

interface PemilihProps {
  mode: 'tiga' | 'dua'
  onTambah: (evidence: InputEvidence) => void
}

// Tombol kamera, galeri, dan tautan. Berkas hanya dipakai untuk pratinjau di browser (tidak diunggah).
export function PemilihEvidence({ mode, onTambah }: PemilihProps) {
  const kamera = useRef<HTMLInputElement>(null)
  const galeri = useRef<HTMLInputElement>(null)
  const [tampilLink, setTampilLink] = useState(false)
  const [tautan, setTautan] = useState('')

  function dariBerkas(jenis: 'foto' | 'galeri', daftar: FileList | null) {
    if (!daftar) return
    for (const berkas of Array.from(daftar)) {
      // TODO backend: unggah berkas ke penyimpanan. Sekarang hanya pratinjau lokal.
      onTambah({ jenis, nama: berkas.name, url: berkas.type.startsWith('image/') ? URL.createObjectURL(berkas) : null })
    }
    haptic('pilih')
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
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          dariBerkas('galeri', e.target.files)
          e.target.value = ''
        }}
      />
      {mode === 'tiga' ? (
        <div className="grid3 grid-8">
          <Button varian="secondary" kecil rapat ikon="kamera" onKlik={() => kamera.current?.click()}>
            Kamera
          </Button>
          <Button varian="secondary" kecil rapat ikon="gambar" onKlik={() => galeri.current?.click()}>
            Galeri
          </Button>
          <Button varian="secondary" kecil rapat ikon="tautan" onKlik={() => setTampilLink((v) => !v)}>
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
        </div>
      )}
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
