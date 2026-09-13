import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function audit(page: Page) {
  await page.addScriptTag({ url: '/node_modules/axe-core/axe.min.js' })
  const violations = await page.evaluate(`axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] }
  }).then(result => result.violations.map(issue => ({
    id: issue.id, nodes: issue.nodes.map(node => ({ target: node.target, summary: node.failureSummary }))
  })))`)
  expect(violations).toEqual([])
}

async function lookupVin(page: Page) {
  await page.locator('.input-tabs button').last().click()
  await page.locator('#identifier').fill('XP7YGCFR0PB123456')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('.battery-result')).toHaveAttribute('data-tone', 'attention')
}

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', route => route.abort())
  await page.route('https://data.gov.il/**', route => route.abort())
})

test('home, skip link, privacy navigation and invalid input support keyboard use', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#identifier')).toBeFocused()
  await page.keyboard.type('12345678')
  await expect(page.locator('#identifier')).toHaveValue('12345678')
  await page.locator('#identifier').fill('invalid')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('#identifier')).toBeFocused()
  await expect(page.locator('#identifier')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#lookup-error')).not.toBeEmpty()
  await audit(page)
  await page.locator('.input-privacy a').click()
  await expect(page.locator('#privacy')).toBeFocused()
  await expect(page.locator('#privacy')).toContainText('Google Analytics')
})

test('battery colors, CoC controls and generated report have accessible equivalents', async ({ page }) => {
  await page.goto('/')
  await lookupVin(page)
  await page.locator('.refine-details > summary').click()
  await audit(page)
  await page.locator('#variant').selectOption('other')
  await expect(page.locator('.battery-result')).toHaveAttribute('data-tone', 'uncertain')
  await audit(page)
  await page.locator('#battery-evidence').selectOption('replacement-invoice')
  await expect(page.locator('.battery-result')).toHaveAttribute('data-tone', 'updated')
  await audit(page)
  await page.getByRole('button', { name: 'הפקת דוח לשיתוף', exact: true }).click()
  await expect(page.locator('.share-preview img')).toBeVisible()
  await expect(page.locator('.share-preview img')).toHaveAttribute('alt', /הפירוט המלא זמין כטקסט/)
  await audit(page)
  const link = await page.locator('#share-link').inputValue()
  await page.goto(link)
  await expect(page.locator('.shared-banner')).toBeVisible()
  await audit(page)
})

test('green outside-profile result remains understandable without color alone', async ({ page }) => {
  await page.goto('/')
  await page.locator('.input-tabs button').last().click()
  await page.locator('#identifier').fill('LRWYGCFR0PC123456')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('.battery-result')).toHaveAttribute('data-tone', 'clear')
  await expect(page.locator('#battery-result-title')).toContainText('אינו תואם')
  await audit(page)
})

test('consent dialog traps focus, supports Escape and opens privacy without consent', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(`import('/src/lib/analytics.ts').then(module => module.initializeAnalytics('G-TEST000001'))`)
  const dialog = page.locator('#analytics-consent')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#analytics-consent-title')).toBeFocused()
  await audit(page)
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate('Boolean(document.activeElement.closest("dialog"))')).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  const preferences = page.locator('.analytics-preferences > button')
  await preferences.click()
  await page.keyboard.press('Escape')
  await expect(preferences).toBeFocused()
  await preferences.click()
  await dialog.locator('a[href="#privacy"]').click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('#privacy')).toBeFocused()
  expect(await page.evaluate('localStorage.getItem("testmatesla-analytics-consent-v1")')).toBeNull()
  expect(await page.evaluate('Boolean(window.dataLayer?.length)')).toBe(false)
  await page.goto('/#privacy')
  await page.evaluate(`import('/src/lib/analytics.ts').then(module => module.initializeAnalytics('G-TEST000001'))`)
  await expect(page.locator('#analytics-consent')).not.toBeVisible()
  await expect(page.locator('#privacy')).toBeInViewport()
  await expect(page.locator('#privacy')).toBeFocused()
  await expect(page.locator('#privacy a[href*="data.gov.il"]')).toHaveCount(3)
})

test('320px reflow, expanded text spacing and reduced motion remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await lookupVin(page)
  await page.locator('.refine-details > summary').click()
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' })
  expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBe(true)
  expect(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')).toBe('auto')
  await audit(page)
  await page.emulateMedia({ forcedColors: 'active' })
  await page.locator('#identifier').focus()
  await expect(page.locator('#identifier')).toBeFocused()
  expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth')).toBe(true)
})

test('loaded registry, ownership, mileage and recall states remain readable', async ({ page }) => {
  await page.unroute('https://data.gov.il/**')
  await page.route('https://data.gov.il/**', async route => {
    const url = new URL(route.request().url())
    const id = url.searchParams.get('resource_id')
    if (url.pathname.endsWith('resource_show')) {
      await route.fulfill({ json: { success: true, result: { id: url.searchParams.get('id'), last_modified: '2026-09-11T00:00:00' } } })
      return
    }
    const rows: Record<string, unknown>[] = id === '053cea08-09bc-40ec-8f7a-156f0677aff3'
      ? [{ mispar_rechev: 12345678, misgeret: 'XP7YGCFR0PB123456', tozeret_nm: 'Tesla Germany', kinuy_mishari: 'MODEL Y', shnat_yitzur: 2023 }]
      : id === 'bb2355dc-9ec7-4f06-9c3f-3344672171da'
        ? [{ _id: 1, mispar_rechev: 12345678, baalut_dt: 202305, baalut: 'פרטי' }]
        : id === '56063a99-8a3e-4ff4-912e-5966c0279bad'
          ? [{ _id: 1, mispar_rechev: 12345678, kilometer_test_aharon: 54321, rishum_rishon_dt: '2023-05', mkoriut_nm: 'פרטי', shinui_mivne_ind: 0, gapam_ind: null, shnui_zeva_ind: 0, shinui_zmig_ind: 0 }]
          : [{ _id: 1, MISPAR_RECHEV: 12345678, RECALL_ID: 42, TEUR_TAKALA: 'קריאה לדוגמה', TAARICH_PTICHA: '01/02/2026', SUG_TAKALA: 'בטיחות' }]
    await route.fulfill({ json: { success: true, result: { resource_id: id, records: rows, total: rows.length, total_was_estimated: false, fields: (url.searchParams.get('fields') ?? '').split(',').map(id => ({ id })) } } })
  })
  await page.goto('/')
  await page.locator('#identifier').fill('12345678')
  await page.locator('button[type=submit]').click()
  await expect(page.locator('.ownership-timeline')).toBeVisible()
  await expect(page.locator('.mileage-card .history-metric strong')).toHaveText('54,321')
  await expect(page.locator('.recall-items')).toBeVisible()
  await audit(page)
})
