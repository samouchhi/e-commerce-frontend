import api from './api'

export const createOrder = (payload) =>
  api.request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const generateOrderPayment = async (orderId) => {
  const payment = await api.request('/api/orders/' + orderId + '/payment', {
    method: 'POST',
  })

  if (
    typeof payment.qr_image !== 'string' ||
    !payment.qr_image.startsWith('data:image/png;base64,')
  ) {
    throw new Error('The payment response did not include a valid QR image.')
  }

  if (!Number.isFinite(Date.parse(payment.expires_at))) {
    throw new Error('The payment response did not include a valid QR expiry.')
  }

  return payment
}

export const verifyOrderPayment = (orderId, options) =>
  api.request('/api/orders/' + orderId + '/verify', options)
