/**
 * Тесты для SandboxScreenRenderer
 * 
 * Покрывают критический функционал рендеринга экранов
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import SandboxScreenRenderer from '../SandboxScreenRenderer.jsx';

/**
 * Вспомогательная функция для рендеринга компонента в строку
 */
const renderComponent = (props) => {
  return renderToString(createElement(SandboxScreenRenderer, props));
};

// ============================================================================
// Тесты базового рендеринга
// ============================================================================

test('SandboxScreenRenderer: пустой экран показывает заглушку', () => {
  const html = renderComponent({ screen: null, context: {} });
  assert.match(html, /Нечего отображать/);
});

test('SandboxScreenRenderer: экран без components и sections показывает заглушку', () => {
  const screen = { id: 'empty-screen', name: 'Empty' };
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Нечего отображать/);
});

// ============================================================================
// Тесты рендеринга с components (legacy format)
// ============================================================================

test('SandboxScreenRenderer: рендерит screen с components', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['text-1']
      },
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'Hello World' }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Hello World/);
  assert.match(html, /sandbox-screen/);
});

test('SandboxScreenRenderer: рендерит button с event', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['button-1']
      },
      {
        id: 'button-1',
        type: 'button',
        props: { text: 'Click Me', event: 'onClick' }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Click Me/);
  assert.match(html, /canvas-button/);
  assert.match(html, /data-event="onClick"/);
});

test('SandboxScreenRenderer: рендерит input с name', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['input-1']
      },
      {
        id: 'input-1',
        type: 'input',
        props: { 
          name: 'email',
          placeholder: 'Enter email',
          type: 'email'
        }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /name="email"/);
  assert.match(html, /placeholder="Enter email"/);
  assert.match(html, /type="email"/);
});

// ============================================================================
// Тесты рендеринга с sections (new format)
// ============================================================================

test('SandboxScreenRenderer: рендерит sections формат', () => {
  const screen = {
    id: 'test-screen',
    name: 'Test Screen',
    sections: {
      header: {
        id: 'section-header',
        type: 'Section',
        properties: { slot: 'header' },
        children: [
          {
            id: 'text-1',
            type: 'text',
            properties: { content: 'Header Text' }
          }
        ]
      },
      body: {
        id: 'section-body',
        type: 'Section',
        properties: { slot: 'body' },
        children: [
          {
            id: 'text-2',
            type: 'text',
            properties: { content: 'Body Text' }
          }
        ]
      }
    }
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Header Text/);
  assert.match(html, /Body Text/);
  assert.match(html, /sandbox-section/);
});

// ============================================================================
// Тесты биндингов
// ============================================================================

test('SandboxScreenRenderer: резолвит биндинги в тексте', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['text-1']
      },
      {
        id: 'text-1',
        type: 'text',
        props: { 
          content: { reference: '${user.name}' }
        }
      }
    ]
  };
  
  const context = {
    user: { name: 'John Doe' }
  };
  
  const html = renderComponent({ screen, context });
  assert.match(html, /John Doe/);
});

test('SandboxScreenRenderer: резолвит биндинги в button', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['button-1']
      },
      {
        id: 'button-1',
        type: 'button',
        props: { 
          text: { reference: '${action.label}' }
        }
      }
    ]
  };
  
  const context = {
    action: { label: 'Submit Form' }
  };
  
  const html = renderComponent({ screen, context });
  assert.match(html, /Submit Form/);
});

test('SandboxScreenRenderer: использует fallback при отсутствии значения', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['text-1']
      },
      {
        id: 'text-1',
        type: 'text',
        props: { 
          content: { reference: '${missing.value}', value: 'Fallback Text' }
        }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Fallback Text/);
});

// ============================================================================
// Тесты list рендеринга
// ============================================================================

test('SandboxScreenRenderer: рендерит простой список', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['list-1']
      },
      {
        id: 'list-1',
        type: 'list',
        props: { 
          items: ['Item 1', 'Item 2', 'Item 3']
        },
        children: []
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /Item 1/);
  assert.match(html, /Item 2/);
  assert.match(html, /Item 3/);
});

test('SandboxScreenRenderer: рендерит список с template', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['list-1']
      },
      {
        id: 'list-1',
        type: 'list',
        props: { 
          dataSource: { reference: '${products}' },
          itemAlias: 'product'
        },
        children: ['text-template']
      },
      {
        id: 'text-template',
        type: 'text',
        props: {
          content: { reference: '${product.name}' }
        }
      }
    ]
  };
  
  const context = {
    products: [
      { id: 'p1', name: 'Product A' },
      { id: 'p2', name: 'Product B' },
      { id: 'p3', name: 'Product C' }
    ]
  };
  
  const html = renderComponent({ screen, context });
  assert.match(html, /Product A/);
  assert.match(html, /Product B/);
  assert.match(html, /Product C/);
});

test('SandboxScreenRenderer: рендерит пустой список с placeholder', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['list-1']
      },
      {
        id: 'list-1',
        type: 'list',
        props: { 
          dataSource: { reference: '${items}' }
        },
        children: ['text-template']
      },
      {
        id: 'text-template',
        type: 'text',
        props: { content: 'Template' }
      }
    ]
  };
  
  const context = { items: [] };
  
  const html = renderComponent({ screen, context });
  assert.match(html, /Нет элементов/);
});

// ============================================================================
// Тесты контейнеров
// ============================================================================

test('SandboxScreenRenderer: рендерит column с children', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['column-1']
      },
      {
        id: 'column-1',
        type: 'column',
        props: { spacing: 16 },
        children: ['text-1', 'text-2']
      },
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'First' }
      },
      {
        id: 'text-2',
        type: 'text',
        props: { content: 'Second' }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /sandbox-column/);
  assert.match(html, /First/);
  assert.match(html, /Second/);
});

test('SandboxScreenRenderer: рендерит row с alignment', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['row-1']
      },
      {
        id: 'row-1',
        type: 'row',
        props: { 
          spacing: 8,
          alignItems: 'center',
          justifyContent: 'space-between'
        },
        children: ['text-1', 'text-2']
      },
      {
        id: 'text-1',
        type: 'text',
        props: { content: 'Left' }
      },
      {
        id: 'text-2',
        type: 'text',
        props: { content: 'Right' }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /sandbox-row/);
  assert.match(html, /Left/);
  assert.match(html, /Right/);
});

// ============================================================================
// Тесты image
// ============================================================================

test('SandboxScreenRenderer: рендерит image с src', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['image-1']
      },
      {
        id: 'image-1',
        type: 'image',
        props: { 
          src: 'https://example.com/image.jpg',
          alt: 'Test Image'
        }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /src="https:\/\/example\.com\/image\.jpg"/);
  assert.match(html, /alt="Test Image"/);
});

test('SandboxScreenRenderer: image использует placeholder при отсутствии src', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['image-1']
      },
      {
        id: 'image-1',
        type: 'image',
        props: { alt: 'Placeholder' }
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /via\.placeholder\.com/);
});

// ============================================================================
// Тесты unsupported types
// ============================================================================

test('SandboxScreenRenderer: показывает заглушку для неподдерживаемого типа', () => {
  const screen = {
    id: 'test-screen',
    components: [
      {
        id: 'screen-root',
        type: 'screen',
        children: ['unknown-1']
      },
      {
        id: 'unknown-1',
        type: 'unsupported-component',
        props: {}
      }
    ]
  };
  
  const html = renderComponent({ screen, context: {} });
  assert.match(html, /пока не поддержан/);
});

console.log('✅ Все тесты SandboxScreenRenderer пройдены успешно!');
