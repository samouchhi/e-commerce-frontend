import { getToken, validateSession, safeReturnPath } from './authService'

// Login and registration share one guest route. A stored token alone is not a session.
export const guestMiddleware = async (to) => {
  if (!to.meta.guestOnly || !getToken()) return
  try {
    await validateSession()
  } catch {
    // Expired auth is cleared by validateSession. Network failures keep sign-in usable.
    return
  }
  return safeReturnPath(to.query.redirect, '/orders')
}

// Keep authentication failures distinct from verification or navigation failures.
export const finishSignIn = async (redirect, router) => {
  try {
    await validateSession()
  } catch (error) {
    return [401, 403].includes(error.status) ? 'session.expired' : 'session.retryHelp'
  }
  try {
    await router.replace(safeReturnPath(redirect))
    return ''
  } catch {
    return 'session.navigationError'
  }
}
