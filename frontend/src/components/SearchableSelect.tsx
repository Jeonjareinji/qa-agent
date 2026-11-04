import { useEffect, useId, useRef, useState } from 'react'
import type { StatusKasus } from '../data/dummy.ts'
import { haptic } from '../lib/telegram.ts'
import { Icon } from './Icon.tsx'
import { KUNCI_STATUS } from './statusInfo.ts'
import './SearchableSelect.css'

export interface OpsiTestCase {
  nilai: string
  label: string
  tcId?: string
  scenario?: string
  modul?: string
  status?: StatusKasus
  nonaktif?: boolean
  pesanNonaktif?: string
}

interface Props {
  label: string
  nilai: string
  onUbah: (nilai: string) => void
  pilihan: OpsiTestCase[]
  bantuan?: string
  placeholderCari?: string
}

export function SearchableSelect({
  label,
  nilai,
  onUbah,
  pilihan,
  bantuan,
  placeholderCari = 'Cari ID (mis. NS-011), status, modul, atau skenario...',
}: Props) {
  const id = useId()
  const wadahRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [terbuka, setTerbuka] = useState(false)
  const [cari, setCari] = useState('')

  // Tutup dropdown bila pengguna mengetuk di luar elemen
  useEffect(() => {
    if (!terbuka) return
    const tanganiKlikLuar = (e: MouseEvent | TouchEvent) => {
      if (wadahRef.current && !wadahRef.current.contains(e.target as Node)) {
        setTerbuka(false)
      }
    }
    const tanganiKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTerbuka(false)
    }

    document.addEventListener('mousedown', tanganiKlikLuar)
    document.addEventListener('touchstart', tanganiKlikLuar)
    window.addEventListener('keydown', tanganiKey)
    return () => {
      document.removeEventListener('mousedown', tanganiKlikLuar)
      document.removeEventListener('touchstart', tanganiKlikLuar)
      window.removeEventListener('keydown', tanganiKey)
    }
  }, [terbuka])

  // Fokus otomatis ke kotak pencarian saat dropdown dibuka
  useEffect(() => {
    if (terbuka && inputRef.current) {
      inputRef.current.focus()
    }
  }, [terbuka])

  const kataKunci = cari.trim().toLowerCase()
  const hasilFilter = pilihan.filter((p) => {
    if (!kataKunci) return true
    const cocokLabel = p.label.toLowerCase().includes(kataKunci)
    const cocokTcId = p.tcId ? p.tcId.toLowerCase().includes(kataKunci) : false
    const cocokScenario = p.scenario ? p.scenario.toLowerCase().includes(kataKunci) : false
    const cocokModul = p.modul ? p.modul.toLowerCase().includes(kataKunci) : false
    const cocokStatus = p.status ? p.status.toLowerCase().includes(kataKunci) : false
    return cocokLabel || cocokTcId || cocokScenario || cocokModul || cocokStatus
  })

  const itemTerpilih = pilihan.find((p) => p.nilai === nilai)

  function pilihOpsi(opt: OpsiTestCase) {
    if (opt.nonaktif) return
    onUbah(opt.nilai)
    haptic('pilih')
    setTerbuka(false)
    setCari('')
  }

  return (
    <div ref={wadahRef} className="searchable-select">
      <label className="label" htmlFor={id}>
        {label}
      </label>

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        className={`searchable-trigger ${terbuka ? 'terbuka' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={terbuka}
        onClick={() => setTerbuka((prev) => !prev)}
      >
        <div className="searchable-trigger-content">
          {itemTerpilih ? (
            itemTerpilih.nilai === '' ? (
              <div className="searchable-trigger-val">
                <span className="tag bold">Di luar scenario</span>
                <span className="searchable-trigger-desc ell c-3">Bug tidak terikat test case</span>
              </div>
            ) : (
              <div className="searchable-trigger-val">
                <span className="tag mono bold">{itemTerpilih.tcId || itemTerpilih.label}</span>
                {itemTerpilih.status && (
                  <span className={`badge b-${KUNCI_STATUS[itemTerpilih.status] || 'notrun'}`}>
                    {itemTerpilih.status}
                  </span>
                )}
                <span className="searchable-trigger-desc ell">
                  {itemTerpilih.scenario || itemTerpilih.label}
                </span>
              </div>
            )
          ) : (
            <span className="t-body c-3">Pilih test case terkait…</span>
          )}
        </div>

        <div className="searchable-chevron">
          <Icon nama="bawah" ukuran={18} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {terbuka && (
        <div className="searchable-dropdown" role="listbox">
          {/* Kotak Pencarian */}
          <div className="searchable-search-wrap">
            <Icon nama="cari" ukuran={16} />
            <input
              ref={inputRef}
              type="text"
              value={cari}
              placeholder={placeholderCari}
              onChange={(e) => setCari(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {cari && (
              <button
                type="button"
                className="searchable-clear-btn"
                aria-label="Bersihkan pencarian"
                onClick={() => setCari('')}
              >
                <Icon nama="tutup" ukuran={14} />
              </button>
            )}
          </div>

          {/* Meta Info */}
          <div className="searchable-meta">
            {hasilFilter.length} {hasilFilter.length === 1 ? 'pilihan' : 'test case'} ditemukan
          </div>

          {/* Daftar Test Case */}
          <div className="searchable-list">
            {hasilFilter.length === 0 ? (
              <div className="searchable-empty">
                <span>Tidak ada test case yang cocok dengan &quot;{cari}&quot;</span>
              </div>
            ) : (
              hasilFilter.map((opt) => {
                const terpilih = opt.nilai === nilai
                return (
                  <button
                    key={opt.nilai || '__di_luar'}
                    type="button"
                    role="option"
                    aria-selected={terpilih}
                    aria-disabled={opt.nonaktif}
                    className={`searchable-item ${terpilih ? 'terpilih' : ''} ${opt.nonaktif ? 'nonaktif' : ''}`}
                    onClick={() => pilihOpsi(opt)}
                  >
                    <div className="searchable-item-header">
                      {opt.nilai === '' ? (
                        <span className="tag bold">Di luar scenario</span>
                      ) : (
                        <>
                          <span className="tag mono bold">{opt.tcId || opt.label}</span>
                          {opt.status && (
                            <span className={`badge b-${KUNCI_STATUS[opt.status] || 'notrun'}`}>
                              {opt.status}
                            </span>
                          )}
                          {opt.modul && <span className="pil">{opt.modul}</span>}
                          {opt.nonaktif && (
                            <span className="badge b-fail">{opt.pesanNonaktif || 'Sudah ada bug'}</span>
                          )}
                        </>
                      )}

                      {terpilih && (
                        <span className="searchable-item-check">
                          <Icon nama="centang" ukuran={16} />
                        </span>
                      )}
                    </div>

                    <div className="searchable-item-desc ell">
                      {opt.scenario || opt.label}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {bantuan && <span className="help">{bantuan}</span>}
    </div>
  )
}

