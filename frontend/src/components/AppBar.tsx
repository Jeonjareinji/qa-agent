import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

interface Props {
  judul: string
  subjudul?: string
  onKembali?: () => void
  kanan?: ReactNode
}

export function AppBar({ judul, subjudul, onKembali, kanan }: Props) {
  return (
    <header className="appbar">
      {onKembali ? (
        <button type="button" className="icon-btn" aria-label="Kembali" onClick={onKembali}>
          <Icon nama="kembali" />
        </button>
      ) : (
        <span style={{ width: 12 }} />
      )}
      <div className="appbar-judul">
        <b>{judul}</b>
        {subjudul && <span>{subjudul}</span>}
      </div>
      {kanan}
    </header>
  )
}
