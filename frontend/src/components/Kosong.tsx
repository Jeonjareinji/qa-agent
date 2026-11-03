import { Button } from './Button.tsx'

export function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="kosong">
      <svg viewBox="0 0 120 96" aria-hidden="true">
        <rect className="il-isi" x="22" y="8" width="60" height="76" rx="10" />
        <rect className="il-garis" x="34" y="24" width="36" height="6" rx="3" />
        <rect className="il-garis" x="34" y="38" width="28" height="6" rx="3" />
        <circle className="il-cincin" cx="84" cy="58" r="16" />
        <path className="il-gagang" d="m96 70 12 12" />
      </svg>
      <span className="t-body">{pesan}</span>
    </div>
  )
}

// Kerangka pemuatan dengan efek kilau.
export function Memuat() {
  return (
    <div className="memuat" aria-busy="true" aria-label="Memuat data">
      <div className="kilau" style={{ height: 20, width: '60%' }} />
      <div className="kilau" style={{ height: 96 }} />
      <div className="kilau" style={{ height: 96 }} />
      <div className="kilau" style={{ height: 96 }} />
    </div>
  )
}

export function Galat({ pesan, onUlang }: { pesan: string; onUlang: () => void }) {
  return (
    <div className="kosong">
      <span className="t-body">{pesan}</span>
      <Button varian="soft" kecil onKlik={onUlang}>
        Coba lagi
      </Button>
    </div>
  )
}
