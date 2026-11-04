import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useGesek } from '../lib/useGesek.ts'
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
  const scrim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tangani = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Saat beberapa sheet bertumpuk, Esc hanya menutup yang paling atas (yang terakhir di dokumen).
      const semua = document.querySelectorAll('.scrim')
      if (semua[semua.length - 1] !== scrim.current) return
      onTutup()
    }
    window.addEventListener('keydown', tangani)
    return () => window.removeEventListener('keydown', tangani)
  }, [onTutup])

  // Gesek ke bawah di gagang atau judul menutup sheet. Isi sengaja tidak ikut, agar isian tidak hilang tak sengaja.
  const refAtas = useGesek(true, (buka) => {
    if (!buka) onTutup()
  })

  return (
    <div ref={scrim} className={diAtas ? 'scrim atas' : 'scrim'}>
      <section className="sheet dk" role="dialog" aria-modal="true" aria-label={judul}>
        <div ref={refAtas} className="sheet-atas">
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
        </div>
        <div className="sheet-isi">{children}</div>
        {kaki && <div className="sheet-kaki">{kaki}</div>}
      </section>
    </div>
  )
}
