import { galleryImages } from './productDetail.js'

export const categoryImages = (category, products = []) => {
  const images = [
    category,
    ...products
      .filter(
        (product) =>
          String(product.category?.id ?? product.category_id) === String(category.id) &&
          product.is_active !== false,
      )
      .flatMap((product) => galleryImages(product)),
  ]
  return [
    ...new Set(
      images
        .map((image) => image.image_url || (image.image_path ? `/storage/${image.image_path}` : ''))
        .filter(Boolean),
    ),
  ]
}
