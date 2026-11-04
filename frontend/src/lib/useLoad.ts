import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export const FokusLayar = createContext(true)

export interface Muatan<T> {
  data: T | null
  galat: string | null
  memuat: boolean
  muatUlang: () => void
}

// Memuat data async dari lapisan api. `kunci` menentukan kapan data dimuat ulang.
// Saat layar di bawah tumpukan kembali aktif di teratas, data disegarkan di latar tanpa menghapus state layar.
export function useLoad<T>(kunci: string, pemuat: () => Promise<T>): Muatan<T> {
  const fokus = useContext(FokusLayar)
  const pemuatRef = useRef(pemuat)
  const pernahFokus = useRef(fokus)
  const [data, setData] = useState<T | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [putaran, setPutaran] = useState(0)

  useEffect(() => {
    pemuatRef.current = pemuat
  })

  useEffect(() => {
    if (fokus && !pernahFokus.current) {
      setPutaran((n) => n + 1)
    }
    pernahFokus.current = fokus
  }, [fokus])

  useEffect(() => {
    let hidup = true
    pemuatRef
      .current()
      .then((hasil) => {
        if (!hidup) return
        setData(hasil)
        setGalat(null)
      })
      .catch((e: unknown) => {
        if (hidup) setGalat(e instanceof Error ? e.message : 'Terjadi kesalahan.')
      })
    return () => {
      hidup = false
    }
  }, [kunci, putaran])

  const muatUlang = useCallback(() => setPutaran((n) => n + 1), [])
  return { data, galat, memuat: data === null && galat === null, muatUlang }
}
