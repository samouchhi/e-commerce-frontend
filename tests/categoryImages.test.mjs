import assert from 'node:assert/strict'
import test from 'node:test'
import { categoryImages } from '../src/utils/categoryImages.js'

test('category artwork uses its own image then photos from matching active products in display order', () => {
  assert.deepEqual(
    categoryImages({ id: 1, image_url: '/category.jpg' }, [
      {
        category: { id: '1' },
        images: [
          { image_path: 'second.jpg', sort_order: 2 },
          { image_url: '/first.jpg', sort_order: 1 },
        ],
      },
      { category_id: 1, images: [{ image_url: '/first.jpg' }] },
      { category_id: 2, images: [{ image_url: '/unrelated.jpg' }] },
      { category_id: 1, is_active: false, images: [{ image_url: '/hidden.jpg' }] },
    ]),
    ['/category.jpg', '/first.jpg', '/storage/second.jpg'],
  )
})

test('categories without artwork or matching products keep a text link', () => {
  assert.deepEqual(
    categoryImages({ id: 2 }, [{ category_id: 1, images: [{ image_url: '/drink.jpg' }] }]),
    [],
  )
  assert.deepEqual(categoryImages({ id: 2, image_path: 'nest.jpg' }), ['/storage/nest.jpg'])
})
