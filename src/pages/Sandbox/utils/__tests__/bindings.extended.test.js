/**
 * Расширенные тесты для bindings.js
 * 
 * Покрывают все критические сценарии резолва биндингов
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBindingValue,
  normalizeReference,
  getContextValue,
  resolveBindingValue,
  resolvePropValue,
  cloneContext,
  applyContextPatch
} from '../bindings.js';

// ============================================================================
// Тесты isBindingValue
// ============================================================================

test('isBindingValue: определяет биндинг по наличию reference', () => {
  assert.equal(isBindingValue({ reference: '${foo}' }), true);
  assert.equal(isBindingValue({ reference: '${bar.baz}' }), true);
});

test('isBindingValue: возвращает false для не-биндингов', () => {
  assert.equal(isBindingValue('string'), false);
  assert.equal(isBindingValue(123), false);
  assert.equal(isBindingValue(null), false);
  assert.equal(isBindingValue(undefined), false);
  assert.equal(isBindingValue({}), false);
  assert.equal(isBindingValue({ value: 'test' }), false);
});

// ============================================================================
// Тесты normalizeReference
// ============================================================================

test('normalizeReference: убирает ${} синтаксис', () => {
  assert.equal(normalizeReference('${user.name}'), 'user.name');
  assert.equal(normalizeReference('${cart.total}'), 'cart.total');
  assert.equal(normalizeReference('${items}'), 'items');
});

test('normalizeReference: оставляет plain пути как есть', () => {
  assert.equal(normalizeReference('user.name'), 'user.name');
  assert.equal(normalizeReference('data'), 'data');
});

test('normalizeReference: обрабатывает пустые значения', () => {
  assert.equal(normalizeReference(''), '');
  assert.equal(normalizeReference(null), '');
  assert.equal(normalizeReference(undefined), '');
});

// ============================================================================
// Тесты getContextValue
// ============================================================================

test('getContextValue: получает вложенные значения', () => {
  const context = {
    user: {
      profile: {
        name: 'John Doe',
        age: 30
      }
    }
  };
  
  assert.equal(getContextValue(context, 'user.profile.name'), 'John Doe');
  assert.equal(getContextValue(context, 'user.profile.age'), 30);
});

test('getContextValue: получает значения из массивов', () => {
  const context = {
    items: [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' }
    ]
  };
  
  assert.equal(getContextValue(context, 'items.0.name'), 'First');
  assert.equal(getContextValue(context, 'items.1.name'), 'Second');
  assert.equal(getContextValue(context, 'items.0.id'), 1);
});

test('getContextValue: возвращает undefined для несуществующих путей', () => {
  const context = { user: { name: 'John' } };
  
  assert.equal(getContextValue(context, 'user.missing'), undefined);
  assert.equal(getContextValue(context, 'missing.path.deep'), undefined);
});

test('getContextValue: обрабатывает null/undefined в пути', () => {
  const context = {
    data: {
      user: null
    }
  };
  
  assert.equal(getContextValue(context, 'data.user.name'), undefined);
});

test('getContextValue: обрабатывает string заглушки (None, False, True)', () => {
  const context = {
    none: 'None',
    falsе: 'False',
    truе: 'True'
  };
  
  assert.equal(getContextValue(context, 'none.property'), undefined);
  assert.equal(getContextValue(context, 'falsе.property'), undefined);
  assert.equal(getContextValue(context, 'truе.property'), undefined);
});

// ============================================================================
// Тесты resolveBindingValue
// ============================================================================

test('resolveBindingValue: резолвит простые биндинги', () => {
  const context = { userName: 'Alice' };
  const binding = { reference: '${userName}' };
  
  assert.equal(resolveBindingValue(binding, context), 'Alice');
});

test('resolveBindingValue: резолвит вложенные биндинги', () => {
  const context = {
    data: {
      order: {
        total: 5000
      }
    }
  };
  const binding = { reference: '${data.order.total}' };
  
  assert.equal(resolveBindingValue(binding, context), 5000);
});

test('resolveBindingValue: использует fallback value при отсутствии', () => {
  const binding = { reference: '${missing}', value: 'Default' };
  
  assert.equal(resolveBindingValue(binding, {}), 'Default');
});

test('resolveBindingValue: использует переданный fallback', () => {
  const binding = { reference: '${missing}' };
  
  assert.equal(resolveBindingValue(binding, {}, 'Fallback'), 'Fallback');
});

test('resolveBindingValue: возвращает не-биндинги как есть', () => {
  assert.equal(resolveBindingValue('plain string', {}), 'plain string');
  assert.equal(resolveBindingValue(123, {}), 123);
  assert.equal(resolveBindingValue(true, {}), true);
});

test('resolveBindingValue: обрабатывает iteration stack', () => {
  const context = {};
  const iterationStack = [
    {
      alias: 'item',
      item: { id: 'a1', title: 'Product A' },
      index: 0,
      total: 3
    }
  ];
  
  const binding1 = { reference: '${item.title}' };
  assert.equal(
    resolveBindingValue(binding1, context, undefined, { iterationStack }),
    'Product A'
  );
  
  const binding2 = { reference: '${itemIndex}' };
  assert.equal(
    resolveBindingValue(binding2, context, undefined, { iterationStack }),
    0
  );
  
  const binding3 = { reference: '${itemTotal}' };
  assert.equal(
    resolveBindingValue(binding3, context, undefined, { iterationStack }),
    3
  );
});

test('resolveBindingValue: приоритет iteration stack над context', () => {
  const context = { item: 'context value' };
  const iterationStack = [
    { alias: 'item', item: 'stack value', index: 0, total: 1 }
  ];
  
  const binding = { reference: '${item}' };
  assert.equal(
    resolveBindingValue(binding, context, undefined, { iterationStack }),
    'stack value'
  );
});

// ============================================================================
// Тесты resolvePropValue
// ============================================================================

test('resolvePropValue: резолвит prop с биндингом', () => {
  const props = {
    text: { reference: '${label}' }
  };
  const context = { label: 'Submit' };
  
  assert.equal(resolvePropValue(props, 'text', context), 'Submit');
});

test('resolvePropValue: возвращает обычное значение prop', () => {
  const props = { text: 'Plain Text' };
  
  assert.equal(resolvePropValue(props, 'text', {}), 'Plain Text');
});

test('resolvePropValue: использует fallback для отсутствующего prop', () => {
  const props = {};
  
  assert.equal(resolvePropValue(props, 'missing', {}, 'Default'), 'Default');
});

// ============================================================================
// Тесты cloneContext
// ============================================================================

test('cloneContext: создаёт глубокую копию', () => {
  const original = {
    user: { name: 'John' },
    items: [1, 2, 3]
  };
  
  const cloned = cloneContext(original);
  
  assert.notEqual(cloned, original);
  assert.notEqual(cloned.user, original.user);
  assert.notEqual(cloned.items, original.items);
  assert.deepEqual(cloned, original);
});

test('cloneContext: изменения в клоне не влияют на оригинал', () => {
  const original = {
    user: { name: 'John' }
  };
  
  const cloned = cloneContext(original);
  cloned.user.name = 'Jane';
  
  assert.equal(original.user.name, 'John');
  assert.equal(cloned.user.name, 'Jane');
});

// ============================================================================
// Тесты applyContextPatch
// ============================================================================

test('applyContextPatch: применяет простые изменения', () => {
  const context = { counter: 0 };
  const patch = { counter: 5 };
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(result.counter, 5);
});

test('applyContextPatch: применяет вложенные изменения через точечную нотацию', () => {
  const context = {
    user: { name: 'John', email: 'john@example.com' }
  };
  const patch = {
    'user.name': 'Jane'
  };
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(result.user.name, 'Jane');
  assert.equal(result.user.email, 'john@example.com');
});

test('applyContextPatch: мержит вложенные объекты', () => {
  const context = {
    data: {
      order: { id: 1, status: 'pending' }
    }
  };
  const patch = {
    data: {
      order: { status: 'completed' }
    }
  };
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(result.data.order.id, 1);
  assert.equal(result.data.order.status, 'completed');
});

test('applyContextPatch: пересчитывает order.total из cart.items', () => {
  const context = {
    data: {
      cart: {
        items: [
          { id: 'i1', price: 1000 },
          { id: 'i2', price: 2000 }
        ]
      },
      order: {
        total: 0,
        totalFormatted: '0 ₽'
      }
    }
  };
  const patch = {};
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(result.data.order.total, 3000);
  assert.equal(result.data.order.totalFormatted, '3 000 ₽');
});

test('applyContextPatch: обновляет total при изменении cart.items', () => {
  const context = {
    data: {
      cart: {
        items: [{ id: 'i1', price: 1000 }]
      },
      order: { total: 1000 }
    }
  };
  
  const patch = {
    data: {
      cart: {
        items: [
          { id: 'i1', price: 1000 },
          { id: 'i2', price: 1500 }
        ]
      }
    }
  };
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(result.data.order.total, 2500);
  assert.match(result.data.order.totalFormatted, /2 500/);
});

test('applyContextPatch: не изменяет оригинальный context', () => {
  const context = { counter: 0 };
  const patch = { counter: 10 };
  
  const result = applyContextPatch(context, patch, context);
  
  assert.equal(context.counter, 0);
  assert.equal(result.counter, 10);
});

// ============================================================================
// Граничные случаи
// ============================================================================

test('resolveBindingValue: обрабатывает массивы в биндингах', () => {
  const context = {
    items: [1, 2, 3]
  };
  const binding = { reference: '${items}' };
  
  const result = resolveBindingValue(binding, context);
  assert.deepEqual(result, [1, 2, 3]);
});

test('resolveBindingValue: обрабатывает объекты в биндингах', () => {
  const context = {
    user: { name: 'John', age: 30 }
  };
  const binding = { reference: '${user}' };
  
  const result = resolveBindingValue(binding, context);
  assert.deepEqual(result, { name: 'John', age: 30 });
});

test('getContextValue: обрабатывает пустой path', () => {
  const context = { data: 'value' };
  assert.equal(getContextValue(context, ''), undefined);
  assert.equal(getContextValue(context, null), undefined);
});

console.log('✅ Все расширенные тесты bindings.js пройдены успешно!');
