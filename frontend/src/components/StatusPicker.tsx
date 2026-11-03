import { DAFTAR_STATUS } from '../data/dummy.ts'
import type { StatusKasus } from '../data/dummy.ts'
import { Icon } from './Icon.tsx'
import { IKON_STATUS, KUNCI_STATUS } from './statusInfo.ts'

export function StatusPicker({ nilai, onPilih }: { nilai: StatusKasus; onPilih: (status: StatusKasus) => void }) {
  return (
    <div className="status-grid" role="group" aria-label="Status hasil">
      {DAFTAR_STATUS.map((s) => (
        <button
          key={s}
          type="button"
          className={'status-tile st-' + KUNCI_STATUS[s]}
          aria-pressed={nilai === s}
          onClick={() => onPilih(s)}
        >
          <Icon nama={IKON_STATUS[s]} ukuran={24} />
          {s}
        </button>
      ))}
    </div>
  )
}

export function IkonStatus({ status, ukuran = 'normal' }: { status: StatusKasus; ukuran?: 'kecil' | 'normal' | 'besar' }) {
  const kelas = ['ikon-bulat', 'k-' + KUNCI_STATUS[status], ukuran !== 'normal' && ukuran].filter(Boolean).join(' ')
  return (
    <span className={kelas}>
      <Icon nama={IKON_STATUS[status]} ukuran={ukuran === 'besar' ? 32 : ukuran === 'kecil' ? 16 : 20} />
    </span>
  )
}
