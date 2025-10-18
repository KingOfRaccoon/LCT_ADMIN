/**
 * Тест экспорта subflow узлов в StateModel
 */

import { mapGraphDataToWorkflow } from './src/utils/workflowMapper.js';

// Тестовый граф с subflow узлом
const testGraphData = {
  nodes: [
    {
      id: 'start-screen',
      type: 'screen',
      data: {
        label: 'Главный экран',
        screenId: 'main-screen'
      }
    },
    {
      id: 'onboarding-subflow',
      type: 'subflow',
      state_type: 'subflow',
      data: {
        label: 'Онборд',
        subflow_workflow_id: 'onboarding-flow',
        input_mapping: {
          user_id: 'context.user.id',
          session_token: 'context.session.token'
        },
        output_mapping: {
          'subflow.onboarding_complete': 'context.onboarding.status',
          'subflow.user_preferences': 'context.user.preferences'
        },
        dependent_variables: ['user_id', 'session_token'],
        error_variable: 'onboarding_error'
      },
      expressions: [
        {
          variable: 'insurance_result',  // ✅ Добавлено поле variable
          subflow_workflow_id: 'onboarding-flow',
          input_mapping: {
            user_id: 'context.user.id',
            session_token: 'context.session.token'
          },
          output_mapping: {
            'subflow.onboarding_complete': 'context.onboarding.status',
            'subflow.user_preferences': 'context.user.preferences'
          },
          dependent_variables: ['user_id', 'session_token'],
          error_variable: 'onboarding_error'
        }
      ],
      transitions: [
        {
          variable: 'insurance_result',  // ✅ Совпадает с variable в expression
          case: true,
          state_id: 'success-screen'
        },
        {
          variable: 'onboarding_error',
          case: null,
          state_id: 'error-screen'
        }
      ]
    },
    {
      id: 'success-screen',
      type: 'screen',
      data: {
        label: 'Успешно',
        screenId: 'success-screen'
      }
    },
    {
      id: 'error-screen',
      type: 'screen',
      data: {
        label: 'Ошибка',
        screenId: 'error-screen'
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: 'start-screen',
      target: 'onboarding-subflow',
      label: 'Начать онборд'
    }
  ],
  screens: {
    'main-screen': {
      title: 'Главный экран',
      components: []
    },
    'success-screen': {
      title: 'Успешно',
      components: []
    },
    'error-screen': {
      title: 'Ошибка',
      components: []
    }
  }
};

console.log('🧪 Тестирование экспорта subflow узлов\n');

try {
  const result = mapGraphDataToWorkflow(testGraphData, {
    user: {
      id: 'test-user-123',
      name: 'Test User'
    },
    session: {
      token: 'test-token-abc'
    }
  });

  console.log('✅ Экспорт успешно выполнен\n');
  console.log('📊 Статистика:');
  console.log(`   - Всего состояний: ${result.states.length}`);
  console.log(`   - State types: ${result.states.map(s => s.state_type).join(', ')}\n`);

  // Проверяем subflow узел
  const subflowState = result.states.find(s => s.state_type === 'subflow');
  
  if (subflowState) {
    console.log('🔍 Найден subflow узел:');
    console.log(`   - Name: ${subflowState.name}`);
    console.log(`   - State type: ${subflowState.state_type}`);
    console.log(`   - Expressions: ${subflowState.expressions.length}`);
    console.log(`   - Transitions: ${subflowState.transitions.length}\n`);

    // Проверка структуры по контракту
    console.log('� Проверка соответствия контракту:');
    
    const checks = [
      { name: 'screen = {}', pass: JSON.stringify(subflowState.screen) === '{}' },
      { name: 'events = []', pass: Array.isArray(subflowState.events) && subflowState.events.length === 0 },
      { name: 'expression.variable существует', pass: !!subflowState.expressions[0]?.variable },
      { name: 'variable совпадает с transition', pass: subflowState.expressions[0]?.variable === subflowState.transitions[0]?.variable },
      { name: 'initial_state определён', pass: typeof subflowState.initial_state === 'boolean' },
      { name: 'final_state определён', pass: typeof subflowState.final_state === 'boolean' }
    ];

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    console.log('\n�📝 Expression детали:');
    console.log(JSON.stringify(subflowState.expressions[0], null, 2));

    console.log('\n🔀 Transitions:');
    subflowState.transitions.forEach((t, idx) => {
      console.log(`   ${idx + 1}. variable="${t.variable}", case=${t.case}, -> ${t.state_id}`);
    });

    console.log('\n📦 Полная структура state:');
    console.log(JSON.stringify(subflowState, null, 2));

    if (allPassed) {
      console.log('\n✅ ТЕСТ ПРОЙДЕН: Subflow узел соответствует контракту');
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН: Найдены несоответствия контракту');
      process.exit(1);
    }
  } else {
    console.error('❌ ОШИБКА: Subflow узел не найден или экспортирован с другим типом');
    console.log('\nВсе состояния:');
    result.states.forEach(s => {
      console.log(`   - ${s.name}: type=${s.state_type}, expressions=${s.expressions.length}`);
    });
  }

} catch (error) {
  console.error('❌ ОШИБКА при экспорте:');
  console.error(error.message);
  console.error(error.stack);
}
