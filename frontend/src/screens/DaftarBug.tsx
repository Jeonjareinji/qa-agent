import { useState } from 'react'
import { DAFTAR_SEVERITY, DAFTAR_STATUS_BUG } from '../data/dummy.ts'
import type { BugLengkap, Severity, StatusBug } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { SeverityBadge, StatusBugBadge, Tag } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Chips } from '../components/Chips.tsx'
import { Thumbs } from '../components/Evidence.tsx'
import { itemThumb } from '../components/evidenceItem.ts'
import { SearchField } from '../components/Fields.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { listBug } from '../lib/api.ts'
import { formatTanggal } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { useLoad } from '../lib/useLoad.ts'
import { CatatBug } from './CatatBug.tsx'
import { UbahBug } from './UbahBug.tsx'

type Filter = 'semua' | Severity

const FILTER: { nilai: Filter; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  ...DAFTAR_SEVERITY.map((s) => ({ nilai: s as Filter, label: s })),
]

type FilterStatus = 'semua' | StatusBug

const FILTER_STATUS: { nilai: FilterStatus; label: string }[] = [
  { nilai: 'semua', label: 'Semua status' },
  ...DAFTAR_STATUS_BUG.map((s) => ({ nilai: s as FilterStatus, label: s })),
]

function asalBug(b: BugLengkap): string {
  return b.tcId ?? 'Di luar scenario'
}

export function DaftarBug({ nav }: { nav: Nav }) {
  const { data, galat, muatUlang } = useLoad('bug-list', listBug)
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua')
  const [membuat, setMembuat] = useState(false)
  const [mengubah, setMengubah] = useState(false)
  const [terpilih, setTerpilih] = useState<string | null>(null)

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const kata = cari.trim().toLowerCase()
  const tampil = data.filter(
    (b) =>
      (filter === 'semua' || b.severity === filter) &&
      (filterStatus === 'semua' || b.status === filterStatus) &&
      (kata === '' ||
        b.id.toLowerCase().includes(kata) ||
        b.judul.toLowerCase().includes(kata) ||
        b.executionJudul.toLowerCase().includes(kata)),
  )
  const bug = data.find((b) => b.id === terpilih) ?? null

  return (
    <>
      <AppBar judul="Bug List" subjudul={`${data.length} bug`} onKembali={nav.kembali} />
      <div className="scroll tight">
        <SearchField label="Cari bug" placeholder="Cari ID, judul, atau execution" nilai={cari} onUbah={setCari} />
        <Button varian="dashed" blok ikon="tambah" onKlik={() => setMembuat(true)}>
          Buat bug baru
        </Button>
        <Chips label="Filter severity" item={FILTER} terpilih={filter} onPilih={setFilter} />
        <Chips label="Filter status" item={FILTER_STATUS} terpilih={filterStatus} onPilih={setFilterStatus} />
        {tampil.length === 0 ? (
          <Kosong pesan="Tidak ada bug yang cocok." />
        ) : (
          <div className="col muncul">
            {tampil.map((b) => (
              <button key={b.id} type="button" className="card tombol" onClick={() => setTerpilih(b.id)}>
                <div className="row between">
                  <span className="mono t-sm w7">{b.id}</span>
                  <div className="row gap-8">
                    <StatusBugBadge status={b.status} />
                    <SeverityBadge severity={b.severity} />
                  </div>
                </div>
                <span className="t-body w6">{b.judul}</span>
                <div className="row gap-8 wrap">
                  <Tag>{b.prioritas}</Tag>
                  <Tag>{b.tipe}</Tag>
                </div>
                <span className="t-cap ell">
                  {b.executionJudul} · {asalBug(b)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {bug && (
        <Sheet
          judul={bug.id}
          subjudul={<span className="t-sm c-2">{bug.judul}</span>}
          onTutup={() => {
            setMengubah(false)
            setTerpilih(null)
          }}
          kaki={
            <Button varian="secondary" blok ikon="pensil" onKlik={() => setMengubah(true)} nonaktif={mengubah}>
              Ubah bug
            </Button>
          }
        >
          <div className="col col-16">
            <div className="row gap-8 wrap">
              <StatusBugBadge status={bug.status} />
              <SeverityBadge severity={bug.severity} />
              <Tag>{bug.prioritas}</Tag>
              <Tag>{bug.tipe}</Tag>
            </div>
            <dl className="kv">
              <dt>Execution</dt>
              <dd>{bug.executionJudul}</dd>
              <dt>Test case</dt>
              <dd className={bug.tcId ? 'mono' : undefined}>{asalBug(bug)}</dd>
              <dt>Dibuat</dt>
              <dd>
                {formatTanggal(bug.dibuatPada)} oleh {bug.dibuatOlehNama}
              </dd>
            </dl>
            <section className="col col-4">
              <span className="label">Actual result</span>
              <span className="t-body">{bug.actualResult || 'Tidak diisi.'}</span>
            </section>
            <section className="col col-8">
              <span className="label">Evidence</span>
              {bug.evidence.length === 0 && <span className="help">Tidak ada evidence.</span>}
              <Thumbs item={bug.evidence.map((e) => itemThumb(e))} />
            </section>
          </div>
        </Sheet>
      )}
      {bug && mengubah && (
        <UbahBug
          key={bug.id}
          bug={bug}
          onTutup={() => setMengubah(false)}
          onTersimpan={() => {
            setMengubah(false)
            muatUlang()
          }}
        />
      )}
      {membuat && (
        <CatatBug
          pilih
          onTutup={() => setMembuat(false)}
          onTersimpan={() => {
            setMembuat(false)
            muatUlang()
          }}
        />
      )}
    </>
  )
}
