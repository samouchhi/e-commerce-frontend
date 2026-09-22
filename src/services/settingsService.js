import api from './api'

export const getSettings = async () => {
  const payload = await api.request('/api/settings')
  return payload?.data || payload || {}
}
