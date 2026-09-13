import test from 'node:test'
import assert from 'node:assert/strict'
import { assess, assessmentTone, decodeVin, normalizePlate, normalizeVin, registrationEvidence, InputError } from '../src/lib/checker.ts'

const berlin = 'XP7YGCFR0PB000001'
const shanghai = 'LRWYGCFR0PC000001'

test('normalizes case and whitespace; rejects invalid VIN characters and Tesla sequence numbers', () => {
  assert.equal(normalizeVin(` ${berlin.toLowerCase()} `), berlin)
  for (const invalid of ['', berlin.slice(1), berlin.replace('0', 'O'), `${berlin}!`, berlin.replace('000001', 'ABCDEF')]) {
    assert.throws(() => normalizeVin(invalid), InputError)
  }
})
test('normalizes CarAgent-compatible plate numbers without swallowing arbitrary letters', () => {
  assert.equal(normalizePlate('123-45-678'), '12345678')
  assert.equal(normalizePlate(' 01 234 56 '), '123456')
  for (const invalid of ['abc12345678', '1234', '123456789', '0000000', '-1', '12.34567']) {
    assert.throws(() => normalizePlate(invalid), InputError)
  }
})
test('Berlin historical RWD is a candidate, never an invented probability or supplier confirmation', () => {
  const result = assess(berlin)
  assert.equal(result.status, 'candidate')
  assert.equal(result.probability, null)
  assert.equal(result.decoded.factory, 'Berlin')
  assert.equal(result.decoded.year, 2023)
  assert.equal(result.decoded.drive, 'rwd')
  assert.equal(result.decoded.chemistry, 'unknown')
  assert.ok(result.criteria.every((criterion) => criterion.match === true))
})
test('exact owner-entered Y7CR supports original configuration, never replacement identity', () => {
  const result = assess(berlin, 'Y7CR', 'yes')
  assert.equal(result.status, 'document-supported')
  assert.equal(result.currentPack, 'replacement-unknown')
  assert.equal(result.probability, null)
  assert.ok(result.reasons.includes('self_reported_document'))
})
test('other CoC variants remain unresolved rather than inferred CATL', () => {
  assert.equal(assess(berlin, 'other').status, 'unknown')
})
test('Shanghai differs from the target and supports historical LFP decoding', () => {
  const result = assess(shanghai)
  assert.equal(result.status, 'outside')
  assert.equal(result.decoded.chemistry, 'lfp')
  assert.equal(result.probability, null)
})
test('conflicting factory or document identifiers never yield a match', () => {
  assert.equal(assess(berlin.slice(0, 10) + 'C000001').status, 'conflicting')
  assert.equal(assess(shanghai, 'Y7CR').status, 'conflicting')
})
test('AWD and different years differ; unknown drive and year remain unresolved', () => {
  assert.equal(assess(berlin.slice(0, 7) + 'K' + berlin.slice(8)).status, 'outside')
  assert.equal(assess(berlin.slice(0, 9) + 'S' + berlin.slice(10)).status, 'unknown')
  assert.equal(assess(berlin.slice(0, 7) + 'Z' + berlin.slice(8)).status, 'unknown')
  assert.equal(assess(berlin.slice(0, 9) + 'Z' + berlin.slice(10)).status, 'unknown')
})
test('unrecognized manufacturers remain unknown and drive rules are model-specific', () => {
  assert.equal(assess('WVWZZZ1KZAW000001').status, 'unknown')
  assert.equal(decodeVin('XP73GCFR0PB000001').drive, 'unknown')
})
test('current pack depends on explicit owner-reported history, never assumed original', () => {
  assert.equal(assess(berlin).currentPack, 'unknown')
  assert.equal(assess(berlin, 'unknown', 'no').currentPack, 'original-reported')
  assert.equal(assess(berlin, 'unknown', 'yes').currentPack, 'replacement-unknown')
})
test('profile matching counts known matches, differences and missing facts separately', () => {
  assert.deepEqual(assess(berlin).profileMatch, { matched: 4, different: 0, unknown: 0, total: 4 })
  assert.deepEqual(assess(shanghai).profileMatch, { matched: 3, different: 1, unknown: 0, total: 4 })
  assert.deepEqual(assess(berlin.slice(0, 7) + 'Z' + berlin.slice(8)).profileMatch, { matched: 3, different: 0, unknown: 1, total: 4 })
  assert.deepEqual(assess('WVWZZZ1KZAW000001').profileMatch, { matched: 0, different: 0, unknown: 4, total: 4 })
})
test('outcome colors are distinct and do not use a green theme for target profiles', () => {
  assert.equal(assessmentTone('candidate'), 'attention')
  assert.equal(assessmentTone('document-supported'), 'attention')
  assert.equal(assessmentTone('outside'), 'clear')
  assert.equal(assessmentTone('unknown'), 'uncertain')
  assert.equal(assessmentTone('conflicting'), 'uncertain')
})
test('Israeli registry year takes precedence over the VIN year without a conflict', () => {
  const vin = 'XP7YGCES0SB000001'
  const result = assess(vin, 'unknown', 'unknown', registrationEvidence(2024, 'RWD'))
  assert.equal(result.decoded.year, 2025)
  assert.equal(result.registration?.year, 2024)
  assert.equal(result.profileYear, 2024)
  assert.equal(result.decoded.drive, 'unknown')
  assert.equal(result.profileDrive, 'rwd')
  assert.equal(result.status, 'candidate')
  assert.equal(assessmentTone(result.status), 'attention')
  assert.deepEqual(result.profileMatch, { matched: 4, different: 0, unknown: 0, total: 4 })
  assert.ok(!result.reasons.includes('registration_year_conflict'))
  assert.equal(assess(vin, 'Y7CR', 'no', registrationEvidence(2024, 'RWD')).status, 'document-supported')
})
test('registry year precedence applies in both directions; VIN year is only a fallback', () => {
  const older = assess(berlin, 'unknown', 'unknown', registrationEvidence(2022, 'RWD'))
  assert.equal(older.profileYear, 2022)
  assert.equal(older.status, 'outside')
  assert.equal(older.criteria.find(item => item.id === 'year')?.match, false)
  const newer = assess(berlin, 'unknown', 'unknown', registrationEvidence(2025, 'RWD'))
  assert.equal(newer.profileYear, 2025)
  assert.equal(newer.status, 'unknown')
  assert.equal(newer.criteria.find(item => item.id === 'year')?.match, null)
  for (const registration of [null, registrationEvidence(null, 'RWD')]) {
    const fallback = assess(berlin, 'unknown', 'unknown', registration)
    assert.equal(fallback.profileYear, fallback.decoded.year)
    assert.equal(fallback.status, 'candidate')
  }
})
test('post-2024 years alone are unresolved, not a verified supplier or defect cutoff', () => {
  for (const code of ['S', 'T']) {
    const result = assess(berlin.slice(0, 9) + code + berlin.slice(10))
    assert.equal(result.status, 'unknown')
    assert.equal(result.criteria.find(item => item.id === 'year')?.match, null)
  }
  assert.equal(assess(berlin.slice(0, 9) + 'S' + berlin.slice(10), 'unknown', 'unknown', { year: 2025, drive: 'rwd' }).status, 'unknown')
  assert.equal(assess(shanghai).status, 'outside')
})
test('registration evidence preserves established cases and exposes drive contradictions', () => {
  assert.equal(assess(berlin, 'unknown', 'unknown', registrationEvidence(2023, 'RWD')).status, 'candidate')
  assert.equal(registrationEvidence(2025, 'LONG RANGE').drive, 'unknown')
  assert.equal(registrationEvidence(2025, ' rwd ').drive, 'rwd')
  assert.equal(assess(berlin, 'unknown', 'unknown', registrationEvidence(null, null)).status, 'candidate')
  const mismatch = assess(berlin, 'unknown', 'unknown', registrationEvidence(2023, 'AWD'))
  assert.equal(mismatch.status, 'conflicting')
  assert.equal(mismatch.driveConflict, true)
  assert.equal(mismatch.profileDrive, 'unknown')
  assert.equal(mismatch.criteria.find(item => item.id === 'drive')?.match, null)
})
