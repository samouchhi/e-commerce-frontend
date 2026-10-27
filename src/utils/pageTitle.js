export const pageTitle = ({ route, storeName = 'MongKol', productName = '', translate }) => {
  const pageName =
    route.name === 'product-detail'
      ? productName
      : route.meta?.titleKey
        ? translate(route.meta.titleKey)
        : ''
  return pageName && pageName !== storeName ? `${pageName} | ${storeName}` : storeName
}
