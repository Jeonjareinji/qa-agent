import { IKON } from './iconPaths.ts'
import type { BentukIkon, NamaIkon } from './iconPaths.ts'

interface Props {
  nama: NamaIkon
  ukuran?: number
  className?: string
}

export function Icon({ nama, ukuran = 20, className }: Props) {
  const bentuk: BentukIkon = IKON[nama]
  return (
    <svg
      className={className ? 'ikon ' + className : 'ikon'}
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {bentuk.persegi?.map(([x, y, lebar, tinggi, rx]) => (
        <rect key={`r${x}-${y}`} x={x} y={y} width={lebar} height={tinggi} rx={rx} />
      ))}
      {bentuk.lingkaran?.map(([cx, cy, r]) => (
        <circle key={`c${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
      {bentuk.path?.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
