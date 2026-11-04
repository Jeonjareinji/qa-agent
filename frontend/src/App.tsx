import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { ruteAwal } from './lib/nav.ts'
import type { Nav, Rute } from './lib/nav.ts'
import { FokusLayar } from './lib/useLoad.ts'
import { Beranda } from './screens/Beranda.tsx'
import { BuatExecution } from './screens/BuatExecution.tsx'
import { DaftarBug } from './screens/DaftarBug.tsx'
import { DaftarExecution } from './screens/DaftarExecution.tsx'
import { DaftarTestCase } from './screens/DaftarTestCase.tsx'
import { DetailTestCase } from './screens/DetailTestCase.tsx'
import { EditTestCase } from './screens/EditTestCase.tsx'
import { ExportReport } from './screens/ExportReport.tsx'
import { HasilExecution } from './screens/HasilExecution.tsx'
import { HasilImport } from './screens/HasilImport.tsx'
import { ImportTestCase } from './screens/ImportTestCase.tsx'
import { JalankanExecution } from './screens/JalankanExecution.tsx'
import { ValidasiField } from './screens/ValidasiField.tsx'

function tampilkan(rute: Rute, nav: Nav): ReactElement {
  switch (rute.nama) {
    case 'beranda':
      return <Beranda nav={nav} />
    case 'import':
      return <ImportTestCase nav={nav} />
    case 'validasi':
      return <ValidasiField nav={nav} draft={rute.draft} />
    case 'hasilImport':
      return <HasilImport nav={nav} hasil={rute.hasil} />
    case 'buatExecution':
      return <BuatExecution nav={nav} />
    case 'hasilExecution':
      return <HasilExecution nav={nav} executionId={rute.executionId} />
    case 'daftarExecution':
      return <DaftarExecution nav={nav} />
    case 'jalankan':
      return <JalankanExecution nav={nav} executionId={rute.executionId} />
    case 'export':
      return <ExportReport nav={nav} executionId={rute.executionId} />
    case 'daftarTestCase':
      return <DaftarTestCase nav={nav} />
    case 'detailTestCase':
      return <DetailTestCase nav={nav} kumpulanId={rute.kumpulanId} />
    case 'daftarBug':
      return <DaftarBug nav={nav} />
    case 'editTestCase':
      return <EditTestCase nav={nav} kumpulanId={rute.kumpulanId} tcId={rute.tcId} />
  }
}

export default function App() {
  const [tumpukan, setTumpukan] = useState<Rute[]>(() => ruteAwal(window.location.search))

  const nav = useMemo<Nav>(
    () => ({
      buka: (rute) => setTumpukan((t) => [...t, rute]),
      ganti: (rute) => setTumpukan((t) => [...t.slice(0, -1), rute]),
      kembali: () => setTumpukan((t) => (t.length > 1 ? t.slice(0, -1) : t)),
      mulaiDari: (...rute) => setTumpukan(rute.length > 0 ? rute : [{ nama: 'beranda' }]),
      beranda: () => setTumpukan([{ nama: 'beranda' }]),
    }),
    [],
  )

  return (
    <div className="app">
      {tumpukan.map((rute, indeks) => {
        const aktif = indeks === tumpukan.length - 1
        return (
          <FokusLayar.Provider key={indeks + ':' + rute.nama} value={aktif}>
            <div className={aktif ? 'layar' : 'layar layar-tersembunyi'} inert={!aktif}>
              {tampilkan(rute, nav)}
            </div>
          </FokusLayar.Provider>
        )
      })}
    </div>
  )
}
