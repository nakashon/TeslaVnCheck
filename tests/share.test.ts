import test from 'node:test'
import assert from 'node:assert/strict'
import { createReport, parseReport, readInitialReport, reportLink } from '../src/lib/share.ts'
import { assess } from '../src/lib/checker.ts'

const vin = 'XP7YGCFR0PB123456'
const encoded = (value: unknown) => `#report=${btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`

test('shared report omits plate and VIN serial while retaining reconstructible configuration', () => {
  const report = createReport(vin, 'Y7CR', 'yes')
  assert.equal(report.prefix, vin.slice(0, 11))
  assert.ok(!JSON.stringify(report).includes('123456'))
  assert.ok(!JSON.stringify(report).includes(vin))
  const link = reportLink(report, 'https://example.org/TeslaVnCheck/?old=123456#sources')
  assert.equal(new URL(link).search, '?utm_source=shared_report&utm_medium=referral&utm_campaign=report-share')
  assert.equal(new URL(link).pathname, '/TeslaVnCheck/')
  assert.deepEqual(parseReport(new URL(link).hash), report)
  assert.equal(assess(report.prefix + '000000', report.variant, report.replacement).status, 'document-supported')
})
test('recall counts retain time and incomplete-result semantics, not a live verification', () => {
  const recall = { count: 3, checkedAt: new Date(Date.now() - 1000).toISOString(), truncated: true }
  const report = createReport(vin, 'unknown', 'unknown', recall)
  assert.deepEqual(parseReport(encoded(report))?.recall, recall)
})
test('ordinary navigation hashes are not interpreted as reports', () => {
  assert.equal(parseReport('#sources'), null)
  assert.deepEqual(readInitialReport(''), { report: null, invalid: false })
})
test('malformed share links visibly fail rather than generating a clean assessment', () => {
  for (const hash of ['#report=', '#report=!!!', '#report=' + 'a'.repeat(1801), encoded(null), encoded({ version: 2 })]) {
    assert.deepEqual(readInitialReport(hash), { report: null, invalid: true })
  }
})
test('rejects invalid identifiers, enums, dates and recall counts', () => {
  const report = createReport(vin, 'unknown', 'unknown')
  const invalid = [
    { ...report, prefix: vin },
    { ...report, prefix: '!!!' },
    { ...report, variant: 'CATL' },
    { ...report, replacement: 'certified' },
    { ...report, createdAt: 'not a date' },
    { ...report, createdAt: '2099-01-01T00:00:00Z' },
    { ...report, recall: { count: -1, checkedAt: report.createdAt, truncated: false } },
    { ...report, recall: { count: 1.5, checkedAt: report.createdAt, truncated: false } },
    { ...report, recall: { count: 0, checkedAt: report.createdAt, truncated: 'false' } },
    { ...report, recall: { count: 0, checkedAt: '2099-01-01T00:00:00Z', truncated: false } },
  ]
  for (const value of invalid) assert.deepEqual(readInitialReport(encoded(value)), { report: null, invalid: true })
})
test('extraneous untrusted fields are not propagated to the public report', () => {
  const report = createReport(vin, 'unknown', 'no')
  assert.deepEqual(parseReport(encoded({ ...report, fullVin: vin, owner: '<script>test</script>', validated: true })), report)
})
test('shared reports use the Israeli year without carrying a plate or full VIN', () => {
  const vin = 'XP7YGCES0SB123456'
  const report = createReport(vin, 'unknown', 'unknown', null, { year: 2024, drive: 'rwd' })
  assert.equal(report.version, 3)
  const parsed = parseReport(encoded(report))
  assert.ok(parsed)
  assert.deepEqual(parsed, report)
  const result = assess(parsed.prefix + '000000', parsed.variant, parsed.replacement, parsed.registration)
  assert.equal(result.status, 'candidate')
  assert.equal(result.profileYear, 2024)
  assert.equal(result.decoded.year, 2025)
  assert.equal(result.profileDrive, 'rwd')
  assert.equal(result.profileMatch.matched, 4)
  const legacy = { ...report, version: 2 }
  delete legacy.batteryEvidence
  const parsedLegacy = parseReport(encoded(legacy))
  assert.ok(parsedLegacy)
  assert.equal(assess(parsedLegacy.prefix + '000000', parsedLegacy.variant, parsedLegacy.replacement, parsedLegacy.registration).status, 'candidate')
  assert.ok(!JSON.stringify(parsed).includes('123456'))
})
test('legacy reports remain readable; unsupported versions or invalid evidence are rejected', () => {
  const legacy = { version: 1, prefix: vin.slice(0, 11), variant: 'unknown', replacement: 'no', createdAt: new Date().toISOString(), recall: null }
  assert.deepEqual(parseReport(encoded(legacy)), legacy)
  const v2 = { ...legacy, version: 2, registration: { year: 2024, drive: 'rwd' } }
  assert.deepEqual(parseReport(encoded(v2)), v2)
  const report = createReport(vin, 'unknown', 'no')
  for (const registration of [null, {}, { year: '2024', drive: 'rwd' }, { year: 2024.5, drive: 'rwd' }, { year: 99999, drive: 'rwd' }, { year: 2024, drive: '4x2' }]) {
    assert.equal(readInitialReport(encoded({ ...report, registration })).invalid, true)
  }
  assert.equal(readInitialReport(encoded({ ...report, version: 4 })).invalid, true)
  assert.equal(readInitialReport(encoded({ ...legacy, registration: { year: 2024, drive: 'rwd' } })).invalid, true)
})

test('v3 carries only the reported battery evidence category, not documents or identifiers', () => {
  for (const batteryEvidence of ['unknown', 'replacement-invoice', 'replacement-tesla', 'other-tesla', 'other-invoice', 'other-label'] as const) {
    const report = createReport(vin, 'Y7CR', 'yes', null, null, batteryEvidence)
    const parsed = parseReport(encoded({ ...report, document: 'private document', plate: '12345678', fullVin: vin }))
    assert.deepEqual(parsed, report)
    assert.equal(parsed?.batteryEvidence, batteryEvidence)
    assert.ok(!JSON.stringify(parsed).includes('private document'))
    assert.ok(!JSON.stringify(parsed).includes(vin))
    assert.ok(!JSON.stringify(parsed).includes('12345678'))
  }
})

test('invalid or contradictory battery evidence cannot generate a resolved-looking report', () => {
  const report = createReport(vin, 'unknown', 'yes', null, null, 'replacement-invoice')
  for (const batteryEvidence of [undefined, null, {}, 'verified', 'other', 1]) {
    assert.equal(readInitialReport(encoded({ ...report, batteryEvidence })).invalid, true)
  }
  for (const replacement of ['unknown', 'no'] as const) {
    assert.equal(readInitialReport(encoded({ ...report, replacement })).invalid, true)
    assert.throws(() => createReport(vin, 'unknown', replacement, null, null, 'replacement-tesla'))
  }
  for (const version of [1, 2]) {
    assert.equal(readInitialReport(encoded({ ...report, version })).invalid, true)
  }
})
