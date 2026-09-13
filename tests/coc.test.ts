import test from 'node:test'
import assert from 'node:assert/strict'
import { cocRequest } from '../src/lib/coc.ts'

const vin = 'XP7YGCFR0PB123456'

test('CoC letter includes the full VIN and available registration number', () => {
  const text = cocRequest(vin, '12345678')
  assert.ok(text.includes(`מספר שלדה (VIN): ${vin}\n`))
  assert.ok(text.includes('מספר רישוי: 12345678\n'))
  assert.ok(!text.includes('[יש להשלים VIN]'))
  assert.ok(text.includes('Type / Variant / Version'))
})

test('VIN-only lookup omits the unknown plate without inventing one', () => {
  const text = cocRequest(vin, null)
  assert.ok(text.includes(vin))
  assert.ok(!text.includes('מספר רישוי:'))
  assert.ok(!text.includes('null'))
})

test('demo letter keeps a VIN placeholder instead of a fictional identifier', () => {
  const text = cocRequest(null, null)
  assert.ok(text.includes('[יש להשלים VIN]'))
  assert.ok(!text.includes('מספר רישוי:'))
})

test('a subsequent request uses only the current vehicle identifiers', () => {
  cocRequest(vin, '12345678')
  const nextVin = 'LRWYGCFR0PC654321'
  const text = cocRequest(nextVin, '87654321')
  assert.ok(text.includes(nextVin))
  assert.ok(text.includes('87654321'))
  assert.ok(!text.includes(vin))
  assert.ok(!text.includes('12345678'))
})
