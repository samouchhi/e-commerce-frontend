import api from './api'

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const createOrder = (payload) =>
  api.request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const generateOrderPayment = async (orderId) => {
  const token = localStorage.getItem('auth-token')
  const response = await fetch(`${apiUrl}/api/orders/${orderId}/payment`, {
    headers: {
      Accept: 'image/png',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    let message = 'The payment QR code could not be generated.'
    try {
      const payload = await response.json()
      message = payload.message || payload.error || message
    } catch {
      // The backend may return a non-JSON error response.
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('image/')) {
    throw new Error('The payment endpoint did not return a QR image.')
  }

  const blob = await response.blob()
  const preview = await blob.slice(0, 32).text()
  if (preview.startsWith('data:image/')) {
    return await blob.text()
  }

  return URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'image/png' }))
}

export const verifyOrderPayment = (orderId) => api.request(`/api/orders/${orderId}/verify`)
