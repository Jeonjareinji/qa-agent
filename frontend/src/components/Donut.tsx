import { hitungBusur } from '../lib/chart.ts'
import './Donut.css'

export interface ItemDonut {
  kunci: string // dipakai untuk kelas warna: aa-<kunci> dan pc-<kunci>
  jumlah: number
}

const JARI = 50
const KELILING = 2 * Math.PI * JARI

export function Donut({ item, label }: { item: ItemDonut[]; label: string }) {
  const busur = hitungBusur(item, JARI, 4)
  return (
    <div className="adonut" role="img" aria-label={label}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="atrack" cx="70" cy="70" r={JARI} />
        {busur.map((b) => (
          <circle
            key={b.kunci}
            className={'aarc aa-' + b.kunci}
            cx="70"
            cy="70"
            r={JARI}
            style={{ strokeDasharray: `${b.panjang.toFixed(1)} ${KELILING.toFixed(1)}`, strokeDashoffset: b.offset.toFixed(1) }}
          />
        ))}
      </svg>
      {busur
        .filter((b) => b.porsi >= 0.1)
        .map((b) => (
          <span
            key={b.kunci}
            className={'pct pc-' + b.kunci}
            style={{ left: 70 + JARI * Math.sin(b.sudut) - 18, top: 70 - JARI * Math.cos(b.sudut) - 11 }}
          >
            {Math.round(b.porsi * 100)}%
          </span>
        ))}
    </div>
  )
}
