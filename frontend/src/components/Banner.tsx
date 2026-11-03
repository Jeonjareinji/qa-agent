import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { NamaIkon } from './iconPaths.ts'

const IKON_JENIS: Record<'info' | 'success' | 'warn' | 'error', NamaIkon> = {
  info: 'info',
  success: 'centangBulat',
  warn: 'peringatan',
  error: 'alertBulat',
}

export function Banner({
  jenis,
  ikon,
  children,
}: {
  jenis: 'info' | 'success' | 'warn' | 'error'
  ikon?: NamaIkon
  children: ReactNode
}) {
  return (
    <div className={'banner bn-' + jenis}>
      <Icon nama={ikon ?? IKON_JENIS[jenis]} />
      <div className="grow col col-4">{children}</div>
    </div>
  )
}
