import assert from 'node:assert/strict'
import test from 'node:test'
import { NativeSelect } from '../src/components/ui/input.js'

test('native select commits a variant once, on change', () => {
  const changes = []
  const render = NativeSelect.setup(
    { modelValue: '1' },
    { attrs: { 'aria-label': 'Product option' }, slots: {}, emit: (...args) => changes.push(args) },
  )
  const vnode = render()
  const event = { target: { value: '2' } }
  vnode.props.onInput(event)
  assert.equal(changes.length, 0)
  vnode.props.onChange(event)
  assert.deepEqual(changes, [['update:modelValue', '2']])
  assert.equal(vnode.props['aria-label'], 'Product option')
})
