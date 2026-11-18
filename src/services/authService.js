import api from './api'

const TOKEN_KEY = 'auth-token'
const USER_KEY = 'auth-user'

const getToken = () => localStorage.getItem(TOKEN_KEY)
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}
const isAuthenticated = () => Boolean(getToken())

const notifyAuthChange = () => window.dispatchEvent(new Event('auth-updated'))

const saveSession = (payload, fallbackUser) => {
  const token =
    payload.token || payload.access_token || payload.data?.token || payload.data?.access_token
  const user = payload.user || payload.data?.user || fallbackUser
  if (!token) throw new Error('The login response did not include an access token.')
  localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  notifyAuthChange()
  return payload
}

export const login = async (credentials) =>
  saveSession(
    await api.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    { email: credentials.email },
  )

export const register = (credentials) =>
  api.request('/api/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

export const verifyOtp = async (credentials) =>
  saveSession(
    await api.request('/api/verify-otp', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    { email: credentials.email },
  )

export const resendOtp = (email) =>
  api.request('/api/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const forgotPassword = (email) =>
  api.request('/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const resetPassword = (credentials) =>
  api.request('/api/reset-password', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

export const logout = async () => {
  try {
    await api.request('/api/logout', { method: 'POST' })
  } finally {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    notifyAuthChange()
  }
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  notifyAuthChange()
}

// A stored token is a candidate session; the server decides whether it is valid.
export const validateSession = async () => {
  const token = getToken()
  if (!token) {
    const error = new Error('Sign in to continue.')
    error.status = 401
    throw error
  }
  try {
    const user = await api.request('/api/user')
    if (getToken() !== token) {
      const error = new Error('Your session changed. Please try again.')
      error.status = 401
      throw error
    }
    if (!user?.id) throw new Error('Unable to verify your account.')
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    notifyAuthChange()
    return user
  } catch (error) {
    if ([401, 403].includes(error.status) && getToken() === token) clearSession()
    throw error
  }
}

export const changePassword = async (credentials) => {
  const token = getToken()
  const result = await api.request('/api/change-password', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  if (getToken() === token) clearSession()
  return result
}

export const safeReturnPath = (value, fallback = '/checkout') => {
  if (typeof value !== 'string' || /[\\\u0000-\u001f]/.test(value)) return fallback
  const path = value.split(/[?#]/)[0]
  return ['/checkout', '/orders', '/change-password', '/', '/products'].includes(path)
    ? value
    : fallback
}

export { getToken, getUser, isAuthenticated }
