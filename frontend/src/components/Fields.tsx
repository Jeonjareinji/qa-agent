import { useId } from 'react'
import { Icon } from './Icon.tsx'

interface FieldDasar {
  label: string
  nilai: string
  onUbah: (nilai: string) => void
  bantuan?: string
  galat?: boolean
}

export function TextField({
  label,
  nilai,
  onUbah,
  bantuan,
  galat,
  placeholder,
  readOnly,
  mono,
}: FieldDasar & { placeholder?: string; readOnly?: boolean; mono?: boolean }) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={mono ? 'input mono' : 'input'}
        type="text"
        value={nilai}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-invalid={galat ? true : undefined}
        onChange={(e) => onUbah(e.target.value)}
      />
      {bantuan && <span className="help">{bantuan}</span>}
    </div>
  )
}

export function TextArea({
  label,
  nilai,
  onUbah,
  bantuan,
  galat,
  placeholder,
  baris = 3,
}: FieldDasar & { placeholder?: string; baris?: number }) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="textarea"
        rows={baris}
        value={nilai}
        placeholder={placeholder}
        aria-invalid={galat ? true : undefined}
        onChange={(e) => onUbah(e.target.value)}
      />
      {bantuan && <span className="help">{bantuan}</span>}
    </div>
  )
}

export function SelectField({
  label,
  nilai,
  onUbah,
  pilihan,
}: Omit<FieldDasar, 'bantuan' | 'galat'> & { pilihan: string[] }) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="select-wrap">
        <select id={id} className="select" value={nilai} onChange={(e) => onUbah(e.target.value)}>
          {pilihan.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <Icon nama="bawah" />
      </div>
    </div>
  )
}

export function SearchField({
  nilai,
  onUbah,
  placeholder,
  label,
}: {
  nilai: string
  onUbah: (nilai: string) => void
  placeholder: string
  label: string
}) {
  const id = useId()
  return (
    <div>
      <label className="sr" htmlFor={id}>
        {label}
      </label>
      <div className="search">
        <Icon nama="cari" />
        <input id={id} type="search" value={nilai} placeholder={placeholder} onChange={(e) => onUbah(e.target.value)} />
      </div>
    </div>
  )
}
