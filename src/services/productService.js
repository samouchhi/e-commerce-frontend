import api from './api'

const MAX_PAGES = 12

const fetchPage = async (page) => {
  const payload = await api.request(`/api/products?page=${page}`)
  const products = (Array.isArray(payload) ? payload : payload.data || []).filter(
    (product) => product.is_active === true,
  )
  return { products, lastPage: Number(payload?.meta?.last_page) || 1 }
}

export const getProducts = async () => {
  const first = await fetchPage(1)
  const remainingPages = Math.min(first.lastPage - 1, MAX_PAGES - 1)
  if (remainingPages < 1) return first.products

  const rest = await Promise.all(
    Array.from({ length: remainingPages }, (_, index) => fetchPage(index + 2)),
  )

  return rest.reduce((products, page) => products.concat(page.products), first.products)
}
