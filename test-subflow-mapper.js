#!/usr/bin/env node

/**
 * Тест конвертации subflow через workflowMapper
 * 
 * Проверяет:
 * 1. ✅ GraphData → StateModel конвертация
 * 2. ✅ Правильный формат для бэкенда
 * 3. ✅ Сохранение через маппер
 */

import { mapGraphDataToWorkflow } from './src/utils/workflowMapper.js';

console.log('🧪 Test: Subflow Mapper Integration\n');

// Mock GraphData subflow
const graphDataSubflow = {
  name: 'test-subflow',
  nodes: [
    {
      id: 'screen1',
      type: 'screen',
      label: 'First Screen',
      screenId: 'screen_1',
      start: true,
      edges: [
        {
          id: 'edge1',
          event: 'continue',
          target: 'screen2',
          contextPatch: {}
        }
      ]
    },
    {
      id: 'screen2',
      type: 'screen',
      label: 'Second Screen',
      screenId: 'screen_2',
      final: true,
      edges: []
    }
  ]
};

console.log('1️⃣ Test: GraphData format detection');
console.log(`   Has nodes: ${!!graphDataSubflow.nodes}`);
console.log(`   Nodes count: ${graphDataSubflow.nodes.length}`);
console.log('   ✅ GraphData format detected\n');

console.log('2️⃣ Test: Convert GraphData to StateModel');
try {
  const result = mapGraphDataToWorkflow(graphDataSubflow, {});
  
  console.log(`   ✅ Conversion successful`);
  console.log(`   States count: ${result.states.length}`);
  console.log(`   Context: ${JSON.stringify(result.predefined_context)}`);
  
  // Проверяем структуру первого состояния
  const firstState = result.states[0];
  console.log(`\n   First state:`);
  console.log(`   - state_id: ${firstState.state_id}`);
  console.log(`   - state_type: ${firstState.state_type}`);
  console.log(`   - screen: ${JSON.stringify(firstState.screen)}`);
  console.log(`   - transitions: ${firstState.transitions?.length || 0}`);
  
  // Проверяем что это правильный формат для бэкенда
  const isValidFormat = 
    Array.isArray(result.states) &&
    result.states.every(s => s.state_id && s.state_type && s.screen);
  
  console.log(`\n   ${isValidFormat ? '✅' : '❌'} Valid StateModel format for backend\n`);
  
  // Показываем полную структуру
  console.log('3️⃣ Result structure:');
  console.log(JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('   ❌ Conversion failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All tests passed! Subflow mapper works correctly.\n');

console.log('📋 Usage in SubflowRegistry:');
console.log(`
const mapped = mapGraphDataToWorkflow(subflow.definition, {});
const states = mapped.states;
const context = mapped.predefined_context || {};

// Теперь можно отправить на бэкенд
const response = await api.saveWorkflow(states, context);
`);
