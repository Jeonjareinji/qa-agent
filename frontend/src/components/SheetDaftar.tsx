import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useGesek } from '../lib/useGesek.ts'
import './SheetDaftar.css'

interface Props {
  judul: string
  terbuka: boolean
  onUbah: (terbuka: boolean) => void
  posisiTutup: number // jarak tepi atas sheet dari atas layar saat diciutkan (px)
  kepala?: ReactNode // pencarian dan chip
  children: ReactNode
}

// Terbuka penuh = 90% tinggi layar (tepi atas sheet di 10% dari atas).
const POSISI_TERBUKA = '10%'

// Bisa diketuk di gagang, atau digesek: ke atas memperluas, ke bawah (saat daftar di paling atas) menciutkan.
export function SheetDaftar({ judul, terbuka, onUbah, posisiTutup, kepala, children }: Props) {
  const isi = useRef<HTMLDivElement>(null)
  const refSheet = useGesek(terbuka, onUbah, { isi, roda: true })
  return (
    <section ref={refSheet} className="asheet dk" style={{ top: terbuka ? POSISI_TERBUKA : posisiTutup }} aria-label={judul}>
      <button
        type="button"
        className="asheet-gagang"
        aria-expanded={terbuka}
        aria-label={terbuka ? 'Ciutkan daftar' : 'Perluas daftar'}
        onClick={() => onUbah(!terbuka)}
      >
        <i />
      </button>
      <div className="asheet-kepala">
        <h2 className="t-title">{judul}</h2>
        {kepala}
      </div>
      <div ref={isi} className="asheet-isi muncul">
        {children}
      </div>
    </section>
  )
}
