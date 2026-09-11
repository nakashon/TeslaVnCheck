import { normalizePlate } from './checker.ts'
import { GOV_API, LookupError, loadGovResult, resourceUpdatedAt } from './govil.ts'

export const RECALL_RESOURCE = '36bf1404-0be4-49d2-82dc-2f1ead4a8b93'
export const RECALL_SOURCE_URL = `https://data.gov.il/dataset/9a7bd490-2daf-4168-b930-665981e54250/resource/${RECALL_RESOURCE}`
const fields = ['_id', 'MISPAR_RECHEV', 'RECALL_ID', 'TEUR_TAKALA', 'TAARICH_PTICHA', 'SUG_TAKALA']
const pageSize = 100
const maximumRecords = 1_000

export interface RecallItem {
  id: string
  description: string | null
  openedAt: string | null
  faultType: string | null
}

export interface RecallReport {
  items: RecallItem[]
  checkedAt: string
  truncated: boolean
  dataUpdatedAt?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(): never {
  throw new LookupError('upstream_invalid', 502)
}

function positiveId(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value
  return invalid()
}

function nullableText(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return invalid()
  return value.trim() || null
}

/**
 * Records in the official "vehicles that have not performed a recall" dataset.
 * An empty report is not a safety clearance. Dates remain in the source format.
 */
export async function lookupRecalls(plate: string, request: typeof fetch = fetch, signal?: AbortSignal): Promise<RecallReport> {
  const normalizedPlate = normalizePlate(plate)
  const deadline = AbortSignal.timeout(15_000)
  const combinedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline
  const items = new Map<string, RecallItem>()
  const rowIds = new Set<string>()
  let offset = 0
  let expectedTotal: number | undefined
  let expectedEstimated: boolean | undefined
  let truncated = false

  while (true) {
    const url = new URL(GOV_API)
    url.searchParams.set('resource_id', RECALL_RESOURCE)
    url.searchParams.set('filters', JSON.stringify({ MISPAR_RECHEV: Number(normalizedPlate) }))
    url.searchParams.set('fields', fields.join(','))
    url.searchParams.set('sort', '_id asc')
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('include_total', 'true')
    const result = await loadGovResult(url, request, combinedSignal)
    const responseFields = result.fields
    if (result.resource_id !== RECALL_RESOURCE || !Array.isArray(responseFields)
      || !fields.every(field => responseFields.some((entry: unknown) => isRecord(entry) && entry.id === field))
      || !Array.isArray(result.records) || result.records.length > pageSize
      || typeof result.total !== 'number' || !Number.isSafeInteger(result.total) || result.total < 0
      || typeof result.total_was_estimated !== 'boolean'
      || result.offset !== undefined && result.offset !== offset) return invalid()
    const total = result.total
    const estimated = result.total_was_estimated
    // Refuse a changing result set rather than silently skipping rows during pagination.
    if (expectedTotal !== undefined && (total !== expectedTotal || estimated !== expectedEstimated)) return invalid()
    expectedTotal = total
    expectedEstimated = estimated
    for (const raw of result.records) {
      if (!isRecord(raw) || positiveId(raw.MISPAR_RECHEV) !== normalizedPlate) return invalid()
      const rowId = positiveId(raw._id)
      if (rowIds.has(rowId)) return invalid()
      rowIds.add(rowId)
      const item: RecallItem = {
        id: positiveId(raw.RECALL_ID),
        description: nullableText(raw.TEUR_TAKALA),
        openedAt: nullableText(raw.TAARICH_PTICHA),
        faultType: nullableText(raw.SUG_TAKALA),
      }
      const previous = items.get(item.id)
      if (previous && JSON.stringify(previous) !== JSON.stringify(item)) return invalid()
      items.set(item.id, item)
    }
    offset += result.records.length
    if (!estimated && offset > total) return invalid()
    if (result.records.length === 0) {
      if (!estimated && offset < total || offset === 0 && total > 0) return invalid()
      break
    }
    if (!estimated && offset === total) break
    if (offset >= maximumRecords) {
      truncated = true
      break
    }
    // Estimated totals and short pages are not proof that there are no more records.
  }

  const updated = await resourceUpdatedAt(RECALL_RESOURCE, request, combinedSignal)
  return {
    items: [...items.values()],
    checkedAt: new Date().toISOString(),
    truncated,
    ...(typeof updated === 'string' ? { dataUpdatedAt: updated } : {}),
  }
}
