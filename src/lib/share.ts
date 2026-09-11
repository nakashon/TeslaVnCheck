import { normalizeVin } from './checker.ts'
import type { Replacement, Variant } from './checker.ts'

export interface SharedReport {
  version: 1
  prefix: string
  variant: Variant
  replacement: Replacement
  createdAt: string
  recall: { count: number; checkedAt: string; truncated: boolean } | null
}

export function createReport(vin: string, variant: Variant, replacement: Replacement, recall: SharedReport['recall'] = null): SharedReport {
  return { version: 1, prefix: normalizeVin(vin).slice(0, 11), variant, replacement, createdAt: new Date().toISOString(), recall }
}

export function reportLink(report: SharedReport, base: string): string {
  const url = new URL(base)
  url.search = ''
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
  if (!isRecord(value) || value.version !== 1 || typeof value.prefix !== 'string' ||
    value.prefix.length !== 11 || normalizeVin(value.prefix + '000000').slice(0, 11) !== value.prefix ||
    !['unknown', 'Y7CR', 'other'].includes(String(value.variant)) ||
    !['unknown', 'no', 'yes'].includes(String(value.replacement)) || !validDate(value.createdAt)) {
    throw new Error('invalid_report')
  }
  if (value.variant !== 'unknown' && value.variant !== 'Y7CR' && value.variant !== 'other') throw new Error('invalid_report')
  if (value.replacement !== 'unknown' && value.replacement !== 'no' && value.replacement !== 'yes') throw new Error('invalid_report')
  let recall: SharedReport['recall'] = null
  if (value.recall !== null) {
    if (!isRecord(value.recall) || typeof value.recall.count !== 'number' || !Number.isInteger(value.recall.count) ||
      value.recall.count < 0 || value.recall.count > 10000 || !validDate(value.recall.checkedAt) ||
      typeof value.recall.truncated !== 'boolean' || Date.parse(value.recall.checkedAt) > Date.parse(value.createdAt)) {
      throw new Error('invalid_report')
    }
    recall = { count: value.recall.count, checkedAt: value.recall.checkedAt, truncated: value.recall.truncated }
  }
  return { version: 1, prefix: value.prefix, variant: value.variant, replacement: value.replacement, createdAt: value.createdAt, recall }
}

export function readInitialReport(hash: string): { report: SharedReport | null; invalid: boolean } {
  try {
    return { report: parseReport(hash), invalid: false }
  } catch {
    // A malformed public share link must remain an explicit error, not a clean assessment.
    return { report: null, invalid: true }
  }
}
