import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignContextValue,
  buildContextFromVariables,
  normalizeComponents
} from '../utils.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

test('assignContextValue creates nested structure', () => {
  const target = {};
  assignContextValue(target, 'data.order.total', 1200);
  assert.deepEqual(target, { data: { order: { total: 1200 } } });
});

test('buildContextFromVariables maps dotted names', () => {
  const context = buildContextFromVariables({
    'data.user.email': { value: 'buyer@example.com' },
    status: { value: 'draft' }
  });

  assert.equal(context.status, 'draft');
  assert.equal(context.data.user.email, 'buyer@example.com');
});

test('normalizeComponents attaches floating components to body section and sanitizes screen', () => {
  const ComponentsInput = [
    {
      id: 'screen-root',
      type: 'screen',
      parentId: null,
      children: [],
      props: {},
      style: { padding: '32px 40px 48px' }
    },
    {
      id: 'floating-container',
      type: 'container',
      parentId: null,
      children: [],
      props: { background: '#ffffff' },
      style: {}
    }
  ];

  const result = normalizeComponents(clone(ComponentsInput));
  const screen = result.find((component) => component.id === 'screen-root');
  assert.ok(screen, 'expected screen component to exist');
  assert.equal(screen.style.padding, 'var(--screen-padding, 0px)');

  const bodySection = result.find((component) => component.props?.section === 'body');
  assert.ok(bodySection, 'body section should be created');

  const floating = result.find((component) => component.id === 'floating-container');
  assert.equal(floating.type, 'container');
  assert.equal(floating.parentId, bodySection.id);
  assert.ok(bodySection.children.includes('floating-container'));
  assert.equal(floating.style.background, '#ffffff');
});
