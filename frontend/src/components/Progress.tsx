export interface Segmen {
  kelas: string // mis. 'f-pass'
  persen: number // 0..100
}

export function Progress({ segmen, ukuran }: { segmen: Segmen[]; ukuran?: 'kecil' | 'besar' }) {
  return (
    <div className={ukuran ? 'progress ' + ukuran : 'progress'} role="presentation">
      {segmen.map((s) => (
        <i key={s.kelas} className={s.kelas} style={{ width: s.persen + '%' }} />
      ))}
    </div>
  )
}
