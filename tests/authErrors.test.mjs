import assert from 'node:assert/strict'
import test from 'node:test'
import { authErrorMessage } from '../src/utils/authErrors.js'

const t = (key) => key

test('OTP errors preserve safe backend guidance and map common statuses', () => {
  assert.equal(
    authErrorMessage({ status: 410, details: { message: 'This code has expired.' } }, t, {
      otp: true,
    }),
    'This code has expired.',
  )
  assert.equal(authErrorMessage({ status: 401 }, t, { otp: true }), 'login.invalidOrExpiredCode')
  assert.equal(authErrorMessage({ status: 429 }, t, { otp: true }), 'login.tooManyAttempts')
})

test('unexpected and sign-in errors keep safe fallbacks', () => {
  assert.equal(authErrorMessage({ status: 401 }, t), 'login.invalidCredentials')
  assert.equal(
    authErrorMessage({ status: 500, message: 'SQL connection failed' }, t),
    'login.genericError',
  )
})
