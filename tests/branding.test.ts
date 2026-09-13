import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BRAND_MARK, SLOGAN } from '../src/lib/branding.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const meta = (name: string) => html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]+)"`))?.[1]

test('social crawlers get the slogan and a large preview without executing JavaScript', () => {
  assert.equal(meta('og:title'), `TestMaTesla — ${SLOGAN}`)
  assert.equal(meta('twitter:title'), meta('og:title'))
  assert.equal(meta('twitter:card'), 'summary_large_image')
  assert.equal(meta('og:locale'), 'he_IL')
  assert.equal(meta('og:url'), 'https://testmatesla.com/')
  assert.ok(html.includes('<link rel="canonical" href="https://testmatesla.com/"'))
  assert.ok(html.includes(`<title>TestMaTesla — ${SLOGAN}</title>`))
  assert.ok(meta('description')?.startsWith(SLOGAN))
  assert.ok(!html.includes('מכירים את הטסלה'))
})

test('Open Graph and Twitter use the same public HTTPS PNG with matching dimensions', () => {
  const image = meta('og:image')
  assert.equal(image, 'https://testmatesla.com/social-preview-v1.png')
  assert.equal(meta('og:image:secure_url'), image)
  assert.equal(meta('twitter:image'), image)
  assert.equal(meta('og:image:type'), 'image/png')
  assert.equal(meta('og:image:width'), '1200')
  assert.equal(meta('og:image:height'), '630')
  assert.ok(meta('og:image:alt')?.includes(SLOGAN))
  const png = readFileSync(new URL('../public/social-preview-v1.png', import.meta.url))
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
  assert.ok(png.length < 500_000)
})

test('vector, favicon and Apple touch icon assets are present and correctly sized', () => {
  const logo = readFileSync(new URL(`../public/${BRAND_MARK}`, import.meta.url), 'utf8')
  assert.ok(logo.includes('viewBox="0 0 64 64"'))
  assert.ok(html.includes(`href="%BASE_URL%${BRAND_MARK}"`))
  for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]] as const) {
    const png = readFileSync(new URL(`../public/${file}`, import.meta.url))
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
    assert.ok(html.includes(`href="%BASE_URL%${file}"`))
  }
})
