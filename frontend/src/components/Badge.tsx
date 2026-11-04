import type { ReactNode } from 'react'
import type { Severity, StatusBug, StatusExecution, StatusKasus } from '../data/dummy.ts'
import { KUNCI_SEVERITY, KUNCI_STATUS } from './statusInfo.ts'

export function StatusBadge({ status }: { status: StatusKasus }) {
  return <span className={'badge b-' + KUNCI_STATUS[status]}>{status}</span>
}

export function SeverityBadge({ severity, teks, mono }: { severity: Severity; teks?: string; mono?: boolean }) {
  return <span className={'badge s-' + KUNCI_SEVERITY[severity] + (mono ? ' mono' : '')}>{teks ?? severity}</span>
}

const KELAS_STATUS_BUG: Record<StatusBug, string> = {
  Open: 'b-fail',
  'In Progress': 'b-blocked',
  Resolved: 'b-pass',
  Closed: 'b-notrun',
}

export function StatusBugBadge({ status }: { status: StatusBug }) {
  return <span className={'badge ' + KELAS_STATUS_BUG[status]}>{status}</span>
}

const LABEL_EXECUTION: Record<StatusExecution, { label: string; kelas: string }> = {
  belum: { label: 'Belum mulai', kelas: 'b-notrun' },
  berjalan: { label: 'Berjalan', kelas: 'b-primary' },
  selesai: { label: 'Selesai', kelas: 'b-pass' },
}

export function ExecutionBadge({ status }: { status: StatusExecution }) {
  const info = LABEL_EXECUTION[status]
  return <span className={'badge ' + info.kelas}>{info.label}</span>
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}

export function Pil({ children }: { children: ReactNode }) {
  return <span className="pil">{children}</span>
}
