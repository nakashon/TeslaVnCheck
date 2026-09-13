import test from 'node:test'
import assert from 'node:assert/strict'
import { assess } from '../src/lib/checker.ts'
import { batteryPresentation } from '../src/lib/battery-presentation.ts'
import { createReport, parseReport, reportLink } from '../src/lib/share.ts'

const vin = 'XP7YGCFR0PB123456'

test('replacement gets a blue update while retaining the original 4/4 model match', () => {
  const result = assess(vin, 'Y7CR', 'yes')
  const presentation = batteryPresentation(result, 'yes')
  assert.equal(presentation.tone, 'updated')
  assert.equal(result.status, 'document-supported')
  assert.equal(result.profileMatch.matched, 4)
  assert.equal(result.probability, null)
  assert.equal(presentation.title, 'דווח על החלפת סוללה')
  assert.equal(presentation.evidenceLabel, 'לא נמסר מסמך')
})

test('document-backed replacement and other-pack reports receive a blue presentation', () => {
  const result = assess(vin)
  for (const evidence of ['replacement-invoice', 'replacement-tesla'] as const) {
    const presentation = batteryPresentation(result, 'yes', evidence)
    assert.equal(presentation.tone, 'updated')
    assert.ok(presentation.title.includes('עם מסמך'))
  }
  for (const evidence of ['other-tesla', 'other-invoice', 'other-label'] as const) {
    const presentation = batteryPresentation(result, 'unknown', evidence)
    assert.equal(presentation.tone, 'updated')
    assert.ok(presentation.title.includes('מארז אחר'))
  }
})

test('other CoC codes alone do not confirm current pack identity or receive blue', () => {
  assert.equal(batteryPresentation(assess(vin, 'other'), 'unknown').tone, 'uncertain')
  assert.equal(batteryPresentation(assess(vin), 'no').tone, 'attention')
  assert.equal(batteryPresentation(assess('LRWYGCFR0PC123456'), 'no').tone, 'clear')
})

test('replacement does not erase conflicting model evidence', () => {
  const result = assess('XP7YGCES0SB123456', 'unknown', 'yes', { year: 2024, drive: 'rwd' })
  assert.equal(batteryPresentation(result, 'yes', 'replacement-invoice').tone, 'updated')
  assert.equal(result.status, 'conflicting')
  assert.equal(result.yearConflict, true)
  assert.equal(result.profileMatch.matched, 3)
})

test('shared links reconstruct the same battery presentation as the original lookup', () => {
  for (const evidence of ['unknown', 'replacement-tesla', 'other-tesla'] as const) {
    const original = assess(vin, 'Y7CR', 'yes')
    const report = createReport(vin, 'Y7CR', 'yes', null, null, evidence)
    const parsed = parseReport(new URL(reportLink(report, 'https://example.org')).hash)
    assert.ok(parsed)
    const shared = assess(parsed.prefix + '000000', parsed.variant, parsed.replacement, parsed.registration)
    assert.deepEqual(batteryPresentation(shared, parsed.replacement, parsed.batteryEvidence), batteryPresentation(original, 'yes', evidence))
  }
})
