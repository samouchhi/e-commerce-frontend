import api from './api'

export const getProducts = async () => {
  const payload = await api.request('/api/products')
  return Array.isArray(payload) ? payload : payload.data || []
}
