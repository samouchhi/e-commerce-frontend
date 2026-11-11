import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeCambodianPhone } from '../src/utils/cambodianPhone.js'

test('normalizes Cambodian local and +855 phone formats', () => {
  assert.equal(normalizeCambodianPhone(' 012 345 678 '), '012345678')
  assert.equal(normalizeCambodianPhone('+855 12 345 678'), '012345678')
  assert.equal(normalizeCambodianPhone('+855 (96) 123-4567'), '0961234567')
})

test('rejects incomplete, foreign and non-phone values', () => {
  for (const value of ['12345678', '+856 20 1234 5678', '01234', '012345678 ext 2']) {
    assert.equal(normalizeCambodianPhone(value), null)
  }
})
