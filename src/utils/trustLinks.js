const socialPlatforms = [
  {
    name: 'Facebook',
    field: 'site_facebook_url',
    hosts: ['facebook.com', 'fb.com'],
    path: 'M14 8h3V4h-3c-3.3 0-5 1.8-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z',
  },
  {
    name: 'Twitter',
    field: 'site_twitter_url',
    hosts: ['twitter.com', 'x.com'],
    path: 'M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.7L6.3 21H3.5l6.5-7.5L3 3h5.7l4 6.1L18.2 3Zm-1 16h1.6L7.8 4.9H6.1L17.2 19Z',
  },
  {
    name: 'Instagram',
    field: 'site_instagram_url',
    hosts: ['instagram.com'],
    path: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm1 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm9-5h.01',
  },
  {
    name: 'LinkedIn',
    field: 'site_linkedin_url',
    hosts: ['linkedin.com'],
    path: 'M5 8H2v13h3V8Zm.2-4.2C5.2 2.8 4.5 2 3.5 2S1.8 2.8 1.8 3.8s.7 1.8 1.7 1.8 1.7-.8 1.7-1.8ZM22 13.6c0-3.9-2.1-5.9-5-5.9-2.3 0-3.3 1.3-3.9 2.2V8H10v13h3v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V21h3l.3-7.4Z',
  },
  {
    name: 'YouTube',
    field: 'site_youtube_url',
    hosts: ['youtube.com', 'youtu.be'],
    path: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12s0-3.2-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z',
  },
  {
    name: 'Telegram',
    field: 'site_telegram_url',
    hosts: ['t.me', 'telegram.me'],
    path: 'm21.6 3.4-3 17.1c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 14.1l-5-1.6c-1.1-.3-1.1-1 .2-1.5L20.7 3c.9-.3 1.5.2.9.4Z',
  },
]

const policyFields = [
  { field: 'site_privacy_url', key: 'store.privacy' },
  { field: 'site_terms_url', key: 'store.terms' },
  { field: 'site_shipping_policy_url', key: 'store.shippingPolicy' },
]

const httpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url : null
  } catch {
    return null
  }
}

const matchesHost = (hostname, hosts) =>
  hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))

export const verifiedSocialLinks = (settings = {}) => {
  const seen = new Set()
  return socialPlatforms.flatMap((platform) => {
    const url = httpUrl(settings[platform.field])
    if (!url || !matchesHost(url.hostname.toLowerCase(), platform.hosts)) return []
    if (url.pathname === '/' && !url.search && !url.hash) return []
    const href = url.href
    if (seen.has(href)) return []
    seen.add(href)
    return [{ ...platform, href }]
  })
}

export const verifiedPolicyLinks = (settings = {}) => {
  const seen = new Set()
  return policyFields.flatMap((policy) => {
    const url = httpUrl(settings[policy.field])
    if (!url || seen.has(url.href)) return []
    seen.add(url.href)
    return [{ ...policy, href: url.href }]
  })
}
