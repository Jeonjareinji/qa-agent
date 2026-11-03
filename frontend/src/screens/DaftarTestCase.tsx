import { useState } from 'react'
import { AppBar } from '../components/AppBar.tsx'
import { Tag } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Chips } from '../components/Chips.tsx'
import { SearchField } from '../components/Fields.tsx'
import { Icon } from '../components/Icon.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { listKumpulan } from '../lib/api.ts'
import { formatTanggal } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { useLoad } from '../lib/useLoad.ts'

type Filter = 'semua' | 'software' | 'hardware'

const FILTER: { nilai: Filter; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'software', label: 'Software' },
  { nilai: 'hardware', label: 'Hardware' },
]

export function DaftarTestCase({ nav }: { nav: Nav }) {
  const { data, galat, muatUlang } = useLoad('kumpulan', listKumpulan)
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const kata = cari.trim().toLowerCase()
  const tampil = data.filter((k) => (filter === 'semua' || k.jenis === filter) && k.judul.toLowerCase().includes(kata))

  return (
    <>
      <AppBar judul="Daftar Test Case" subjudul={`${data.length} kumpulan`} onKembali={nav.kembali} />
      <div className="scroll tight">
        <SearchField label="Cari kumpulan" placeholder="Cari judul kumpulan" nilai={cari} onUbah={setCari} />
        <Chips label="Filter jenis" item={FILTER} terpilih={filter} onPilih={setFilter} />
        <Button varian="dashed" blok ikon="unggah" onKlik={() => nav.buka({ nama: 'import' })}>
          Import test case baru
        </Button>
        {tampil.length === 0 ? (
          <Kosong pesan="Tidak ada kumpulan test case yang cocok." />
        ) : (
          <div className="col muncul">
            {tampil.map((k) => (
              <button
                key={k.id}
                type="button"
                className="card tombol"
                onClick={() => nav.buka({ nama: 'detailTestCase', kumpulanId: k.id })}
              >
                <div className="row between start">
                  <span className="t-body w7 grow">{k.judul}</span>
                  <Icon nama="maju" className="c-3" />
                </div>
                <div className="row gap-8 wrap">
                  <Tag>{k.jenis === 'software' ? 'Software' : 'Hardware'}</Tag>
                  <span className="t-sm c-2">{k.jumlah} test case</span>
                </div>
                <span className="t-cap">
                  Diimpor {formatTanggal(k.diimporPada)} oleh {k.diimporOlehNama} · dipakai di {k.dipakaiDi} execution
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
