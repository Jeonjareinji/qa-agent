import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

function Cek() {
  return (
    <span className="cek">
      <Icon nama="centang" />
    </span>
  )
}

interface PilihProps {
  terpilih: boolean
  onKlik: () => void
  awal?: ReactNode
  cekDi?: 'kiri' | 'kanan'
  children: ReactNode
}

// Baris yang bisa dipilih (mis. kumpulan test case atau PIC).
export function PilihBaris({ terpilih, onKlik, awal, cekDi = 'kiri', children }: PilihProps) {
  return (
    <button type="button" className="pilih" aria-pressed={terpilih} onClick={onKlik}>
      {cekDi === 'kiri' && <Cek />}
      {awal}
      <span className="grow col col-4">{children}</span>
      {cekDi === 'kanan' && <Cek />}
    </button>
  )
}

// Kartu pilihan tunggal (mis. jenis Software atau Hardware, atau format laporan).
export function Opsi({ terpilih, onKlik, children }: { terpilih: boolean; onKlik: () => void; children: ReactNode }) {
  return (
    <button type="button" className="opsi" aria-pressed={terpilih} onClick={onKlik}>
      {children}
    </button>
  )
}

export function CentangBaris({ terpilih, onKlik, label }: { terpilih: boolean; onKlik: () => void; label: string }) {
  return (
    <button type="button" className="cb-baris" aria-pressed={terpilih} onClick={onKlik}>
      <Cek />
      <span className="t-body">{label}</span>
    </button>
  )
}
