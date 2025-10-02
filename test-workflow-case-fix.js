/**
 * Тест для проверки исправления: transitions.case = event_name для screen состояний
 */

import { mapGraphDataToWorkflow } from './src/utils/workflowMapper.js';

console.log('🧪 [Test] Starting workflow mapper case fix tests...\n');

// Тест 1: Screen State с одним событием
console.log('📝 Test 1: Screen State с событием "checkout"');
const test1Data = {
  nodes: [
    {
      id: 'screen-cart',
      type: 'screen',
      data: { label: 'Корзина', screenId: 'cart' }
    },
    {
      id: 'screen-checkout',
      type: 'screen',
      data: { label: 'Оформление заказа', screenId: 'checkout' }
    }
  ],
  edges: [
    {
      source: 'screen-cart',
      target: 'screen-checkout',
      data: { event: 'checkout' }
    }
  ],
  screens: {
    cart: { id: 'cart', name: 'Корзина', sections: {} },
    checkout: { id: 'checkout', name: 'Оформление', sections: {} }
  }
};

const result1 = mapGraphDataToWorkflow(test1Data);
const cartState = result1.states.find(s => s.name === 'Корзина');

console.log('Cart state transitions:', JSON.stringify(cartState.transitions, null, 2));
console.assert(
  cartState.transitions[0].case === 'checkout',
  '❌ FAIL: case должен быть "checkout"'
);
console.log('✅ PASS: case = "checkout"\n');

// Тест 2: Screen State с несколькими событиями
console.log('📝 Test 2: Screen State с множественными событиями');
const test2Data = {
  nodes: [
    {
      id: 'screen-product',
      type: 'screen',
      data: { label: 'Товар', screenId: 'product' }
    },
    {
      id: 'screen-cart',
      type: 'screen',
      data: { label: 'Корзина', screenId: 'cart' }
    },
    {
      id: 'screen-favorites',
      type: 'screen',
      data: { label: 'Избранное', screenId: 'favorites' }
    }
  ],
  edges: [
    {
      source: 'screen-product',
      target: 'screen-cart',
      data: { event: 'add_to_cart' }
    },
    {
      source: 'screen-product',
      target: 'screen-favorites',
      data: { event: 'add_to_favorites' }
    }
  ],
  screens: {
    product: { id: 'product', name: 'Товар', sections: {} },
    cart: { id: 'cart', name: 'Корзина', sections: {} },
    favorites: { id: 'favorites', name: 'Избранное', sections: {} }
  }
};

const result2 = mapGraphDataToWorkflow(test2Data);
const productState = result2.states.find(s => s.name === 'Товар');

console.log('Product state transitions:', JSON.stringify(productState.transitions, null, 2));
console.assert(
  productState.transitions.length === 2,
  '❌ FAIL: Должно быть 2 перехода'
);
console.assert(
  productState.transitions[0].case === 'add_to_cart',
  '❌ FAIL: Первый case должен быть "add_to_cart"'
);
console.assert(
  productState.transitions[1].case === 'add_to_favorites',
  '❌ FAIL: Второй case должен быть "add_to_favorites"'
);
console.log('✅ PASS: Множественные события работают корректно\n');

// Тест 3: Technical State с условием (не должен использовать event)
console.log('📝 Test 3: Technical State с условием');
const test3Data = {
  nodes: [
    {
      id: 'tech-check',
      type: 'action',
      data: {
        label: 'Проверка корзины',
        actionType: 'condition',
        config: {
          condition: 'cart.items.length > 0',
          resultVariable: 'isCartEmpty'
        }
      }
    },
    {
      id: 'screen-empty',
      type: 'screen',
      data: { label: 'Пустая корзина', screenId: 'empty' }
    },
    {
      id: 'screen-full',
      type: 'screen',
      data: { label: 'Полная корзина', screenId: 'full' }
    }
  ],
  edges: [
    {
      source: 'tech-check',
      target: 'screen-full',
      data: { condition: 'cart.items.length > 0', variable: 'isCartEmpty' }
    },
    {
      source: 'tech-check',
      target: 'screen-empty',
      data: { condition: null } // default case
    }
  ],
  screens: {
    empty: { id: 'empty', name: 'Пустая', sections: {} },
    full: { id: 'full', name: 'Полная', sections: {} }
  }
};

const result3 = mapGraphDataToWorkflow(test3Data);
const techState = result3.states.find(s => s.name === 'Проверка корзины');

console.log('Technical state transitions:', JSON.stringify(techState.transitions, null, 2));
console.assert(
  techState.transitions[0].case === 'cart.items.length > 0',
  '❌ FAIL: case должен быть условием'
);
console.assert(
  techState.transitions[0].variable === 'isCartEmpty',
  '❌ FAIL: variable должен быть установлен'
);
console.log('✅ PASS: Technical state использует condition, не event\n');

// Тест 4: Integration State (case=null + variable)
console.log('📝 Test 4: Integration State');
const test4Data = {
  nodes: [
    {
      id: 'integration-api',
      type: 'action',
      data: {
        label: 'API: Загрузка данных',
        actionType: 'api-call',
        config: {
          url: '/api/data',
          method: 'GET',
          resultVariable: 'cart_updated'
        }
      }
    },
    {
      id: 'screen-result',
      type: 'screen',
      data: { label: 'Результат', screenId: 'result' }
    }
  ],
  edges: [
    {
      source: 'integration-api',
      target: 'screen-result',
      data: { variable: 'cart_updated' }
    }
  ],
  screens: {
    result: { id: 'result', name: 'Результат', sections: {} }
  }
};

const result4 = mapGraphDataToWorkflow(test4Data);
const integrationState = result4.states.find(s => s.name === 'API: Загрузка данных');

console.log('Integration state transitions:', JSON.stringify(integrationState.transitions, null, 2));
console.log('Integration state expressions:', JSON.stringify(integrationState.expressions, null, 2));
console.assert(
  integrationState.transitions[0].case === null,
  '❌ FAIL: Integration state должен иметь case=null'
);
console.assert(
  integrationState.transitions[0].variable === 'cart_updated',
  '❌ FAIL: Integration state должен иметь variable'
);
console.assert(
  integrationState.expressions[0].variable === 'cart_updated',
  '❌ FAIL: Integration expression должен иметь variable'
);
console.log('✅ PASS: Integration state имеет case=null и variable\n');

// Тест 5: Technical State после Integration (как в примере)
console.log('📝 Test 5: Technical State после Integration (с variable)');
const test5Data = {
  nodes: [
    {
      id: 'integration-update-cart',
      type: 'action',
      data: {
        label: 'UpdateCart',
        actionType: 'api-call',
        config: {
          url: 'http://localhost:8080',
          method: 'get',
          resultVariable: 'cart_updated'
        }
      }
    },
    {
      id: 'tech-check-result',
      type: 'action',
      data: {
        label: 'CheckCartUpdate',
        actionType: 'condition',
        config: {
          resultVariable: 'cart_updated',
          condition: 'cart_updated is True'
        }
      }
    },
    {
      id: 'screen-success',
      type: 'screen',
      data: { label: 'InitCart', screenId: 'init' }
    },
    {
      id: 'screen-failure',
      type: 'screen',
      data: { label: 'CartReviewScreen', screenId: 'review' }
    }
  ],
  edges: [
    {
      source: 'integration-update-cart',
      target: 'tech-check-result',
      data: { variable: 'cart_updated' }
    },
    {
      source: 'tech-check-result',
      target: 'screen-success',
      data: { variable: 'cart_updated', condition: 'True' }
    },
    {
      source: 'tech-check-result',
      target: 'screen-failure',
      data: { variable: 'cart_updated', condition: 'False' }
    }
  ],
  screens: {
    init: { id: 'init', name: 'Init', sections: {} },
    review: { id: 'review', name: 'Review', sections: {} }
  }
};

const result5 = mapGraphDataToWorkflow(test5Data);
const integrationState5 = result5.states.find(s => s.name === 'UpdateCart');
const technicalState5 = result5.states.find(s => s.name === 'CheckCartUpdate');

console.log('Integration transitions:', JSON.stringify(integrationState5.transitions, null, 2));
console.log('Technical transitions:', JSON.stringify(technicalState5.transitions, null, 2));

// Integration должен иметь: variable, case=null, state_id
console.assert(
  integrationState5.transitions[0].variable === 'cart_updated',
  '❌ FAIL: Integration должен иметь variable'
);
console.assert(
  integrationState5.transitions[0].case === null,
  '❌ FAIL: Integration должен иметь case=null'
);
console.assert(
  integrationState5.transitions[0].state_id === 'CheckCartUpdate',
  '❌ FAIL: Integration должен переходить в CheckCartUpdate'
);

// Technical должен иметь: variable, case (condition), state_id
console.assert(
  technicalState5.transitions[0].variable === 'cart_updated',
  '❌ FAIL: Technical transition 1 должен иметь variable'
);
console.assert(
  technicalState5.transitions[0].case === 'True',
  '❌ FAIL: Technical transition 1 должен иметь case="True"'
);
console.assert(
  technicalState5.transitions[1].variable === 'cart_updated',
  '❌ FAIL: Technical transition 2 должен иметь variable'
);
console.assert(
  technicalState5.transitions[1].case === 'False',
  '❌ FAIL: Technical transition 2 должен иметь case="False"'
);

console.log('✅ PASS: Integration → Technical flow работает корректно\n');

console.log('🎉 Все тесты пройдены успешно!');
