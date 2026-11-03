import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import './Sheet.css'

interface Props {
  judul: string
  subjudul?: ReactNode
  onTutup: () => void
  kaki?: ReactNode
  diAtas?: boolean // sheet kedua yang muncul di atas sheet lain
  children: ReactNode
}

export function Sheet({ judul, subjudul, onTutup, kaki, diAtas, children }: Props) {
  useEffect(() => {
    const tangani = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', tangani)
    return () => window.removeEventListener('keydown', tangani)
  }, [onTutup])

  return (
    <div className={diAtas ? 'scrim atas' : 'scrim'}>
      <section className="sheet dk" role="dialog" aria-modal="true" aria-label={judul}>
        <div className="sheet-gagang" />
        <div className="sheet-kepala">
          <div className="grow col col-4" style={{ paddingTop: 8 }}>
            <h2 className="t-title">{judul}</h2>
            {subjudul}
          </div>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onTutup}>
            <Icon nama="tutup" />
          </button>
        </div>
        <div className="sheet-isi">{children}</div>
        {kaki && <div className="sheet-kaki">{kaki}</div>}
      </section>
    </div>
  )
}
