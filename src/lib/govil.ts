import { normalizePlate, normalizeVin, InputError } from './checker.ts'

// Same CKAN resource and plate-to-misgeret mapping used by CarAgent/src/enrich/govil.ts.
export const ACTIVE_RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3'
export const GOV_API = 'https://data.gov.il/api/3/action/datastore_search'
const fields = ['mispar_rechev', 'misgeret', 'tozeret_nm', 'degem_nm', 'degem_cd', 'tozeret_cd', 'ramat_gimur', 'shnat_yitzur', 'horaat_rishum', 'kinuy_mishari', 'baalut', 'moed_aliya_lakvish', 'mivchan_acharon_dt']

export class LookupError extends Error {
  code: string
  status: number
  constructor(code: string, status: number) {
    super(code)
    this.name = 'LookupError'
    this.code = code
    this.status = status
  }
}

export interface Vehicle {
  vin: string
  make: string | null
  model: string | null
  trim: string | null
  year: number | null
  modelCode: string | null
  directive: string | null
  currentOwnership: string | null
  firstRoadDate: string | null
  lastTestDate: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : null
}

export async function loadGovResult(url: URL, request: typeof fetch, signal: AbortSignal): Promise<Record<string, unknown>> {
  try {
    signal.throwIfAborted()
    const response = await request(url, {
      signal, headers: { accept: 'application/json' },
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new LookupError('upstream_unavailable', 502)
    const body: unknown = await response.json()
    signal.throwIfAborted()
    if (!isRecord(body) || body.success !== true || !isRecord(body.result)) throw new LookupError('upstream_invalid', 502)
    return body.result
  } catch (error) {
    if (signal.aborted || error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new LookupError('upstream_timeout', 504)
    if (error instanceof TypeError) throw new LookupError('upstream_unavailable', 502)
    if (error instanceof SyntaxError) throw new LookupError('upstream_invalid', 502)
    throw error
  }
}

export async function resourceUpdatedAt(id: string, request: typeof fetch, signal: AbortSignal): Promise<string | undefined> {
  const url = new URL('https://data.gov.il/api/3/action/resource_show')
  url.searchParams.set('id', id)
  const metadata = await loadGovResult(url, request, signal)
  const updated = metadata.last_modified
  if (metadata.id !== id || updated !== undefined && updated !== null && (typeof updated !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(updated)
    || !Number.isFinite(Date.parse(updated)))) throw new LookupError('upstream_invalid', 502)
  return typeof updated === 'string' ? updated : undefined
}

export async function lookupPlate(input: string, request: typeof fetch = fetch, signal?: AbortSignal): Promise<Vehicle> {
  const plate = normalizePlate(input)
  const url = new URL(GOV_API)
  url.searchParams.set('resource_id', ACTIVE_RESOURCE)
  url.searchParams.set('filters', JSON.stringify({ mispar_rechev: Number(plate) }))
  url.searchParams.set('fields', fields.join(','))
  url.searchParams.set('limit', '2')
  let response: Response
  try {
    response = await request(url, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
      headers: { accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new LookupError('upstream_timeout', 504)
    if (error instanceof TypeError) throw new LookupError('upstream_unavailable', 502)
    throw error
  }
  if (!response.ok) throw new LookupError('upstream_unavailable', 502)
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) throw new LookupError('upstream_invalid', 502)
    throw error
  }
  if (!isRecord(body) || body.success !== true || !isRecord(body.result) || !Array.isArray(body.result.records)) {
    throw new LookupError('upstream_invalid', 502)
  }
  const records: unknown[] = body.result.records
  if (records.length === 0) throw new LookupError('plate_not_found', 404)
  if (records.length !== 1 || !isRecord(records[0])) throw new LookupError('upstream_invalid', 502)
  const record = records[0]
  if (String(record.mispar_rechev) !== plate) throw new LookupError('upstream_invalid', 502)
  const rawVin = text(record.misgeret)
  if (!rawVin) throw new LookupError('vin_unavailable', 422)
  let vin: string
  try {
    vin = normalizeVin(rawVin)
  } catch (error) {
    if (error instanceof InputError) throw new LookupError('vin_unavailable', 422)
    throw error
  }
  const year = Number(record.shnat_yitzur)
  return {
    vin, make: text(record.tozeret_nm), model: text(record.kinuy_mishari) ?? text(record.degem_nm),
    trim: text(record.ramat_gimur), year: Number.isInteger(year) && year > 1900 ? year : null,
    modelCode: text(record.degem_cd), directive: text(record.horaat_rishum),
    currentOwnership: text(record.baalut), firstRoadDate: text(record.moed_aliya_lakvish),
    lastTestDate: text(record.mivchan_acharon_dt),
  }
}
