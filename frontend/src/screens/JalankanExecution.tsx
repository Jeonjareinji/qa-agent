import { useState } from 'react'
import { DAFTAR_STATUS } from '../data/dummy.ts'
import type { ExecutionLengkap, StatusKasus } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { SeverityBadge, StatusBadge } from '../components/Badge.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Chips } from '../components/Chips.tsx'
import { Donut } from '../components/Donut.tsx'
import { SearchField } from '../components/Fields.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { SheetDaftar } from '../components/SheetDaftar.tsx'
import { IKON_STATUS, KUNCI_STATUS } from '../components/statusInfo.ts'
import { Icon } from '../components/Icon.tsx'
import { getExecution, listBugDiLuarScenario } from '../lib/api.ts'
import { hitungStatus, jumlahDieksekusi, persen } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { useLoad } from '../lib/useLoad.ts'
import { CatatBug } from './CatatBug.tsx'
import { DetailKasus } from './DetailKasus.tsx'

type Filter = 'semua' | StatusKasus

const FILTER: { nilai: Filter; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  ...DAFTAR_STATUS.map((s) => ({ nilai: s as Filter, label: s })),
]

export function JalankanExecution({ nav, executionId }: { nav: Nav; executionId: string }) {
  const { data, galat, muatUlang } = useLoad('jalankan:' + executionId, () => getExecution(executionId))
  const [lokal, setLokal] = useState<ExecutionLengkap | null>(null)
  const [terbuka, setTerbuka] = useState(false)
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [bugTerbuka, setBugTerbuka] = useState(false)
  const [bugLuarTerbuka, setBugLuarTerbuka] = useState(false)
  const bugLuar = useLoad('bug-luar:' + executionId, () => listBugDiLuarScenario(executionId))

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  const execution = lokal ?? data
  if (!execution) return <Memuat />

  const hitung = hitungStatus(execution.kasus)
  const dieksekusi = jumlahDieksekusi(execution.kasus)
  const belum = hitung['Not Run']
  const kata = cari.trim().toLowerCase()
  const tampil = execution.kasus.filter(
    (k) =>
      (filter === 'semua' || k.status === filter) &&
      (kata === '' || k.tcId.toLowerCase().includes(kata) || k.scenario.toLowerCase().includes(kata)),
  )
  const kasusTerpilih = execution.kasus.find((k) => k.tcId === terpilih) ?? null

  return (
    <>
      <AppBar judul={execution.judul} subjudul={`${dieksekusi}/${execution.kasus.length} dieksekusi`} onKembali={nav.kembali} />
      <div className={terbuka ? 'atas-ringkasan tersembunyi' : 'atas-ringkasan'}>
        <div className="kartu-atas">
          <Donut
            label={`Hasil: ${DAFTAR_STATUS.map((s) => `${hitung[s]} ${s}`).join(', ')}`}
            item={DAFTAR_STATUS.filter((s) => s !== 'Not Run').map((s) => ({ kunci: KUNCI_STATUS[s], jumlah: hitung[s] }))}
          />
          <div className="daftar-ringkas">
            <div className="angka-besar">
              {persen(dieksekusi, execution.kasus.length)}
              <small>%</small>
            </div>
            {DAFTAR_STATUS.map((s) => (
              <div key={s} className="item-ringkas" style={{ gridTemplateColumns: '14px minmax(0, 1fr) auto' }}>
                <i className={'dot d-' + KUNCI_STATUS[s]} />
                <span className="t-sm">{s}</span>
                <b>{hitung[s]}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SheetDaftar
        judul="Test case"
        terbuka={terbuka}
        onUbah={setTerbuka}
        posisiTutup={372}
        kepala={
          <>
            <SearchField label="Cari test case" placeholder="Cari ID atau scenario" nilai={cari} onUbah={setCari} />
            <Chips label="Filter status" item={FILTER} terpilih={filter} onPilih={setFilter} />
          </>
        }
      >
        <div className="col col-8">
          <Button varian="dashed" blok ikon="bug" onKlik={() => setBugLuarTerbuka(true)}>
            Catat bug di luar scenario
          </Button>
          {bugLuar.data && bugLuar.data.length > 0 && (
            <div>
              <span className="t-sm c-2">Bug di luar scenario ({bugLuar.data.length})</span>
              {bugLuar.data.map((b) => (
                <div key={b.id} className="baris-daftar" style={{ gap: 6 }}>
                  <div className="row between">
                    <span className="mono t-sm w7">{b.id}</span>
                    <SeverityBadge severity={b.severity} />
                  </div>
                  <span className="t-body">{b.judul}</span>
                  <span className="t-cap">
                    {b.prioritas} · {b.tipe}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {tampil.length === 0 ? (
          <Kosong pesan="Tidak ada test case yang cocok." />
        ) : (
          tampil.map((k) => (
            <button key={k.tcId} type="button" className="baris-tombol kolom" onClick={() => setTerpilih(k.tcId)}>
              <div className="row between">
                <span className="mono t-sm w7">{k.tcId}</span>
                <StatusBadge status={k.status} />
              </div>
              <span className="t-body">{k.scenario}</span>
              <div className="row gap-8 wrap">
                <Icon nama={IKON_STATUS[k.status]} ukuran={16} className={'c-2'} />
                <span className="t-cap">
                  {k.modul} · {k.prioritas}
                </span>
                {k.diubah && <span className="badge b-primary">Diubah</span>}
                {k.evidence.length > 0 && <span className="t-cap">{k.evidence.length} evidence</span>}
                {k.bugId && <span className="badge b-fail mono">{k.bugId}</span>}
              </div>
            </button>
          ))
        )}
      </SheetDaftar>

      {kasusTerpilih && (
        <DetailKasus
          key={kasusTerpilih.tcId}
          executionId={execution.id}
          kasus={kasusTerpilih}
          onUbah={setLokal}
          catatBugTerbuka={bugTerbuka}
          onCatatBug={() => setBugTerbuka(true)}
          onTutup={() => {
            setBugTerbuka(false)
            setTerpilih(null)
          }}
        />
      )}
      {kasusTerpilih && bugTerbuka && (
        <CatatBug
          executionId={execution.id}
          kasus={kasusTerpilih}
          onTutup={() => setBugTerbuka(false)}
          onTersimpan={() => {
            setBugTerbuka(false)
            void getExecution(execution.id).then(setLokal)
          }}
        />
      )}

      {bugLuarTerbuka && (
        <CatatBug
          executionId={execution.id}
          kasus={null}
          onTutup={() => setBugLuarTerbuka(false)}
          onTersimpan={() => {
            setBugLuarTerbuka(false)
            bugLuar.muatUlang()
          }}
        />
      )}

      <BottomBar petunjuk={belum > 0 ? `${belum} test case belum dijalankan` : undefined}>
        <Button blok onKlik={() => nav.buka({ nama: 'export', executionId: execution.id })}>
          Selesai &amp; export report
        </Button>
      </BottomBar>
    </>
  )
}
