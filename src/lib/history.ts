import { normalizePlate } from './checker.ts'
import { GOV_API, loadGovResult, LookupError, resourceUpdatedAt } from './govil.ts'

export const OWNERSHIP_RESOURCE = 'bb2355dc-9ec7-4f06-9c3f-3344672171da'
export const MILEAGE_RESOURCE = '56063a99-8a3e-4ff4-912e-5966c0279bad'
export const HISTORY_SOURCE_URL = 'https://data.gov.il/he/datasets/ministry_of_transport/shinui_mivne'

export interface OwnershipEntry {
  id: string
  period: string | null
  ownership: string | null
}
export interface MileageRecord {
  kilometers: number | null
  firstRegistration: string | null
  origin: string | null
  structuralChange: boolean | null
  gasConversion: boolean | null
  colorChange: boolean | null
  tyreChange: boolean | null
}
export interface HistoryReport<T> {
  items: T[]
  checkedAt: string
  dataUpdatedAt?: string
  truncated: boolean
}

function invalid(): never { throw new LookupError('upstream_invalid', 502) }
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function identifier(value: unknown): string {
  if (typeof value !== 'number' && typeof value !== 'string') return invalid()
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) return invalid()
  return String(value)
}
function nullableText(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return invalid()
  return value.trim() || null
}
function period(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string' && typeof value !== 'number') return invalid()
  const raw = String(value)
  if (!/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(raw)) return invalid()
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}
function flag(value: unknown): boolean | null {
  if (value === null) return null
  if (value === 0 || value === '0') return false
  if (value === 1 || value === '1') return true
  return invalid()
}

async function historyRows<T>(
  plateInput: string, resource: string, selected: string[],
  parse: (row: Record<string, unknown>) => T,
  request: typeof fetch, signal?: AbortSignal,
): Promise<HistoryReport<T>> {
  const plate = normalizePlate(plateInput)
  const deadline = AbortSignal.timeout(15_000)
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline
  const fields = ['_id', 'mispar_rechev', ...selected]
  const items: T[] = []
  const ids = new Set<string>()
  let offset = 0
  let previousTotal: number | undefined
  let previousEstimated: boolean | undefined
  let truncated = false
  while (true) {
    const url = new URL(GOV_API)
    url.search = new URLSearchParams({
      resource_id: resource, filters: JSON.stringify({ mispar_rechev: Number(plate) }),
      fields: fields.join(','), sort: '_id asc', limit: '100', offset: String(offset), include_total: 'true',
    }).toString()
    const result = await loadGovResult(url, request, combined)
    const responseFields = result.fields
    if (result.resource_id !== resource || !Array.isArray(responseFields)
      || !fields.every(field => responseFields.some(entry => isRecord(entry) && entry.id === field))
      || !Array.isArray(result.records) || result.records.length > 100
      || typeof result.total !== 'number' || !Number.isSafeInteger(result.total) || result.total < 0
      || typeof result.total_was_estimated !== 'boolean'
      || result.offset !== undefined && result.offset !== offset) return invalid()
    if (previousTotal !== undefined && (previousTotal !== result.total || previousEstimated !== result.total_was_estimated)) return invalid()
    previousTotal = result.total
    previousEstimated = result.total_was_estimated
    for (const row of result.records) {
      if (!isRecord(row) || identifier(row.mispar_rechev) !== plate
        || ids.has(identifier(row._id))) return invalid()
      ids.add(identifier(row._id))
      items.push(parse(row))
    }
    offset += result.records.length
    if (!result.total_was_estimated && offset > result.total) return invalid()
    if (result.records.length === 0) {
      if (!result.total_was_estimated && offset < result.total || offset === 0 && result.total > 0) return invalid()
      break
    }
    if (!result.total_was_estimated && offset === result.total) break
    if (offset >= 1000) { truncated = true; break }
  }
  const dataUpdatedAt = await resourceUpdatedAt(resource, request, combined)
  return { items, checkedAt: new Date().toISOString(), dataUpdatedAt, truncated }
}

export async function lookupOwnership(plate: string, request: typeof fetch = fetch, signal?: AbortSignal): Promise<HistoryReport<OwnershipEntry>> {
  const report = await historyRows(plate, OWNERSHIP_RESOURCE, ['baalut_dt', 'baalut'], row => ({
    id: String(row._id), period: period(row.baalut_dt), ownership: nullableText(row.baalut),
  }), request, signal)
  // Keep separate source rows, even if two transfers share the same month/type.
  report.items.sort((a, b) => (a.period ?? '9999').localeCompare(b.period ?? '9999'))
  return report
}

export async function lookupMileage(plate: string, request: typeof fetch = fetch, signal?: AbortSignal): Promise<HistoryReport<MileageRecord>> {
  const report = await historyRows(plate, MILEAGE_RESOURCE, [
    'kilometer_test_aharon', 'rishum_rishon_dt', 'mkoriut_nm',
    'shinui_mivne_ind', 'gapam_ind', 'shnui_zeva_ind', 'shinui_zmig_ind',
  ], row => {
    const km = row.kilometer_test_aharon
    if (km !== null && (typeof km !== 'number' && typeof km !== 'string' || !/^\d+$/.test(String(km)) || !Number.isSafeInteger(Number(km)))) return invalid()
    return {
      kilometers: km === null ? null : Number(km), firstRegistration: nullableText(row.rishum_rishon_dt),
      origin: nullableText(row.mkoriut_nm), structuralChange: flag(row.shinui_mivne_ind),
      gasConversion: flag(row.gapam_ind), colorChange: flag(row.shnui_zeva_ind), tyreChange: flag(row.shinui_zmig_ind),
    }
  }, request, signal)
  // This feed is a latest-test snapshot, not dated annual readings.
  if (report.items.length > 1 || report.truncated) return invalid()
  return report
}
