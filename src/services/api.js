const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const request = async (path, options = {}) => {
  const token = localStorage.getItem('auth-token')
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`)
    error.status = response.status
    try {
      error.details = await response.json()
    } catch {
      error.details = null
    }
    throw error
  }
  return response.json()
}

export default { request }
