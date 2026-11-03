import type { ReactNode } from 'react'
import './SheetDaftar.css'

interface Props {
  judul: string
  terbuka: boolean
  onUbah: (terbuka: boolean) => void
  posisiTutup: number // jarak tepi atas sheet dari atas layar saat diciutkan (px)
  kepala?: ReactNode // pencarian dan chip
  children: ReactNode
}

const POSISI_TERBUKA = 76

export function SheetDaftar({ judul, terbuka, onUbah, posisiTutup, kepala, children }: Props) {
  return (
    <section className="asheet dk" style={{ top: terbuka ? POSISI_TERBUKA : posisiTutup }} aria-label={judul}>
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
      <div className="asheet-isi muncul">{children}</div>
    </section>
  )
}
