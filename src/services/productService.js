import api from './api'

export const getProducts = async () => {
  const payload = await api.request('/api/products')
  const products = Array.isArray(payload) ? payload : payload.data || []
  return products.filter((product) => product.is_active === true)
}
