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

export const register = async (credentials) =>
  saveSession(
    await api.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    { email: credentials.email },
  )

export const logout = async () => {
  try {
    await api.request('/api/logout', { method: 'POST' })
  } finally {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    notifyAuthChange()
  }
}

export { getToken, getUser, isAuthenticated }
