import test from 'node:test'
import assert from 'node:assert/strict'
import { ANALYTICS_EVENTS, analyticsContext, analyticsEventDetail, tagReportLink } from '../src/lib/analytics-policy.ts'

test('campaign attribution accepts predefined public labels, never arbitrary URL or vehicle data', () => {
  const context = analyticsContext('?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch&utm_content=ad-a&vin=XP7YGCFR0PB123456&plate=12345678&fbclid=secret', 'https://www.facebook.com/private/account?owner=someone#report=secret')
  assert.deepEqual(context, {
    page_location: 'https://testmatesla.com/',
    page_title: 'TestMaTesla — כל המידע על הטסלה לפי מספר רישוי',
    page_referrer: 'https://www.facebook.com/',
    campaign_source: 'facebook', campaign_medium: 'paid_social', campaign_name: 'launch', campaign_content: 'ad-a',
  })
  for (const privateValue of ['XP7YGCFR0PB123456', '12345678', 'secret', 'someone']) {
    assert.ok(!JSON.stringify(context).includes(privateValue))
  }
})

test('unknown campaign names, duplicates, email addresses, VINs and search terms are dropped', () => {
  const context = analyticsContext('?utm_source=whatsapp&utm_source=private&utm_medium=person%40example.com&utm_campaign=XP7YGCFR0PB123456&utm_content=12345678&utm_term=private', '')
  assert.deepEqual(Object.keys(context).sort(), ['page_location', 'page_referrer', 'page_title'])
})

test('referrers reveal only known public origins, never paths, credentials or arbitrary hosts', () => {
  for (const referrer of ['invalid url', 'https://someone.example.org/', 'http://www.facebook.com/',
    'https://private@www.facebook.com/', 'https://www.facebook.com:8443/private', 'https://www.facebook.com.evil.example/']) {
    assert.equal(analyticsContext('', referrer).page_referrer, '')
  }
  assert.equal(analyticsContext('', 'https://www.google.co.il/search?q=private').page_referrer, 'https://www.google.co.il/')
})

test('event payloads allow only relevant fixed method enums, never extra object fields', () => {
  const detail = { lookup_method: 'plate' as const, method: 'file' as const, vin: 'XP7YGCFR0PB123456', plate: '12345678', report: 'private' }
  for (const event of ANALYTICS_EVENTS) {
    const payload = analyticsEventDetail(event, detail)
    assert.deepEqual(payload, event.startsWith('vehicle_lookup_') ? { lookup_method: 'plate' } : event === 'report_shared' ? { method: 'file' } : {})
  }
})

test('search and AI referral attribution keeps only public origins, not searches or conversations', () => {
  for (const host of ['www.bing.com', 'duckduckgo.com', 'chatgpt.com', 'chat.openai.com',
    'www.perplexity.ai', 'copilot.microsoft.com', 'claude.ai', 'gemini.google.com']) {
    const context = analyticsContext('', `https://${host}/c/private-conversation?q=private-search#private-answer`)
    assert.equal(context.page_referrer, `https://${host}/`)
    assert.ok(!JSON.stringify(context).includes('private'))
  }
  assert.equal(analyticsContext('', 'https://chatgpt.com.evil.example/private').page_referrer, '')
})

test('generated report attribution replaces incoming advertising or private query parameters', () => {
  const url = new URL('https://testmatesla.com/?plate=12345678&utm_source=facebook&fbclid=private#report=synthetic')
  tagReportLink(url)
  assert.equal(url.search, '?utm_source=shared_report&utm_medium=referral&utm_campaign=report-share')
  assert.equal(url.hash, '#report=synthetic')
  assert.equal(analyticsContext(url.search, '').campaign_source, 'shared_report')
  assert.equal(analyticsContext(url.search, '').campaign_name, 'report-share')
})
