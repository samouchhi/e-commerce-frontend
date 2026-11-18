import assert from 'node:assert/strict'
import test from 'node:test'
import { verifiedPolicyLinks, verifiedSocialLinks } from '../src/utils/trustLinks.js'

test('social links require a real profile on the matching platform', () => {
  const links = verifiedSocialLinks({
    site_facebook_url: 'https://facebook.com/',
    site_twitter_url: 'https://facebook.com/',
    site_instagram_url: 'javascript:alert(1)',
    site_telegram_url: 'https://t.me/mongkol',
  })
  assert.deepEqual(
    links.map(({ name, href }) => ({ name, href })),
    [{ name: 'Telegram', href: 'https://t.me/mongkol' }],
  )
})

test('policy links allow unique http destinations only', () => {
  const links = verifiedPolicyLinks({
    site_privacy_url: 'https://example.com/privacy',
    site_terms_url: 'https://example.com/privacy',
    site_shipping_policy_url: 'data:text/html,test',
  })
  assert.deepEqual(
    links.map(({ key }) => key),
    ['store.privacy'],
  )
})
