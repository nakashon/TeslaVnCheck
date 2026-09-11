import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupRecalls, RECALL_RESOURCE, RECALL_SOURCE_URL } from '../src/lib/recalls.ts'
import { LookupError } from '../src/lib/govil.ts'
import { InputError } from '../src/lib/checker.ts'

const row = { _id: 1, MISPAR_RECHEV: 12345678, RECALL_ID: 42, TEUR_TAKALA: ' תקלה ', TAARICH_PTICHA: '01/02/2026', SUG_TAKALA: 'בטיחות' }
const fields = Object.keys(row).map(id => ({ id }))
const page = (records: unknown[], total = records.length, extra = {}) => ({
  success: true,
  result: { resource_id: RECALL_RESOURCE, fields, records, total, total_was_estimated: false, ...extra },
})
const metadata = { success: true, result: { id: RECALL_RESOURCE, last_modified: '2026-09-11T02:30:29.883877' } }
const mock = (pages: unknown[], meta: unknown = metadata): typeof fetch => async input => {
  const url = new URL(String(input))
  const body = url.pathname.endsWith('resource_show') ? meta : pages.shift()
  assert.notEqual(body, undefined, 'unexpected request')
  return new Response(JSON.stringify(body))
}
const errorCode = (code: string) => (error: unknown) => error instanceof LookupError && error.code === code

test('uses verified uppercase schema, minimal fields, stable pagination and private browser transport', async () => {
  let calls = 0
  const request: typeof fetch = async (input, options) => {
    calls++
    const url = new URL(String(input))
    assert.equal(url.hostname, 'data.gov.il')
    assert.equal(options?.credentials, 'omit')
    assert.equal(options?.cache, 'no-store')
    assert.equal(options?.referrerPolicy, 'no-referrer')
    assert.ok(options?.signal)
    if (url.pathname.endsWith('resource_show')) {
      assert.equal(url.searchParams.get('id'), RECALL_RESOURCE)
      return new Response(JSON.stringify(metadata))
    }
    assert.equal(url.searchParams.get('resource_id'), RECALL_RESOURCE)
    assert.deepEqual(JSON.parse(url.searchParams.get('filters')!), { MISPAR_RECHEV: 12345678 })
    assert.equal(url.searchParams.get('sort'), '_id asc')
    assert.equal(url.searchParams.get('offset'), '0')
    assert.equal(url.searchParams.get('include_total'), 'true')
    assert.deepEqual(url.searchParams.get('fields')?.split(',').sort(), Object.keys(row).sort())
    return new Response(JSON.stringify(page([row])))
  }
  const result = await lookupRecalls('123-45-678', request)
  assert.deepEqual(result.items, [{ id: '42', description: 'תקלה', openedAt: '01/02/2026', faultType: 'בטיחות' }])
  assert.equal(result.truncated, false)
  assert.equal(result.dataUpdatedAt, metadata.result.last_modified)
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)))
  assert.ok(RECALL_SOURCE_URL.includes(RECALL_RESOURCE))
  assert.equal(calls, 2)
})

test('invalid plate is rejected before any network request', async () => {
  for (const plate of ['abc', '123', '0000000', '123456789']) {
    await assert.rejects(lookupRecalls(plate, async () => { assert.fail('network called') }), InputError)
  }
})

test('only schema-validated empty records produce an empty report', async () => {
  assert.deepEqual((await lookupRecalls('12345678', mock([page([])]))).items, [])
  for (const body of [{}, { success: false }, { success: true, result: { records: [] } },
    page([], 0, { fields: [] }), page([], 0, { resource_id: 'wrong' }),
    page([], 0, { total: null }), page([], 0, { total_was_estimated: undefined }),
    page([], 1), page([], 1, { total_was_estimated: true })]) {
    await assert.rejects(lookupRecalls('12345678', mock([body])), errorCode('upstream_invalid'))
  }
})

test('malformed, nonmatching and ambiguous rows cannot be successful recalls', async () => {
  for (const raw of [null, [], { ...row, MISPAR_RECHEV: 87654321 }, { ...row, MISPAR_RECHEV: '123-45-678' },
    { ...row, RECALL_ID: '' }, { ...row, RECALL_ID: {} }, { ...row, _id: null },
    { ...row, TEUR_TAKALA: undefined }, { ...row, SUG_TAKALA: 1 }, { ...row, TAARICH_PTICHA: [] }]) {
    await assert.rejects(lookupRecalls('12345678', mock([page([raw])])), errorCode('upstream_invalid'))
  }
  await assert.rejects(lookupRecalls('12345678', mock([page([row, { ...row, _id: 2, TEUR_TAKALA: 'different' }])])), errorCode('upstream_invalid'))
  const result = await lookupRecalls('12345678', mock([page([{ ...row, MISPAR_RECHEV: '12345678', RECALL_ID: '42', TEUR_TAKALA: null, TAARICH_PTICHA: '', SUG_TAKALA: null }])]))
  assert.deepEqual(result.items, [{ id: '42', description: null, openedAt: null, faultType: null }])
})

test('short pages still paginate by raw row count and identical campaigns deduplicate', async () => {
  const offsets: string[] = []
  const fetchPage = mock([page([row], 3), page([{ ...row, _id: 2 }, { ...row, _id: 3, RECALL_ID: 43 }], 3)])
  const request: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('datastore_search')) offsets.push(url.searchParams.get('offset')!)
    return fetchPage(input, options)
  }
  const result = await lookupRecalls('12345678', request)
  assert.deepEqual(offsets, ['0', '1'])
  assert.deepEqual(result.items.map(item => item.id), ['42', '43'])
  assert.equal(result.truncated, false)
})

test('estimated totals require a terminal empty page, not an estimated count or short page', async () => {
  const extra = { total_was_estimated: true }
  const result = await lookupRecalls('12345678', mock([page([row], 1, extra), page([{ ...row, _id: 2, RECALL_ID: 43 }], 1, extra), page([], 1, extra)]))
  assert.equal(result.items.length, 2)
  assert.equal(result.truncated, false)
})

test('inconsistent totals, repeated pages and prematurely empty pages fail instead of clearing', async () => {
  for (const pages of [
    [page([row], 2), page([], 2)],
    [page([row], 2), page([{ ...row, _id: 2 }], 3)],
    [page([row], 2), page([row], 2)],
    [page([row], 0)],
    [page([row], 2), page([{ ...row, _id: 2 }], 2, { offset: 0 })],
  ]) await assert.rejects(lookupRecalls('12345678', mock(pages)), errorCode('upstream_invalid'))
})

test('bounded pagination reports truncation rather than implying completeness', async () => {
  const pages = Array.from({ length: 10 }, (_, p) => page(Array.from({ length: 100 }, (_, i) => ({
    ...row, _id: p * 100 + i + 1, RECALL_ID: p * 100 + i + 1,
  })), 1001))
  const result = await lookupRecalls('12345678', mock(pages))
  assert.equal(result.items.length, 1000)
  assert.equal(result.truncated, true)
})

test('network, HTTP, JSON, timeout and abort failures always throw', async () => {
  for (const [request, code] of [
    [async () => { throw new TypeError('CORS') }, 'upstream_unavailable'],
    [async () => new Response('{}', { status: 503 }), 'upstream_unavailable'],
    [async () => new Response('not JSON'), 'upstream_invalid'],
    [async () => { throw new DOMException('timeout', 'TimeoutError') }, 'upstream_timeout'],
    [async () => { throw new DOMException('abort', 'AbortError') }, 'upstream_timeout'],
  ] as [typeof fetch, string][]) {
    await assert.rejects(lookupRecalls('12345678', request), errorCode(code))
  }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(lookupRecalls('12345678', async () => { assert.fail('already aborted') }, controller.signal), errorCode('upstream_timeout'))
  const active = new AbortController()
  const request: typeof fetch = async (_input, options) => {
    active.abort()
    assert.equal(options?.signal?.aborted, true)
    throw new DOMException('abort', 'AbortError')
  }
  await assert.rejects(lookupRecalls('12345678', request, active.signal), errorCode('upstream_timeout'))
})

test('body-stream failures and later page failures do not return partial success', async () => {
  const brokenBody: typeof fetch = async () => Object.assign(new Response(), {
    json: async () => { throw new DOMException('abort', 'AbortError') },
  })
  await assert.rejects(lookupRecalls('12345678', brokenBody), errorCode('upstream_timeout'))
  let calls = 0
  const laterFailure: typeof fetch = async () => {
    if (calls++) throw new TypeError('offline')
    return new Response(JSON.stringify(page([row], 2)))
  }
  await assert.rejects(lookupRecalls('12345678', laterFailure), errorCode('upstream_unavailable'))
})

test('freshness is only returned from validated metadata and metadata errors surface', async () => {
  const result = await lookupRecalls('12345678', mock([page([])], { success: true, result: { id: RECALL_RESOURCE, last_modified: null } }))
  assert.equal(result.dataUpdatedAt, undefined)
  for (const meta of [{ success: false }, { success: true, result: { id: 'wrong' } },
    { success: true, result: { id: RECALL_RESOURCE, last_modified: 'yesterday' } }]) {
    await assert.rejects(lookupRecalls('12345678', mock([page([])], meta)), errorCode('upstream_invalid'))
  }
})
