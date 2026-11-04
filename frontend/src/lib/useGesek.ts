import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const AMBANG = 28 // jarak gesek minimal (px)
const JEDA_RODA = 700 // ms, supaya satu gulungan roda tidak membuka lalu menutup lagi

interface Opsi {
  isi?: RefObject<HTMLElement | null> // area daftar yang bisa digulung di dalam sheet
  roda?: boolean // ikut membaca roda mouse/trackpad
}

// Gesek ke atas membuka, gesek ke bawah menutup. Mengembalikan callback ref untuk elemen yang peka gesekan.
// Gesek ke bawah di dalam `isi` hanya menutup kalau daftar sudah di paling atas, supaya menggulung daftar tetap normal.
export function useGesek(terbuka: boolean, onUbah: (terbuka: boolean) => void, opsi: Opsi = {}) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const status = useRef({ terbuka, onUbah, isi: opsi.isi, roda: opsi.roda ?? false })

  useEffect(() => {
    status.current = { terbuka, onUbah, isi: opsi.isi, roda: opsi.roda ?? false }
  })

  useEffect(() => {
    if (!el) return
    let awalY: number | null = null
    let awalX = 0
    let awalDi: EventTarget | null = null
    let scrollAwal = 0
    let selesai = false
    let kunciSampai = 0
    let rodaTerakhir = 0
    let rodaDariAtas = true
    let barusaja = false

    const dalamIsi = (t: EventTarget | null) => {
      const isi = status.current.isi?.current
      return !!isi && t instanceof Node && isi.contains(t)
    }
    const abaikan = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, select')

    const mulai = (x: number, y: number, target: EventTarget | null) => {
      awalX = x
      awalY = y
      awalDi = target
      scrollAwal = status.current.isi?.current?.scrollTop ?? 0
      selesai = false
      barusaja = false
    }

    // Mengembalikan true kalau gesekan dipakai (agar penggulungan bawaan dibatalkan saat membuka).
    const gerak = (x: number, y: number): boolean => {
      if (awalY === null || selesai || abaikan(awalDi)) return false
      const dy = y - awalY
      // Gesekan yang dominan mendatar (mis. menggulung kartu ke samping) bukan untuk membuka/menutup.
      if (Math.abs(dy) < Math.abs(x - awalX)) return false
      const { terbuka: buka, onUbah: ubah } = status.current
      if (dy < -AMBANG && !buka) {
        selesai = barusaja = true
        ubah(true)
        return true
      }
      if (dy > AMBANG && buka && (!dalamIsi(awalDi) || scrollAwal <= 0)) {
        selesai = barusaja = true
        ubah(false)
        return true
      }
      return false
    }

    const sentuhMulai = (e: TouchEvent) => mulai(e.touches[0].clientX, e.touches[0].clientY, e.target)
    const sentuhGerak = (e: TouchEvent) => {
      if (gerak(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault()
    }
    // Seret mouse dibaca di window, supaya tetap terbaca saat kursor keluar dari area gagang.
    const mouseGerak = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') gerak(e.clientX, e.clientY)
    }
    const selesaiGesek = () => {
      awalY = null
      window.removeEventListener('pointermove', mouseGerak)
    }
    const mouseMulai = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      mulai(e.clientX, e.clientY, e.target)
      window.addEventListener('pointermove', mouseGerak)
    }
    // Seret dengan mouse tetap memicu klik di akhir; batalkan supaya gagang tidak membalik lagi.
    const klik = (e: MouseEvent) => {
      if (barusaja) {
        e.stopPropagation()
        e.preventDefault()
        barusaja = false
      }
    }
    const roda = (e: WheelEvent) => {
      if (!status.current.roda || abaikan(e.target)) return
      const sekarang = Date.now()
      // Satu rangkaian gulungan (termasuk momentum trackpad) dihitung dari posisi saat rangkaian dimulai,
      // supaya gulungan ke atas yang baru sampai di puncak halaman tidak langsung menciutkan sheet.
      if (sekarang - rodaTerakhir > 250) {
        const isi = status.current.isi?.current
        rodaDariAtas = !dalamIsi(e.target) || !isi || isi.scrollTop <= 0
      }
      rodaTerakhir = sekarang
      if (sekarang < kunciSampai) return
      const { terbuka: buka, onUbah: ubah } = status.current
      if (e.deltaY > 20 && !buka) {
        kunciSampai = sekarang + JEDA_RODA
        ubah(true)
        e.preventDefault()
      } else if (e.deltaY < -20 && buka && rodaDariAtas) {
        kunciSampai = sekarang + JEDA_RODA
        ubah(false)
      }
    }

    el.addEventListener('touchstart', sentuhMulai, { passive: true })
    el.addEventListener('touchmove', sentuhGerak, { passive: false })
    el.addEventListener('touchend', selesaiGesek)
    el.addEventListener('touchcancel', selesaiGesek)
    el.addEventListener('pointerdown', mouseMulai)
    window.addEventListener('pointerup', selesaiGesek)
    el.addEventListener('click', klik, true)
    el.addEventListener('wheel', roda, { passive: false })
    return () => {
      el.removeEventListener('touchstart', sentuhMulai)
      el.removeEventListener('touchmove', sentuhGerak)
      el.removeEventListener('touchend', selesaiGesek)
      el.removeEventListener('touchcancel', selesaiGesek)
      el.removeEventListener('pointerdown', mouseMulai)
      window.removeEventListener('pointermove', mouseGerak)
      window.removeEventListener('pointerup', selesaiGesek)
      el.removeEventListener('click', klik, true)
      el.removeEventListener('wheel', roda)
    }
  }, [el])

  return useCallback((node: HTMLElement | null) => setEl(node), [])
}
