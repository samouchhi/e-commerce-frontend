import api from './api'

export const getCategories = async () => {
  const payload = await api.request('/api/categories')
  return Array.isArray(payload) ? payload : payload.data || []
}
