import { SITE_URL } from './seo.ts'

// Public ownership proof, not an authentication secret.
export const INDEXNOW_KEY = '534e126a5b614d0a891dfbdf1a4f8a13'
export const INDEXNOW_KEY_URL = `${SITE_URL}${INDEXNOW_KEY}.txt`

export async function notifyIndexNow(request: typeof fetch = fetch): Promise<200 | 202> {
  const keyResponse = await request(INDEXNOW_KEY_URL, { signal: AbortSignal.timeout(20_000) })
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) {
    throw new Error(`IndexNow ownership file is unavailable or incorrect (HTTP ${keyResponse.status}); deploy before submitting.`)
  }
  const response = await request('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      host: new URL(SITE_URL).hostname,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_URL,
      urlList: [SITE_URL],
    }),
  })
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow rejected the notification (HTTP ${response.status}).`)
  }
  return response.status
}
