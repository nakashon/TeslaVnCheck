import test from 'node:test'
import assert from 'node:assert/strict'
import { assess, decodeVin, normalizePlate, normalizeVin, InputError } from '../src/lib/checker.ts'

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
  assert.equal(assess(berlin.slice(0, 9) + 'S' + berlin.slice(10)).status, 'outside')
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
