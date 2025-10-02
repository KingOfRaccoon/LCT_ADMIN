/**
 * Тестовый пример использования Workflow Integration
 * 
 * Запустите в консоли браузера для проверки работы интеграции
 */

import { mapGraphDataToWorkflow } from '../utils/workflowMapper.js';
import { WorkflowAPI } from '../services/workflowApi.js';

// ============================================
// Пример 1: Простой Screen Flow
// ============================================

export async function testSimpleFlow() {
  console.log('🧪 Test 1: Simple Screen Flow');

  const graphData = {
    nodes: [
      {
        id: 'start',
        type: 'screen',
        data: {
          label: 'Начальный экран',
          screenId: 'screen-start',
          start: true
        }
      },
      {
        id: 'end',
        type: 'screen',
        data: {
          label: 'Конечный экран',
          final: true
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'start',
        target: 'end',
        data: {
          event: 'next',
          label: 'Далее'
        }
      }
    ]
  };

  const initialContext = {
    user: {
      name: 'Test User'
    }
  };

  try {
    const workflow = mapGraphDataToWorkflow(graphData, initialContext);
    console.log('✅ Workflow converted:', workflow);

    const api = new WorkflowAPI('https://sandkittens.me');
    const response = await api.saveWorkflow(workflow.states, workflow.predefined_context);
    
    console.log('✅ Server response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// ============================================
// Пример 2: Flow с API вызовом
// ============================================

export async function testApiCallFlow() {
  console.log('🧪 Test 2: API Call Integration Flow');

  const graphData = {
    nodes: [
      {
        id: 'loading',
        type: 'screen',
        data: {
          label: 'Загрузка данных',
          start: true
        }
      },
      {
        id: 'api-call',
        type: 'action',
        data: {
          label: 'Запрос к API',
          actionType: 'api-call',
          config: {
            url: 'https://jsonplaceholder.typicode.com/users/1',
            method: 'GET',
            params: {},
            resultVariable: 'userData'
          }
        }
      },
      {
        id: 'success',
        type: 'screen',
        data: {
          label: 'Данные получены',
          final: true
        }
      }
    ],
    edges: [
      {
        source: 'loading',
        target: 'api-call',
        data: { event: 'load' }
      },
      {
        source: 'api-call',
        target: 'success'
      }
    ]
  };

  const initialContext = {
    userData: null
  };

  try {
    const workflow = mapGraphDataToWorkflow(graphData, initialContext);
    console.log('✅ Workflow converted:', workflow);

    const api = new WorkflowAPI('https://sandkittens.me');
    const response = await api.saveWorkflow(workflow.states, workflow.predefined_context);
    
    console.log('✅ Server response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// ============================================
// Пример 3: Flow с Technical узлом
// ============================================

export async function testTechnicalFlow() {
  console.log('🧪 Test 3: Technical (Calculation) Flow');

  const graphData = {
    nodes: [
      {
        id: 'cart',
        type: 'screen',
        data: {
          label: 'Корзина',
          start: true
        }
      },
      {
        id: 'modify-cart',
        type: 'action',
        data: {
          label: 'Изменить количество товара',
          actionType: 'modify-cart-item',
          config: {
            itemId: '${inputs.itemId}',
            delta: '${inputs.delta}'
          }
        }
      },
      {
        id: 'updated',
        type: 'screen',
        data: {
          label: 'Корзина обновлена',
          final: true
        }
      }
    ],
    edges: [
      {
        source: 'cart',
        target: 'modify-cart',
        data: { event: 'changeQuantity' }
      },
      {
        source: 'modify-cart',
        target: 'updated'
      }
    ]
  };

  const initialContext = {
    cart: {
      items: [
        { id: 'item-1', title: 'Product 1', quantity: 1 }
      ]
    },
    inputs: {
      itemId: 'item-1',
      delta: 1
    }
  };

  try {
    const workflow = mapGraphDataToWorkflow(graphData, initialContext);
    console.log('✅ Workflow converted:', workflow);

    const api = new WorkflowAPI('https://sandkittens.me');
    const response = await api.saveWorkflow(workflow.states, workflow.predefined_context);
    
    console.log('✅ Server response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// ============================================
// Пример 4: Условный переход (Condition)
// ============================================

export async function testConditionFlow() {
  console.log('🧪 Test 4: Conditional Flow');

  const graphData = {
    nodes: [
      {
        id: 'start',
        type: 'screen',
        data: {
          label: 'Вход',
          start: true
        }
      },
      {
        id: 'check-age',
        type: 'action',
        data: {
          label: 'Проверка возраста',
          actionType: 'condition',
          config: {
            condition: 'user.age >= 18',
            dependencies: ['user.age'],
            resultVariable: 'isAdult'
          }
        }
      },
      {
        id: 'adult-screen',
        type: 'screen',
        data: {
          label: 'Доступ разрешен',
          final: true
        }
      },
      {
        id: 'minor-screen',
        type: 'screen',
        data: {
          label: 'Доступ запрещен',
          final: true
        }
      }
    ],
    edges: [
      {
        source: 'start',
        target: 'check-age',
        data: { event: 'submit' }
      },
      {
        source: 'check-age',
        target: 'adult-screen',
        data: { case: 'isAdult === true' }
      },
      {
        source: 'check-age',
        target: 'minor-screen',
        data: { case: 'isAdult === false' }
      }
    ]
  };

  const initialContext = {
    user: {
      age: 25
    },
    isAdult: null
  };

  try {
    const workflow = mapGraphDataToWorkflow(graphData, initialContext);
    console.log('✅ Workflow converted:', workflow);

    const api = new WorkflowAPI('https://sandkittens.me');
    const response = await api.saveWorkflow(workflow.states, workflow.predefined_context);
    
    console.log('✅ Server response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// ============================================
// Пример 5: Только валидация (без отправки)
// ============================================

export function testValidationOnly() {
  console.log('🧪 Test 5: Validation Only');

  const graphData = {
    nodes: [
      {
        id: '__init__',
        type: 'service',
        data: {
          label: 'Инициализация',
          isServiceNode: true,
          start: true
        }
      },
      {
        id: 'main',
        type: 'screen',
        data: {
          label: 'Главный экран',
          final: true
        }
      }
    ],
    edges: [
      {
        source: '__init__',
        target: 'main',
        data: { event: 'ready' }
      }
    ]
  };

  const initialContext = {
    app: {
      initialized: false
    }
  };

  try {
    const workflow = mapGraphDataToWorkflow(graphData, initialContext);
    console.log('✅ Workflow structure:', workflow);

    const api = new WorkflowAPI();
    api.validateWorkflow(workflow.states);
    
    console.log('✅ Validation passed!');
    return workflow;
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    throw error;
  }
}

// ============================================
// Запуск всех тестов
// ============================================

export async function runAllTests() {
  console.log('🚀 Running all Workflow Integration tests...\n');

  const tests = [
    { name: 'Simple Flow', fn: testSimpleFlow },
    { name: 'API Call Flow', fn: testApiCallFlow },
    { name: 'Technical Flow', fn: testTechnicalFlow },
    { name: 'Condition Flow', fn: testConditionFlow },
    { name: 'Validation Only', fn: testValidationOnly }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`\n▶️  Running: ${test.name}`);
      const result = await test.fn();
      results.push({ name: test.name, status: 'passed', result });
      console.log(`✅ ${test.name} passed\n`);
    } catch (error) {
      results.push({ name: test.name, status: 'failed', error: error.message });
      console.log(`❌ ${test.name} failed: ${error.message}\n`);
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.table(results.map(r => ({
    Test: r.name,
    Status: r.status,
    Details: r.status === 'passed' ? '✓' : r.error
  })));

  return results;
}

// ============================================
// Экспорт для использования в консоли
// ============================================

if (typeof window !== 'undefined') {
  window.workflowTests = {
    testSimpleFlow,
    testApiCallFlow,
    testTechnicalFlow,
    testConditionFlow,
    testValidationOnly,
    runAllTests
  };

  console.log(`
  📦 Workflow Integration Tests loaded!
  
  Доступные тесты в консоли:
  - window.workflowTests.testSimpleFlow()
  - window.workflowTests.testApiCallFlow()
  - window.workflowTests.testTechnicalFlow()
  - window.workflowTests.testConditionFlow()
  - window.workflowTests.testValidationOnly()
  - window.workflowTests.runAllTests()
  `);
}
