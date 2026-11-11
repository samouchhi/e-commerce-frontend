import api from './api'

export const deleteAddress = (id) => api.request(`/api/addresses/${id}`, { method: 'DELETE' })

export const getAddresses = async () => {
  const payload = await api.request('/api/addresses')
  const addresses = Array.isArray(payload) ? payload : payload.data
  if (!Array.isArray(addresses)) throw new Error('Invalid address response')
  return addresses
}
