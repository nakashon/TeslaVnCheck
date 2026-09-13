import { normalizeVin } from './checker.ts'
import type { RegistrationEvidence, Replacement, Variant } from './checker.ts'
import { isBatteryEvidence } from './battery-presentation.ts'
import type { BatteryEvidence } from './battery-presentation.ts'
import { tagReportLink } from './analytics-policy.ts'

export interface SharedReport {
  version: 1 | 2 | 3
  prefix: string
  variant: Variant
  replacement: Replacement
  createdAt: string
  recall: { count: number; checkedAt: string; truncated: boolean } | null
  registration?: RegistrationEvidence
  batteryEvidence?: BatteryEvidence
}

export function createReport(vin: string, variant: Variant, replacement: Replacement, recall: SharedReport['recall'] = null, registration: RegistrationEvidence | null = null, batteryEvidence: BatteryEvidence = 'unknown'): SharedReport {
  if (!isBatteryEvidence(batteryEvidence) || (batteryEvidence.startsWith('replacement-') && replacement !== 'yes')) throw new Error('invalid_battery_evidence')
  return {
    version: 3, prefix: normalizeVin(vin).slice(0, 11), variant, replacement, batteryEvidence, createdAt: new Date().toISOString(), recall,
    ...(registration ? { registration: { year: registration.year, drive: registration.drive } } : {}),
  }
}

export function reportLink(report: SharedReport, base: string): string {
  const url = new URL(base)
  tagReportLink(url)
  url.hash = `report=${btoa(JSON.stringify(report)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`
  return url.href
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.UTC(2020, 0, 1) && Date.parse(value) <= Date.now() + 86_400_000
}

export function parseReport(hash: string): SharedReport | null {
  if (!hash.startsWith('#report=')) return null
  const encoded = hash.slice(8)
  if (encoded.length > 1800 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('invalid_report')
  const value: unknown = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3) || typeof value.prefix !== 'string' ||
    value.prefix.length !== 11 || normalizeVin(value.prefix + '000000').slice(0, 11) !== value.prefix ||
    !['unknown', 'Y7CR', 'other'].includes(String(value.variant)) ||
    !['unknown', 'no', 'yes'].includes(String(value.replacement)) || !validDate(value.createdAt)) {
    throw new Error('invalid_report')
  }
  if (value.variant !== 'unknown' && value.variant !== 'Y7CR' && value.variant !== 'other') throw new Error('invalid_report')
  if (value.replacement !== 'unknown' && value.replacement !== 'no' && value.replacement !== 'yes') throw new Error('invalid_report')
  let batteryEvidence: BatteryEvidence | undefined
  if (value.version === 3) {
    if (!isBatteryEvidence(value.batteryEvidence) ||
      (value.batteryEvidence.startsWith('replacement-') && value.replacement !== 'yes')) throw new Error('invalid_report')
    batteryEvidence = value.batteryEvidence
  } else if (value.batteryEvidence !== undefined) throw new Error('invalid_report')
  let recall: SharedReport['recall'] = null
  if (value.recall !== null) {
    if (!isRecord(value.recall) || typeof value.recall.count !== 'number' || !Number.isInteger(value.recall.count) ||
      value.recall.count < 0 || value.recall.count > 10000 || !validDate(value.recall.checkedAt) ||
      typeof value.recall.truncated !== 'boolean' || Date.parse(value.recall.checkedAt) > Date.parse(value.createdAt)) {
      throw new Error('invalid_report')
    }
    recall = { count: value.recall.count, checkedAt: value.recall.checkedAt, truncated: value.recall.truncated }
  }
  let registration: RegistrationEvidence | undefined
  if (value.registration !== undefined) {
    const raw = value.registration
    if (value.version === 1 || !isRecord(raw) ||
      (raw.year !== null && (typeof raw.year !== 'number' || !Number.isInteger(raw.year) || raw.year < 1900 || raw.year > 2099)) ||
      (raw.drive !== 'rwd' && raw.drive !== 'awd' && raw.drive !== 'unknown')) throw new Error('invalid_report')
    registration = { year: raw.year, drive: raw.drive }
  }
  return { version: value.version, prefix: value.prefix, variant: value.variant, replacement: value.replacement, createdAt: value.createdAt, recall, ...(registration ? { registration } : {}), ...(batteryEvidence ? { batteryEvidence } : {}) }
}

export function readInitialReport(hash: string): { report: SharedReport | null; invalid: boolean } {
  try {
    return { report: parseReport(hash), invalid: false }
  } catch {
    // A malformed public share link must remain an explicit error, not a clean assessment.
    return { report: null, invalid: true }
  }
}
