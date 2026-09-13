import { createHash } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { FAQS, SITE_CANON, SITE_URL, STRUCTURED_DATA, renderLlmsText } from '../src/lib/seo.ts'
import { createReport, reportLink } from '../src/lib/share.ts'

test('HTTP response includes public content, canonical metadata and CSP-authorized JSON-LD', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<html lang="he" dir="rtl">')
  expect(html).toContain(`<link rel="canonical" href="${SITE_URL}"`)
  expect(html).toContain('index, follow, max-image-preview:large')
  expect(html).toContain('id="battery-story"')
  expect(html).toContain('id="privacy"')
  expect(html).not.toContain('<div id="root"></div>')
  expect(html).not.toMatch(/#report=|value="[A-HJ-NPR-Z0-9]{17}"/)
  const json = html.match(/<script id="site-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  expect(json).toBeDefined()
  expect(JSON.parse(json!)).toEqual(STRUCTURED_DATA)
  const hash = createHash('sha256').update(json!).digest('base64')
  expect(html).toContain(`'sha256-${hash}'`)
  for (const item of FAQS) expect(html).toContain(`id="${item.id}"`)
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`<loc>${SITE_URL}</loc>`)
  expect(await (await request.get('/robots.txt')).text()).toContain('User-agent: OAI-SearchBot')
  const canon = await request.get('/canon.json')
  expect(canon.status()).toBe(200)
  expect(canon.headers()['content-type']).toContain('application/json')
  expect(await canon.json()).toEqual(SITE_CANON)
  const textSummary = await request.get('/llms.txt')
  expect(textSummary.status()).toBe(200)
  expect(textSummary.headers()['content-type']).toContain('text/plain')
  expect(await textSummary.text()).toBe(renderLlmsText())
  expect(html).toContain('href="./canon.json"')
  expect(html).toContain('href="./llms.txt"')
})

test('without JavaScript, visitors can read the same FAQ answers and government sources', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:5175/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('noscript p')).toContainText('יש להפעיל JavaScript')
    for (const item of FAQS) {
      const details = page.locator(`#${item.id}`)
      await details.locator('summary').click()
      await expect(details.locator('p')).toBeVisible()
      await expect(details.locator('p')).toHaveText(item.answer)
      await expect(details.locator('a')).toHaveAttribute('href', item.source.url)
    }
    await expect(page.locator('#privacy a[href*="data.gov.il/he/datasets/"]')).toHaveCount(3)
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
  } finally {
    await context.close()
  }
})

test('built homepage replaces static content with working input and fragment-based reports', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const externalRequests: string[] = []
  await page.route(/https:\/\/(?:data\.gov\.il|[^/]*google-analytics\.com|www\.googletagmanager\.com)\//, route => {
    externalRequests.push(route.request().url())
    return route.abort()
  })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#identifier')).toBeFocused()
  await page.locator('.input-tabs button').last().click()
  await page.locator('#identifier').fill('XP7YGCFR0PB123456')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('.battery-result')).toHaveAttribute('data-tone', 'attention')
  expect(JSON.parse((await page.locator('#site-structured-data').textContent())!)).toEqual(STRUCTURED_DATA)
  const shared = reportLink(createReport('XP7YGCFR0PB123456', 'unknown', 'unknown'), page.url())
  await page.goto(shared)
  await expect(page.locator('.shared-banner h1')).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('.hero')).toHaveCount(0)
  expect(JSON.parse((await page.locator('#site-structured-data').textContent())!)).toEqual(STRUCTURED_DATA)
  await page.goto('/#battery-profile')
  await expect(page.locator('#battery-profile')).toHaveAttribute('open', '')
  await expect(page.locator('#battery-profile')).toBeFocused()
  await expect(page.locator('#battery-profile')).toBeInViewport()
  expect(externalRequests).toEqual([])
  expect(errors).toEqual([])
})
