import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyContextPatch,
  resolveBindingValue,
  normalizeReference,
  cloneContext
} from '../bindings.js';

const baseContext = Object.freeze({
  data: {
    order: {
      total: 0,
      totalFormatted: '0 ₽'
    },
    cart: {
      items: [
        { id: 'item-1', title: 'First', price: 1299 },
        { id: 'item-2', title: 'Second', price: 899 }
      ]
    },
    user: {
      email: 'initial@example.com'
    }
  },
  ui: {
    notifications: {
      lastAction: ''
    }
  }
});

test('normalizeReference strips template syntax', () => {
  assert.equal(normalizeReference('${foo.bar}'), 'foo.bar');
  assert.equal(normalizeReference('${baz}'), 'baz');
  assert.equal(normalizeReference('plain.path'), 'plain.path');
});

test('resolveBindingValue honours iteration stack aliases', () => {
  const iterationStack = [
    { alias: 'product', item: { id: 'a-1', title: 'Title' }, index: 2, total: 5 }
  ];
  const binding = { reference: '${product.title}' };
  const value = resolveBindingValue(binding, {}, 'fallback', { iterationStack });
  assert.equal(value, 'Title');

  const indexBinding = { reference: '${productIndex}' };
  const indexValue = resolveBindingValue(indexBinding, {}, 'fallback', { iterationStack });
  assert.equal(indexValue, 2);
});

test('applyContextPatch flattens nested objects and recalculates totals', () => {
  const context = cloneContext(baseContext);
  const patch = {
    'data.user.email': 'patched@example.com',
    data: {
      cart: {
        items: [
          { id: 'item-3', title: 'Third', price: 2500 },
          { id: 'item-4', title: 'Fourth', price: 1500 }
        ]
      }
    }
  };

  const next = applyContextPatch(context, patch, context);

  assert.equal(next.data.user.email, 'patched@example.com');
  assert.equal(next.data.cart.items.length, 2);
  assert.equal(next.data.order.total, 4000);
  assert.equal(next.data.order.totalFormatted, '4 000 ₽');
});
