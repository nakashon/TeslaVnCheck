import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INDEXNOW_KEY, INDEXNOW_KEY_URL, notifyIndexNow } from '../src/lib/indexnow.ts'
import { SITE_URL } from '../src/lib/seo.ts'

test('public ownership proof matches the deployed file name and content', () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/)
  assert.equal(readFileSync(new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url), 'utf8').trim(), INDEXNOW_KEY)
})

test('IndexNow submits only the public canonical homepage after confirming ownership', async () => {
  for (const status of [200, 202] as const) {
    let calls = 0
    const request: typeof fetch = async (input, options) => {
      calls++
      assert.ok(options?.signal)
      if (calls === 1) {
        assert.equal(input, INDEXNOW_KEY_URL)
        return new Response(INDEXNOW_KEY + '\n')
      }
      assert.equal(input, 'https://api.indexnow.org/indexnow')
      assert.equal(options?.method, 'POST')
      assert.deepEqual(JSON.parse(String(options?.body)), {
        host: 'testmatesla.com',
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_URL,
        urlList: [SITE_URL],
      })
      return new Response(null, { status })
    }
    assert.equal(await notifyIndexNow(request), status)
    assert.equal(calls, 2)
  }
})

test('missing ownership files and HTML challenge pages cannot trigger a submission', async () => {
  for (const [body, status] of [['not found', 404], ['<html>challenge</html>', 200], ['wrong key', 200]] as const) {
    let calls = 0
    const request: typeof fetch = async () => {
      calls++
      return new Response(body, { status })
    }
    await assert.rejects(notifyIndexNow(request), /ownership file/)
    assert.equal(calls, 1)
  }
})

test('notification failures and timeouts surface instead of claiming acceptance', async () => {
  const request: typeof fetch = async input => input === INDEXNOW_KEY_URL
    ? new Response(INDEXNOW_KEY)
    : new Response(null, { status: 429 })
  await assert.rejects(notifyIndexNow(request), /HTTP 429/)
  await assert.rejects(notifyIndexNow(async () => { throw new Error('network unavailable') }), /network unavailable/)
})
