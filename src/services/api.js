const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const assetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${apiUrl}/${path.replace(/^\/+/, '')}`
}

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
  const contentType = response.headers.get('content-type') || ''
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const error = new Error(
      typeof responseBody === 'string'
        ? responseBody
        : responseBody.message || `Request failed with status ${response.status}`,
    )
    error.status = response.status
    error.details = typeof responseBody === 'string' ? null : responseBody
    throw error
  }

  if (typeof responseBody === 'string') {
    throw new Error(`Expected JSON from ${path}, received: ${responseBody.slice(0, 200)}`)
  }

  return responseBody
}

export default { request }
