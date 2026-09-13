import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupPlate, LookupError, ACTIVE_RESOURCE, ACTIVE_SOURCE_URL } from '../src/lib/govil.ts'

const record = { mispar_rechev: 12345678, misgeret: 'XP7YGCFR0PB000001', tozeret_nm: 'Tesla Germany', kinuy_mishari: 'MODEL Y', shnat_yitzur: 2023, degem_cd: 163, horaat_rishum: 230432, baalut: 'פרטי', moed_aliya_lakvish: '2023-05', mivchan_acharon_dt: '2026-05-10' }
const mock = (body: unknown, status = 200): typeof fetch => async () => new Response(JSON.stringify(body), { status })
const errorCode = (code: string) => (error: unknown) => error instanceof LookupError && error.code === code

test('vehicle source links to the current Hebrew public dataset page', () => {
  assert.equal(ACTIVE_SOURCE_URL, 'https://data.gov.il/he/datasets/ministry_of_transport/private-and-commercial-vehicles')
})

test('uses CarAgent resource, VIN mapping, minimal fields and privacy-preserving browser options', async () => {
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'data.gov.il')
    assert.equal(url.searchParams.get('resource_id'), ACTIVE_RESOURCE)
    assert.deepEqual(JSON.parse(url.searchParams.get('filters') ?? ''), { mispar_rechev: 12345678 })
    assert.ok(url.searchParams.get('fields')?.includes('misgeret'))
    assert.ok(url.searchParams.get('fields')?.includes('baalut'))
    assert.ok(url.searchParams.get('fields')?.includes('mivchan_acharon_dt'))
    assert.equal(options?.credentials, 'omit')
    assert.equal(options?.cache, 'no-store')
    assert.equal(options?.referrerPolicy, 'no-referrer')
    return new Response(JSON.stringify({ success: true, result: { records: [record] } }))
  }
  const result = await lookupPlate('123-45-678', request)
  assert.equal(result.vin, record.misgeret)
  assert.equal(result.modelCode, '163')
  assert.equal(result.directive, '230432')
  assert.equal(result.currentOwnership, 'פרטי')
  assert.equal(result.firstRoadDate, '2023-05')
  assert.equal(result.lastTestDate, '2026-05-10')
})
test('empty results differ from upstream failures', async () => {
  await assert.rejects(lookupPlate('12345678', mock({ success: true, result: { records: [] } })), errorCode('plate_not_found'))
  await assert.rejects(lookupPlate('12345678', mock({}, 503)), errorCode('upstream_unavailable'))
  await assert.rejects(lookupPlate('12345678', mock({ success: false })), errorCode('upstream_invalid'))
})
test('duplicate, mismatched and malformed records cannot become successful lookups', async () => {
  for (const records of [[null], [record, record], [{ ...record, mispar_rechev: 7777777 }]]) {
    await assert.rejects(lookupPlate('12345678', mock({ success: true, result: { records } })), errorCode('upstream_invalid'))
  }
  for (const misgeret of [null, '', 'NOT-A-VIN']) {
    await assert.rejects(lookupPlate('12345678', mock({ success: true, result: { records: [{ ...record, misgeret }] } })), errorCode('vin_unavailable'))
  }
})
test('timeouts, malformed JSON and CORS/network failures are surfaced', async () => {
  const offline: typeof fetch = async () => { throw new TypeError('fetch failed') }
  const timeout: typeof fetch = async () => { throw new DOMException('timed out', 'TimeoutError') }
  const invalid: typeof fetch = async () => new Response('not json')
  await assert.rejects(lookupPlate('12345678', offline), errorCode('upstream_unavailable'))
  await assert.rejects(lookupPlate('12345678', timeout), errorCode('upstream_timeout'))
  await assert.rejects(lookupPlate('12345678', invalid), errorCode('upstream_invalid'))
})
test('cancellation reaches the network request', async () => {
  const controller = new AbortController()
  controller.abort()
  const request: typeof fetch = async (_input, options) => {
    assert.equal(options?.signal?.aborted, true)
    throw new DOMException('aborted', 'AbortError')
  }
  await assert.rejects(lookupPlate('12345678', request, controller.signal), errorCode('upstream_timeout'))
})
