import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FAQS, PUBLIC_CONTENT_HASHES, SITE_URL, STRUCTURED_DATA } from '../src/lib/seo.ts'

test('FAQ markup uses exactly the public questions and answers, with stable unique anchors', () => {
  const faq = STRUCTURED_DATA['@graph'].find(item => item['@type'] === 'FAQPage')
  assert.ok(faq?.mainEntity)
  assert.equal(faq.mainEntity.length, FAQS.length)
  assert.equal(new Set(FAQS.map(item => item.id)).size, FAQS.length)
  for (const [index, item] of FAQS.entries()) {
    assert.equal(faq.mainEntity[index].name, item.question)
    assert.equal(faq.mainEntity[index].acceptedAnswer.text, item.answer)
    assert.equal(faq.mainEntity[index]['@id'], `${SITE_URL}#${item.id}`)
    assert.ok(PUBLIC_CONTENT_HASHES.includes(`#${item.id}`))
  }
})

test('public schema contains no vehicle identifiers, fabricated reviews or form-search URLs', () => {
  const json = JSON.stringify(STRUCTURED_DATA)
  assert.ok(!/\b[A-HJ-NPR-Z0-9]{17}\b/.test(json))
  assert.ok(!/SearchAction|aggregateRating|ratingValue|reviewCount|query-input|#report=/.test(json))
  assert.ok(json.includes('"price":"0"'))
})

test('sitemap lists only the canonical public homepage, not fragments or campaign URLs', () => {
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [SITE_URL])
})

test('search crawlers are allowed separately from OpenAI model-training crawls', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
  assert.match(robots, /User-agent: \*\s+Allow: \//)
  assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//)
  assert.match(robots, /User-agent: GPTBot\s+Disallow: \//)
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}sitemap.xml`))
})
