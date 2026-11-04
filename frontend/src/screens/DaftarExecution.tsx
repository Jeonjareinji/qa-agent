import { useState } from 'react'
import type { StatusExecution } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { ExecutionBadge } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { Chips } from '../components/Chips.tsx'
import { Donut } from '../components/Donut.tsx'
import { SearchField } from '../components/Fields.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { Progress } from '../components/Progress.tsx'
import { SheetDaftar } from '../components/SheetDaftar.tsx'
import { listExecutions } from '../lib/api.ts'
import { formatTanggal, jumlahDieksekusi, persen, statusExecution } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { useLoad } from '../lib/useLoad.ts'

type Filter = 'semua' | StatusExecution

const FILTER: { nilai: Filter; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'berjalan', label: 'Berjalan' },
  { nilai: 'belum', label: 'Belum mulai' },
  { nilai: 'selesai', label: 'Selesai' },
]

const LABEL: Record<StatusExecution, string> = { berjalan: 'Berjalan', belum: 'Belum mulai', selesai: 'Selesai' }
const URUTAN: StatusExecution[] = ['berjalan', 'belum', 'selesai']

export function DaftarExecution({ nav }: { nav: Nav }) {
  const { data, galat, muatUlang } = useLoad('executions', listExecutions)
  const [terbuka, setTerbuka] = useState(false)
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const jumlah: Record<StatusExecution, number> = { berjalan: 0, belum: 0, selesai: 0 }
  for (const e of data) jumlah[statusExecution(e)] += 1

  const tampil = data.filter(
    (e) =>
      (filter === 'semua' || statusExecution(e) === filter) &&
      e.judul.toLowerCase().includes(cari.trim().toLowerCase()),
  )

  return (
    <>
      <AppBar judul="Test Execution" subjudul={`${data.length} execution`} onKembali={nav.kembali} />
      <div className={terbuka ? 'atas-ringkasan tersembunyi' : 'atas-ringkasan'}>
        <div className="kartu-atas">
          <Donut
            label={`Komposisi execution: ${jumlah.berjalan} berjalan, ${jumlah.belum} belum mulai, ${jumlah.selesai} selesai`}
            item={URUTAN.map((s) => ({ kunci: s, jumlah: jumlah[s] }))}
          />
          <div className="daftar-ringkas">
            <div className="angka-besar">
              {data.length}
              <small> total</small>
            </div>
            {URUTAN.map((s) => (
              <div key={s} className="item-ringkas" style={{ gridTemplateColumns: '14px minmax(0, 1fr) auto' }}>
                <i className={'dot d-' + (s === 'selesai' ? 'pass' : s === 'berjalan' ? 'blocked' : 'notrun')} />
                <span className="t-sm">{LABEL[s]}</span>
                <b>{jumlah[s]}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SheetDaftar
        judul="Daftar execution"
        terbuka={terbuka}
        onUbah={setTerbuka}
        posisiTutup={372}
        kepala={
          <>
            <SearchField label="Cari execution" placeholder="Cari judul execution" nilai={cari} onUbah={setCari} />
            <Chips label="Filter status" item={FILTER} terpilih={filter} onPilih={setFilter} />
          </>
        }
      >
        <Button varian="dashed" blok ikon="tambah" onKlik={() => nav.buka({ nama: 'buatExecution' })}>
          Buat execution baru
        </Button>
        {tampil.length === 0 ? (
          <Kosong pesan="Tidak ada execution yang cocok." />
        ) : (
          tampil.map((e) => {
            const status = statusExecution(e)
            const selesai = jumlahDieksekusi(e.kasus)
            const buka = () =>
              nav.buka(status === 'selesai' ? { nama: 'export', executionId: e.id } : { nama: 'jalankan', executionId: e.id })
            return (
              <div key={e.id} className="baris-aksi">
                <button type="button" className="baris-tombol kolom" onClick={buka}>
                  <div className="row between start">
                    <span className="t-body w7 grow">{e.judul}</span>
                    <ExecutionBadge status={status} />
                  </div>
                  <Progress ukuran="kecil" segmen={[{ kelas: 'f-primary', persen: persen(selesai, e.kasus.length) }]} />
                  <div className="row between">
                    <span className="t-sm c-2 mono">
                      {selesai}/{e.kasus.length} dieksekusi
                    </span>
                    <span className="t-sm c-2">{formatTanggal(e.dibuatPada)}</span>
                  </div>
                  <span className="t-cap ell">PIC: {e.picNama.length > 0 ? e.picNama.join(', ') : 'belum ditentukan'}</span>
                </button>
                {status === 'selesai' ? (
                  <Button varian="secondary" kecil blok ikon="dokumen" onKlik={buka}>
                    Lihat report
                  </Button>
                ) : (
                  <Button kecil blok ikon="main" onKlik={buka}>
                    {status === 'belum' ? 'Mulai' : 'Lanjutkan'}
                  </Button>
                )}
              </div>
            )
          })
        )}
      </SheetDaftar>
    </>
  )
}
