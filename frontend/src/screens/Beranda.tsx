import { useState } from 'react'
import { DAFTAR_PERIODE, DAFTAR_SEVERITY } from '../data/dummy.ts'
import type { Periode } from '../data/dummy.ts'
import { Galat, Memuat } from '../components/Kosong.tsx'
import { Icon } from '../components/Icon.tsx'
import type { NamaIkon } from '../components/iconPaths.ts'
import { Progress } from '../components/Progress.tsx'
import { KUNCI_SEVERITY } from '../components/statusInfo.ts'
import { getDashboard } from '../lib/api.ts'
import { hitungBusur } from '../lib/chart.ts'
import { inisial, persen } from '../lib/hitung.ts'
import type { Nav, Rute } from '../lib/nav.ts'
import { namaPengguna } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'
import './Beranda.css'

const JARI_ORB = 92
const KELILING_ORB = 2 * Math.PI * JARI_ORB

interface MenuItem {
  rute: Rute
  ikon: NamaIkon
  kelas: string
  judul: string
  keterangan: string
}

const MENU: MenuItem[] = [
  { rute: { nama: 'import' }, ikon: 'unggah', kelas: 'm1', judul: 'Import Test Case', keterangan: 'Upload file Excel lalu beri judul' },
  { rute: { nama: 'buatExecution' }, ikon: 'papanTambah', kelas: 'm2', judul: 'Buat Test Execution', keterangan: 'Pilih kumpulan test case tersimpan' },
  { rute: { nama: 'daftarExecution' }, ikon: 'mainBulat', kelas: 'm3', judul: 'Test Execution', keterangan: 'Jalankan, update status, export report' },
  { rute: { nama: 'daftarTestCase' }, ikon: 'daftar', kelas: 'm4', judul: 'Daftar Test Case', keterangan: 'Lihat dan edit test case yang sudah diimpor' },
]

export function Beranda({ nav }: { nav: Nav }) {
  const [periode, setPeriode] = useState<Periode>('30')
  const { data, galat, muatUlang } = useLoad('dashboard:' + periode, () => getDashboard(periode))
  const nama = namaPengguna()

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const busur = hitungBusur(
    [
      { kunci: 'pass', jumlah: data.hitung.Pass },
      { kunci: 'fail', jumlah: data.hitung.Fail },
      { kunci: 'blocked', jumlah: data.hitung.Blocked },
      { kunci: 'na', jumlah: data.hitung['N/A'] },
    ],
    JARI_ORB,
    4,
  )
  const maksBug = Math.max(...DAFTAR_SEVERITY.map((s) => data.bugPerSeverity[s]), 1)

  return (
    <main className="ahome">
      <section className="hero-gelap">
        <div className="hero-bar">
          <div className="hero-logo">
            <i>
              <Icon nama="perisai" />
            </i>
            QA Agent
          </div>
          <span className="hero-avatar" role="img" aria-label={'Akun Telegram: ' + nama}>
            {inisial(nama)}
          </span>
        </div>
        <p className="hero-sapa">Halo, {nama} · via Telegram Bot</p>

        <div className="orb" role="img" aria-label={`Pass rate ${data.passRate} persen`}>
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle className="orb-riak" cx="120" cy="120" r="112" />
            <circle className="orb-riak kedua" cx="120" cy="120" r="112" />
            <g className="orb-putar1">
              <ellipse className="orb-kontur" cx="120" cy="120" rx="108" ry="98" transform="rotate(18 120 120)" />
              <ellipse className="orb-kontur" cx="120" cy="120" rx="100" ry="90" transform="rotate(-22 120 120)" />
              <ellipse className="orb-kontur" cx="120" cy="120" rx="92" ry="84" transform="rotate(46 120 120)" />
            </g>
            <g className="orb-putar2">
              <ellipse className="orb-kontur" cx="120" cy="120" rx="82" ry="76" transform="rotate(-48 120 120)" />
              <ellipse className="orb-kontur" cx="120" cy="120" rx="76" ry="68" transform="rotate(12 120 120)" />
            </g>
            <g transform="rotate(-90 120 120)">
              <circle className="orb-jalur" cx="120" cy="120" r={JARI_ORB} />
              {busur.map((b) => (
                <circle
                  key={b.kunci}
                  className={'orb-busur ' + b.kunci}
                  cx="120"
                  cy="120"
                  r={JARI_ORB}
                  style={{
                    strokeDasharray: `${b.panjang.toFixed(1)} ${KELILING_ORB.toFixed(1)}`,
                    strokeDashoffset: b.offset.toFixed(1),
                  }}
                />
              ))}
            </g>
            <circle className="orb-dalam" cx="120" cy="120" r="68" />
          </svg>
          <div className="orb-tengah">
            <b>{data.passRate}%</b>
            <span>Pass rate</span>
          </div>
        </div>

        <div className="hero-status">
          <Icon nama="perisai" />
          dari {data.dieksekusi} test case yang dieksekusi
        </div>
        <div className="hero-mini">
          <span>
            <i className="dot" style={{ ['--dot' as string]: '#34D17A' }} />
            Pass {data.hitung.Pass}
          </span>
          <span>
            <i className="dot" style={{ ['--dot' as string]: '#F26B76' }} />
            Fail {data.hitung.Fail}
          </span>
          <span>
            <i className="dot" style={{ ['--dot' as string]: '#FBBF24' }} />
            Blocked {data.hitung.Blocked}
          </span>
          <span>
            <i className="dot" style={{ ['--dot' as string]: '#8EA6C4' }} />
            N/A {data.hitung['N/A']}
          </span>
        </div>
      </section>

      <section className="lsheet" aria-label="Ringkasan">
        <div className="row between" style={{ padding: '0 20px 12px' }}>
          <h2 className="t-title">Ringkasan</h2>
          <div className="select-wrap kecil">
            <label className="sr" htmlFor="periode">
              Periode
            </label>
            <select
              id="periode"
              className="select select-kecil"
              value={periode}
              onChange={(e) => setPeriode(e.target.value as Periode)}
            >
              {DAFTAR_PERIODE.map((p) => (
                <option key={p.nilai} value={p.nilai}>
                  {p.label}
                </option>
              ))}
            </select>
            <Icon nama="bawah" />
          </div>
        </div>
        <div className="hscroll">
          <div className="hcard grad">
            <b>{data.testCaseTersimpan}</b>
            <span className="k">Test case tersimpan</span>
          </div>
          <div className="hcard">
            <span className="ikon-bulat kecil">
              <Icon nama="mainBulat" ukuran={16} />
            </span>
            <span>
              <b>{data.executionAktif}</b>
              <br />
              <span className="k c-2">Execution aktif</span>
            </span>
          </div>
          <div className="hcard">
            <span className="ikon-bulat kecil k-fail">
              <Icon nama="bug" ukuran={16} />
            </span>
            <span>
              <b>{data.bugOpen}</b>
              <br />
              <span className="k c-2">Bug open</span>
            </span>
          </div>
          <div className="hcard">
            <span className="ikon-bulat kecil k-pass">
              <Icon nama="centangBulat" ukuran={16} />
            </span>
            <span>
              <b>{data.hitung.Pass}</b>
              <br />
              <span className="k c-2">Pass</span>
            </span>
          </div>
        </div>
      </section>

      <section className="dsheet dk" aria-label="Menu">
        <h2 className="t-title" style={{ margin: '4px 0' }}>
          Menu
        </h2>
        <nav className="muncul" aria-label="Menu utama">
          {MENU.map((m) => (
            <button key={m.judul} type="button" className="menu-baris" onClick={() => nav.buka(m.rute)}>
              <span className={'ikon-bulat ' + m.kelas}>
                <Icon nama={m.ikon} />
              </span>
              <span className="grow col col-4">
                <span className="t-body w6">{m.judul}</span>
                <span className="t-cap">{m.keterangan}</span>
              </span>
              <Icon nama="maju" className="c-3" />
            </button>
          ))}
        </nav>

        <div className="sheet-bagian">
          <h3 className="t-h2">Progress execution aktif</h3>
          {data.progressAktif.map((p) => (
            <div key={p.id} className="col col-8">
              <div className="row between">
                <span className="t-sm w5 ell">{p.judul}</span>
                <span className="t-sm c-2 mono">
                  {p.selesai}/{p.total}
                </span>
              </div>
              <Progress ukuran="kecil" segmen={[{ kelas: 'f-primary', persen: persen(p.selesai, p.total) }]} />
            </div>
          ))}
        </div>

        <div className="sheet-bagian">
          <h3 className="t-h2">Bug open per severity</h3>
          {DAFTAR_SEVERITY.map((s) => (
            <div key={s} className="baris-bug">
              <span>
                <i className={'dot d-' + KUNCI_SEVERITY[s]} />
                {s}
              </span>
              <Progress
                ukuran="kecil"
                segmen={[{ kelas: 'f-' + KUNCI_SEVERITY[s], persen: (data.bugPerSeverity[s] / maksBug) * 100 }]}
              />
              <b>{data.bugPerSeverity[s]}</b>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
