import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { NamaIkon } from './iconPaths.ts'

interface Props {
  varian?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'dashed'
  kecil?: boolean
  blok?: boolean
  rapat?: boolean
  nonaktif?: boolean
  ikon?: NamaIkon
  onKlik?: () => void
  children: ReactNode
}

export function Button({ varian = 'primary', kecil, blok, rapat, nonaktif, ikon, onKlik, children }: Props) {
  const kelas = ['btn', 'btn-' + varian, kecil && 'btn-sm', blok && 'btn-block', rapat && 'btn-rapat']
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={kelas} disabled={nonaktif} onClick={onKlik}>
      {ikon && <Icon nama={ikon} ukuran={kecil ? 16 : 20} />}
      {children}
    </button>
  )
}
