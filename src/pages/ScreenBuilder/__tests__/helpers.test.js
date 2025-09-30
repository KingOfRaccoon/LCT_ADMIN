import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFallbackUpdate,
  collectSuggestionsFromSamples,
  collectSuggestionsFromSchema,
  coerceRenderableValue,
  createBindingValue,
  createReference,
  formatSampleValue,
  getBindingFallbackValue,
  getBindingVariableName,
  isBindingValue,
  isDeepEqual,
  normalizeReference,
  resolvePropValue,
  sanitizePlainObject
} from '../helpers.js';

const mapToObject = (map) => Object.fromEntries(map.entries());

test('normalizeReference handles nested placeholders', () => {
  assert.equal(normalizeReference('${data.order.total}'), 'data.order.total');
  assert.equal(normalizeReference('$data.order.total'), 'data.order.total');
  assert.equal(normalizeReference('data.order.total'), 'data.order.total');
  assert.equal(normalizeReference(42), '');
});

test('createBindingValue wraps fallback and reference', () => {
  const binding = createBindingValue('Total', 'data.order.total');
  assert.equal(binding.value, 'Total');
  assert.equal(binding.reference, '${data.order.total}');
  assert.ok(isBindingValue(binding));
  assert.equal(getBindingVariableName(binding), 'data.order.total');
  assert.equal(getBindingFallbackValue(binding), 'Total');
});

test('applyFallbackUpdate preserves reference', () => {
  const binding = createBindingValue('Old', 'data.user.name');
  const updated = applyFallbackUpdate(binding, 'New');
  assert.equal(updated.value, 'New');
  assert.equal(updated.reference, '${data.user.name}');
});

test('sanitizePlainObject retains bindings and strips nullish values', () => {
  const input = {
    title: createBindingValue('Title', 'screen.title'),
    tags: [null, 'primary', createBindingValue('Fallback', 'data.tag')],
    nested: {
      count: null,
      label: undefined,
      deep: { value: 'ok' }
    }
  };

  const sanitized = sanitizePlainObject(input);
  assert.deepEqual(sanitized.title, {
    value: 'Title',
    reference: '${screen.title}'
  });
  assert.equal(sanitized.tags.length, 2);
  assert.deepEqual(sanitized.tags[1], {
    value: 'Fallback',
    reference: '${data.tag}'
  });
  assert.deepEqual(sanitized.nested.deep.value, 'ok');
});

test('collect suggestions from schema and samples', () => {
  const schema = {
    data: {
      order: {
        total: { path: 'data.order.total' },
        items: { path: 'data.order.items' }
      }
    }
  };

  const samples = [
    {
      data: {
        order: { total: 1200, items: [{ name: 'Bag', price: 199 }] }
      }
    }
  ];

  const suggestions = collectSuggestionsFromSamples(samples, collectSuggestionsFromSchema(schema));
  const serialized = mapToObject(suggestions);

  assert.ok(serialized['data.order.total']);
  assert.equal(serialized['data.order.items'].source, 'schema');
  assert.equal(serialized['data.order.total'].sampleValue, formatSampleValue(1200));
});

test('resolvePropValue unwraps binding fallback', () => {
  const props = {
    label: createBindingValue('Pay now', 'data.cta')
  };

  assert.equal(resolvePropValue(props, 'label', ''), 'Pay now');
  assert.equal(resolvePropValue({}, 'missing', 'Default'), 'Default');
});

test('coerceRenderableValue formats complex data', () => {
  assert.equal(coerceRenderableValue(['Bag', 'Shoes']), 'Bag, Shoes');
  assert.equal(coerceRenderableValue({ label: 'Checkout' }), 'Checkout');
  assert.equal(coerceRenderableValue(null), '');
});

test('isDeepEqual compares serializable objects', () => {
  const first = { a: 1, b: { c: 2 } };
  const second = { a: 1, b: { c: 2 } };
  assert.ok(isDeepEqual(first, second));
  assert.ok(!isDeepEqual(first, { a: 2 }));
});

test('createReference returns empty string for missing input', () => {
  assert.equal(createReference(''), '');
  assert.equal(createReference(null), '');
  assert.equal(createReference('data.status'), '${data.status}');
});
