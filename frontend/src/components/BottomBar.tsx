import type { ReactNode } from 'react'

export function BottomBar({ dua, petunjuk, children }: { dua?: boolean; petunjuk?: string; children: ReactNode }) {
  return (
    <footer className={dua ? 'bottombar dua' : 'bottombar'}>
      {petunjuk && <div className="petunjuk c-warn w6">{petunjuk}</div>}
      {children}
    </footer>
  )
}
