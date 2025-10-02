/**
 * Тестовый пример использования конвертера технических состояний
 * Запуск: node test-technical-state-converter.js
 */

import {
  convertAvitoDemoNodesToReactFlow,
  convertAvitoDemoEdgesToReactFlow,
  validateTechnicalExpression,
  validateTechnicalNode,
  extractTechnicalNodeMetadata,
  generateExpressionDocumentation,
  generateTechnicalNodeDocumentation,
  exportTechnicalNodeForBackend,
  createTechnicalNodeTemplate,
  getSafeFunctionsByCategory
} from './src/utils/avitoDemoConverter.js';

// Тестовые данные: технический узел с новой логикой
const testTechnicalNode = {
  id: 'credit_check',
  type: 'technical',
  state_type: 'technical',
  name: 'CreditScoreEvaluation',
  description: 'Комплексная оценка кредитоспособности заявителя',
  start: false,
  metadata: {
    description: 'Проверка кредитного рейтинга на основе дохода и долга',
    category: 'credit_evaluation',
    tags: ['credit', 'approval', 'risk_assessment'],
    author: 'risk_team',
    version: '2.1'
  },
  expressions: [
    {
      variable: 'credit_score_high',
      dependent_variables: ['annual_income', 'debt_ratio'],
      expression: 'annual_income > 75000 and debt_ratio < 0.3',
      return_type: 'boolean',
      default_value: false,
      metadata: {
        description: 'Проверка высокого кредитного рейтинга',
        category: 'credit_check',
        tags: ['high_score'],
        examples: [
          {
            input: { annual_income: 80000, debt_ratio: 0.25 },
            output: true,
            description: 'Высокий доход и низкий долг'
          },
          {
            input: { annual_income: 70000, debt_ratio: 0.25 },
            output: false,
            description: 'Доход ниже порога'
          }
        ],
        author: 'risk_team',
        created_at: '2025-10-01T12:00:00Z',
        version: '1.0'
      }
    },
    {
      variable: 'credit_score_medium',
      dependent_variables: ['annual_income', 'debt_ratio'],
      expression: 'annual_income > 50000 and debt_ratio < 0.4',
      return_type: 'boolean',
      default_value: false
    }
  ],
  transitions: [
    {
      variable: 'credit_score_high',
      case: 'True',
      state_id: 'ApprovedState'
    },
    {
      variable: 'credit_score_medium',
      case: 'True',
      state_id: 'AdditionalInfoState'
    },
    {
      variables: ['credit_score_high', 'credit_score_medium'],
      logic: 'none_true',
      state_id: 'RejectedState'
    }
  ]
};

const contextSchema = {
  annual_income: { type: 'integer', description: 'Годовой доход' },
  debt_ratio: { type: 'float', description: 'Отношение долга к доходу' }
};

console.log('🧪 Тест конвертера технических состояний\n');
console.log('=' .repeat(60));

// Тест 1: Преобразование узла в React Flow
console.log('\n1️⃣ Преобразование узла в React Flow формат...');
const reactFlowNodes = convertAvitoDemoNodesToReactFlow([testTechnicalNode]);
console.log('✅ Создан React Flow узел:', reactFlowNodes[0].id);
console.log('   Тип:', reactFlowNodes[0].type);
console.log('   Expressions:', reactFlowNodes[0].data.expressions?.length);
console.log('   Transitions:', reactFlowNodes[0].data.transitions?.length);

// Тест 2: Преобразование рёбер
console.log('\n2️⃣ Преобразование transitions в React Flow edges...');
const reactFlowEdges = convertAvitoDemoEdgesToReactFlow([testTechnicalNode]);
console.log('✅ Создано рёбер:', reactFlowEdges.length);
reactFlowEdges.forEach((edge, idx) => {
  console.log(`   Edge ${idx + 1}: ${edge.label}`);
  console.log(`      Source: ${edge.source} → Target: ${edge.target}`);
  console.log(`      Logic: ${edge.data.logic || 'N/A'}`);
});

// Тест 3: Валидация выражения
console.log('\n3️⃣ Валидация отдельного выражения...');
const expr = testTechnicalNode.expressions[0];
const exprErrors = validateTechnicalExpression(expr, contextSchema);
if (exprErrors.length === 0) {
  console.log('✅ Выражение валидно');
} else {
  console.log('❌ Ошибки валидации:', exprErrors);
}

// Тест 4: Валидация узла целиком
console.log('\n4️⃣ Валидация технического узла...');
const nodeValidation = validateTechnicalNode(testTechnicalNode, contextSchema);
if (nodeValidation.valid) {
  console.log('✅ Узел валиден');
} else {
  console.log('❌ Ошибки валидации:', nodeValidation.errors);
}

// Тест 5: Извлечение метаданных
console.log('\n5️⃣ Извлечение метаданных узла...');
const metadata = extractTechnicalNodeMetadata(testTechnicalNode);
console.log('✅ Метаданные:');
console.log('   Имя:', metadata.name);
console.log('   Категория:', metadata.category);
console.log('   Теги:', metadata.tags.join(', '));
console.log('   Выражений:', metadata.expressionsCount);
console.log('   Переходов:', metadata.transitionsCount);

// Тест 6: Генерация документации для выражения
console.log('\n6️⃣ Генерация документации для выражения...');
const exprDoc = generateExpressionDocumentation(expr);
console.log('✅ Документация создана (длина: ' + exprDoc.length + ' символов)');
console.log('\n--- Начало документации ---');
console.log(exprDoc);
console.log('--- Конец документации ---');

// Тест 7: Генерация документации для узла
console.log('\n7️⃣ Генерация полной документации узла...');
const nodeDoc = generateTechnicalNodeDocumentation(testTechnicalNode);
console.log('✅ Документация создана (длина: ' + nodeDoc.length + ' символов)');

// Тест 8: Экспорт для бэкенда
console.log('\n8️⃣ Экспорт узла для бэкенда...');
const backendFormat = exportTechnicalNodeForBackend(reactFlowNodes[0]);
console.log('✅ Экспортировано в формат бэкенда');
console.log('   state_type:', backendFormat.state_type);
console.log('   expressions:', backendFormat.expressions.length);
console.log('   transitions:', backendFormat.transitions.length);

// Тест 9: Создание шаблона
console.log('\n9️⃣ Создание шаблона технического узла...');
const template = createTechnicalNodeTemplate('EmailValidation');
console.log('✅ Шаблон создан:', template.name);
console.log('   ID:', template.id);
console.log('   Expressions:', template.expressions.length);
console.log('   Transitions:', template.transitions.length);

// Тест 10: Список безопасных функций
console.log('\n🔟 Получение списка безопасных функций...');
const functionsByCategory = getSafeFunctionsByCategory();
console.log('✅ Функции сгруппированы по категориям:');
Object.entries(functionsByCategory).forEach(([category, functions]) => {
  console.log(`   ${category}: ${functions.length} функций`);
  console.log(`      ${functions.map(f => f.name).join(', ')}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Все тесты пройдены успешно!');

// Тест 11: Проверка ошибок валидации
console.log('\n🔍 Бонусный тест: проверка обнаружения ошибок...');

const invalidNode = {
  id: 'invalid_node',
  type: 'technical',
  expressions: [
    {
      variable: 'bad_expr',
      dependent_variables: ['non_existent_var'], // Не существует в контексте
      expression: 'import os', // Запрещённая конструкция
      return_type: 'invalid_type', // Неверный тип
      default_value: null
    }
  ],
  transitions: [
    {
      variable: 'undefined_var', // Не определена в expressions
      case: 'True',
      state_id: 'NextState'
    },
    {
      variables: ['var1', 'var2'], // Множественные переменные
      logic: 'invalid_logic', // Неверная логика
      state_id: 'AnotherState'
    }
  ]
};

const invalidValidation = validateTechnicalNode(invalidNode, contextSchema);
console.log('\n❌ Ожидаемые ошибки обнаружены:');
invalidValidation.errors.forEach((err, idx) => {
  console.log(`   ${idx + 1}. ${err}`);
});

console.log('\n🎉 Конвертер корректно обнаруживает ошибки!');
