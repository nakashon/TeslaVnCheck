import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupMileage, lookupOwnership, OWNERSHIP_RESOURCE, MILEAGE_RESOURCE } from '../src/lib/history.ts'
import { LookupError } from '../src/lib/govil.ts'

const plate = 12345678
const owner = { _id: 1, mispar_rechev: plate, baalut_dt: 202305, baalut: 'פרטי' }
const mileage = { _id: 1, mispar_rechev: plate, kilometer_test_aharon: 54321, rishum_rishon_dt: '2023-05', mkoriut_nm: 'פרטי', shinui_mivne_ind: 0, gapam_ind: null, shnui_zeva_ind: 1, shinui_zmig_ind: 0 }
const invalid = (error: unknown) => error instanceof LookupError && error.code === 'upstream_invalid'
function mock(rows: unknown[], extra: Record<string, unknown> = {}): typeof fetch {
  return async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('resource_show')) return Response.json({ success: true, result: { id: url.searchParams.get('id'), last_modified: '2026-09-11T02:35:07.593510' } })
    return Response.json({ success: true, result: {
      resource_id: url.searchParams.get('resource_id'),
      fields: (url.searchParams.get('fields') ?? '').split(',').map(id => ({ id })),
      records: rows, total: rows.length, total_was_estimated: false, ...extra,
    } })
  }
}

test('ownership keeps every row, sorts months, and never assigns exact days or hand counts', async () => {
  const report = await lookupOwnership(String(plate), mock([
    { ...owner, _id: 3, baalut_dt: 202501 },
    { ...owner, _id: 2 },
    owner,
  ]))
  assert.deepEqual(report.items.map(row => row.period), ['2023-05', '2023-05', '2025-01'])
  assert.equal(report.items.length, 3)
  assert.equal(report.truncated, false)
  assert.ok(report.dataUpdatedAt)
  assert.ok(!JSON.stringify(report).includes(String(plate)))
})
test('history transport uses minimal fields and exact plate filters without credentials or referrer', async () => {
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    assert.equal(options?.credentials, 'omit')
    assert.equal(options?.cache, 'no-store')
    assert.equal(options?.referrerPolicy, 'no-referrer')
    if (url.pathname.endsWith('datastore_search')) {
      assert.equal(url.searchParams.get('resource_id'), OWNERSHIP_RESOURCE)
      assert.deepEqual(JSON.parse(url.searchParams.get('filters') ?? ''), { mispar_rechev: plate })
      assert.equal(url.searchParams.get('sort'), '_id asc')
      assert.ok(!url.searchParams.get('fields')?.includes('mispar_manoa'))
    }
    return mock([owner])(input, options)
  }
  await lookupOwnership('123-45-678', request)
})
test('empty records, missing values and zero mileage stay distinct', async () => {
  assert.deepEqual((await lookupOwnership(String(plate), mock([]))).items, [])
  assert.deepEqual((await lookupMileage(String(plate), mock([]))).items, [])
  const missing = (await lookupMileage(String(plate), mock([{ ...mileage, kilometer_test_aharon: null }]))).items[0]
  assert.equal(missing.kilometers, null)
  const zero = (await lookupMileage(String(plate), mock([{ ...mileage, kilometer_test_aharon: 0 }]))).items[0]
  assert.equal(zero.kilometers, 0)
  const unknown = (await lookupOwnership(String(plate), mock([{ ...owner, baalut_dt: null, baalut: null }]))).items[0]
  assert.equal(unknown.period, null)
  assert.equal(unknown.ownership, null)
})
test('mileage is only the latest cumulative snapshot, never reconstructed annual readings', async () => {
  const report = await lookupMileage(String(plate), mock([mileage]))
  assert.deepEqual(report.items[0], {
    kilometers: 54321, firstRegistration: '2023-05', origin: 'פרטי',
    structuralChange: false, gasConversion: null, colorChange: true, tyreChange: false,
  })
  assert.equal(report.items.length, 1)
  await assert.rejects(lookupMileage(String(plate), mock([mileage, { ...mileage, _id: 2 }])), invalid)
})
test('rejects malformed dates, mismatched plates, repeated rows and malformed payloads', async () => {
  for (const row of [
    null, { ...owner, mispar_rechev: 99999999 }, { ...owner, mispar_rechev: [plate] },
    { ...owner, _id: [1] }, { ...owner, baalut_dt: 202313 }, { ...owner, baalut_dt: '2023' },
    { ...owner, baalut: 3 },
  ]) await assert.rejects(lookupOwnership(String(plate), mock([row])), invalid)
  await assert.rejects(lookupOwnership(String(plate), mock([owner, owner])), invalid)
  for (const extra of [{ fields: [] }, { resource_id: MILEAGE_RESOURCE }, { total: -1 }, { offset: 999 }, { records: [] , total: 1 }]) {
    await assert.rejects(lookupOwnership(String(plate), mock([owner], extra)), invalid)
  }
  for (const kilometers of [-1, 1.5, '', 'abc', undefined, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(lookupMileage(String(plate), mock([{ ...mileage, kilometer_test_aharon: kilometers }])), invalid)
  }
  await assert.rejects(lookupMileage(String(plate), mock([{ ...mileage, shinui_mivne_ind: 2 }])), invalid)
})
test('short pages and estimated totals continue until an empty terminal page', async () => {
  let pages = 0
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('resource_show')) return mock([])(input, options)
    const offset = Number(url.searchParams.get('offset'))
    assert.equal(offset, pages++)
    return mock(offset < 2 ? [{ ...owner, _id: offset + 1 }] : [], { total: 100, total_was_estimated: true })(input, options)
  }
  assert.equal((await lookupOwnership(String(plate), request)).items.length, 2)
  assert.equal(pages, 3)
})
test('large histories are explicitly truncated and changing pagination fails', async () => {
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('resource_show')) return mock([])(input, options)
    const offset = Number(url.searchParams.get('offset'))
    return mock(Array.from({ length: 100 }, (_, index) => ({ ...owner, _id: offset + index + 1 })), { total: 1001 })(input, options)
  }
  const report = await lookupOwnership(String(plate), request)
  assert.equal(report.items.length, 1000)
  assert.equal(report.truncated, true)
  let page = 0
  await assert.rejects(lookupOwnership(String(plate), async (input, options) =>
    mock([{ ...owner, _id: ++page }], { total: page + 1 })(input, options)), invalid)
})
test('outages, malformed JSON, metadata failures and cancellation never become empty histories', async () => {
  await assert.rejects(lookupOwnership(String(plate), async () => { throw new TypeError('offline') }), error => error instanceof LookupError && error.code === 'upstream_unavailable')
  await assert.rejects(lookupMileage(String(plate), async () => new Response('bad json')), invalid)
  await assert.rejects(lookupOwnership(String(plate), async (input, options) => String(input).includes('resource_show') ? new Response('', { status: 503 }) : mock([])(input, options)), error => error instanceof LookupError && error.code === 'upstream_unavailable')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(lookupMileage(String(plate), mock([]), controller.signal), error => error instanceof LookupError && error.code === 'upstream_timeout')
  let called = false
  await assert.rejects(lookupOwnership('invalid', async () => { called = true; return Response.json({}) }))
  assert.equal(called, false)
})
