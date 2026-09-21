import { ref } from 'vue'

const translations = {
  en: {
    nav: {
      home: 'Home',
      products: 'Products',
      promotions: 'Promotions',
      category: 'Category',
      profile: 'Profile',
      cart: 'Shopping bag',
    },
    footer: {
      contact: 'Contact',
      follow: 'Follow',
      payment: 'We Accept',
    },
    home: {
      popular: 'Most Popular Products',
      viewAll: 'View All',
      promotions: 'Promotions',
      newArrivals: 'New Arrivals',
      expireOn: 'Expire on',
      loadError: 'Unable to load the collection.',
    },
    products: {
      title: 'All Products',
      search: 'Search',
      sort: 'Sort products',
      nameAsc: 'Name (A-Z)',
      nameDesc: 'Name (Z-A)',
      bestSeller: 'Best Seller',
      newArrival: 'New Arrival',
      all: 'All',
      noMatch: 'No products match your selection.',
    },
    promotions: {
      title: 'Promotions',
      loadError: 'Unable to load the promotions.',
      empty: 'No promotions are running right now. Check back soon.',
      expireOn: 'Expire on',
    },
    categories: {
      empty: 'No categories yet.',
      loadError: 'Unable to load the categories.',
      items: 'items',
    },
    language: {
      english: 'English',
      khmer: 'ខ្មែរ',
    },
  },
  km: {
    nav: {
      home: 'ទំព័រដើម',
      products: 'ផលិតផល',
      promotions: 'ប្រូម៉ូសិន',
      category: 'ប្រភេទ',
      profile: 'គណនី',
      cart: 'កន្ត្រកទិញទំនិញ',
    },
    footer: {
      contact: 'ទំនាក់ទំនង',
      follow: 'តាមដាន',
      payment: 'ការទូទាត់',
    },
    home: {
      popular: 'ផលិតផលពេញនិយម',
      viewAll: 'មើលទាំងអស់',
      promotions: 'ប្រូម៉ូសិន',
      newArrivals: 'ផលិតផលថ្មី',
      expireOn: 'ផុតកំណត់នៅ',
      loadError: 'មិនអាចផ្ទុកបណ្តុំផលិតផលបានទេ។',
    },
    products: {
      title: 'ផលិតផលទាំងអស់',
      search: 'ស្វែងរក',
      sort: 'តម្រៀបផលិតផល',
      nameAsc: 'ឈ្មោះ (ក-អ)',
      nameDesc: 'ឈ្មោះ (អ-ក)',
      bestSeller: 'លក់ដាច់បំផុត',
      newArrival: 'ផលិតផលថ្មី',
      all: 'ទាំងអស់',
      noMatch: 'មិនមានផលិតផលត្រូវនឹងជម្រើសរបស់អ្នកទេ។',
    },
    promotions: {
      title: 'ប្រូម៉ូសិន',
      loadError: 'មិនអាចផ្ទុកប្រូម៉ូសិនបានទេ។',
      empty: 'មិនមានប្រូម៉ូសិនកំពុងដំណើរការទេ។ សូមត្រឡប់មកពិនិត្យម្តងទៀត។',
      expireOn: 'ផុតកំណត់នៅ',
    },
    categories: {
      empty: 'មិនទាន់មានប្រភេទទេ។',
      loadError: 'មិនអាចផ្ទុកប្រភេទបានទេ។',
      items: 'មុខទំនិញ',
    },
    language: {
      english: 'English',
      khmer: 'ខ្មែរ',
    },
  },
}

const savedLocale =
  typeof localStorage === 'undefined' ? null : localStorage.getItem('storefront-locale')

export const locale = ref(savedLocale === 'km' ? 'km' : 'en')

const findTranslation = (messages, key) =>
  key.split('.').reduce((value, part) => value?.[part], messages)

export const translate = (currentLocale, key) =>
  findTranslation(translations[currentLocale], key) || findTranslation(translations.en, key) || key

export const t = (key) => translate(locale.value, key)

export const setLocale = (nextLocale) => {
  locale.value = nextLocale === 'km' ? 'km' : 'en'

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('storefront-locale', locale.value)
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value === 'km' ? 'km' : 'en'
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = locale.value === 'km' ? 'km' : 'en'
}
