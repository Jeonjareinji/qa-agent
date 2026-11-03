// Pembungkus tunggal untuk Telegram WebApp.
// Di browser biasa (tanpa Telegram) semua fungsi jatuh balik ke perilaku browser supaya bisa dites.

interface TelegramWebApp {
  initData?: string
  platform?: string
  initDataUnsafe?: { user?: { first_name?: string } }
  ready(): void
  expand(): void
  close(): void
  showAlert(pesan: string, callback?: () => void): void
  showConfirm(pesan: string, callback: (ok: boolean) => void): void
  HapticFeedback?: {
    impactOccurred(gaya: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(jenis: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export type JenisHaptic = 'ringan' | 'pilih' | 'sukses' | 'gagal'

// Skrip telegram-web-app.js membuat objek WebApp juga di luar Telegram, jadi cek initData.
function webApp(): TelegramWebApp | undefined {
  const app = window.Telegram?.WebApp
  return app && app.initData ? app : undefined
}

export function ready(): void {
  window.Telegram?.WebApp?.ready()
}

export function expand(): void {
  window.Telegram?.WebApp?.expand()
}

export function close(): void {
  const app = webApp()
  if (app) app.close()
  else window.close()
}

export function showAlert(pesan: string): Promise<void> {
  const app = webApp()
  if (!app) {
    window.alert(pesan)
    return Promise.resolve()
  }
  return new Promise((selesai) => app.showAlert(pesan, () => selesai()))
}

export function showConfirm(pesan: string): Promise<boolean> {
  const app = webApp()
  if (!app) return Promise.resolve(window.confirm(pesan))
  return new Promise((selesai) => app.showConfirm(pesan, (ok) => selesai(ok)))
}

export function haptic(jenis: JenisHaptic = 'ringan'): void {
  const umpan = webApp()?.HapticFeedback
  if (!umpan) return
  if (jenis === 'pilih') umpan.selectionChanged()
  else if (jenis === 'sukses') umpan.notificationOccurred('success')
  else if (jenis === 'gagal') umpan.notificationOccurred('error')
  else umpan.impactOccurred('light')
}

// HANYA untuk tampilan sapaan. Jangan dipakai untuk keputusan keamanan.
// TODO backend: identitas pengguna harus diambil dari validasi initData di server.
export function namaPengguna(): string {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Pengguna Demo'
}
