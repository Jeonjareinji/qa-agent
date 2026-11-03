// Pemetaan status dan severity ke ikon serta nama kelas CSS.
import type { Severity, StatusKasus } from '../data/dummy.ts'
import type { NamaIkon } from './iconPaths.ts'

export const IKON_STATUS: Record<StatusKasus, NamaIkon> = {
  Pass: 'centangBulat',
  Fail: 'silangBulat',
  Blocked: 'minusBulat',
  'N/A': 'larang',
  'Not Run': 'lingkaran',
}

export const KUNCI_STATUS: Record<StatusKasus, string> = {
  Pass: 'pass',
  Fail: 'fail',
  Blocked: 'blocked',
  'N/A': 'na',
  'Not Run': 'notrun',
}

export const KUNCI_SEVERITY: Record<Severity, string> = {
  Critical: 'critical',
  Major: 'major',
  Minor: 'minor',
  Trivial: 'trivial',
}
