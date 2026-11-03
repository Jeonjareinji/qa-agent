interface Item<T extends string> {
  nilai: T
  label: string
}

interface Props<T extends string> {
  item: Item<T>[]
  terpilih: T
  onPilih: (nilai: T) => void
  label: string
}

export function Chips<T extends string>({ item, terpilih, onPilih, label }: Props<T>) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {item.map((i) => (
        <button
          key={i.nilai}
          type="button"
          className="chip"
          aria-pressed={i.nilai === terpilih}
          onClick={() => onPilih(i.nilai)}
        >
          {i.label}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ item, terpilih, onPilih, label }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {item.map((i) => (
        <button
          key={i.nilai}
          type="button"
          className="seg-item"
          aria-pressed={i.nilai === terpilih}
          onClick={() => onPilih(i.nilai)}
        >
          {i.label}
        </button>
      ))}
    </div>
  )
}
