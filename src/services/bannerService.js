import api from './api'

export const getBanners = async () => {
  const payload = await api.request('/api/banners')
  const banners = Array.isArray(payload) ? payload : payload.data || []
  return banners.slice().sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
}
