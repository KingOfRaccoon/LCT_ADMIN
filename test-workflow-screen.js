/**
 * Тест экспорта workflow с полными screen данными
 * 
 * Проверяет что screen из avitoDemo правильно включается в контракт
 */

import { mapGraphDataToWorkflow } from './src/utils/workflowMapper.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const avitoDemo = JSON.parse(
  readFileSync(join(__dirname, 'src/pages/Sandbox/data/avitoDemo.json'), 'utf-8')
);

// Конвертируем nodes из avitoDemo в формат graphData
function convertAvitoDemoToGraphData(data) {
  const nodes = (data.nodes || []).map((node, index) => ({
    id: node.id,
    type: node.type || 'screen',
    position: { x: index * 300, y: Math.floor(index / 3) * 200 },
    data: {
      label: node.label || node.id,
      screenId: node.screenId,
      start: node.start === true,
      final: !node.edges || node.edges.length === 0,
      nodeType: node.type || 'screen',
      // Копируем данные action-узла
      actionType: node.data?.actionType,
      config: node.data?.config,
      description: node.data?.description
    }
  }));

  const edges = [];
  (data.nodes || []).forEach(node => {
    if (node.edges && Array.isArray(node.edges)) {
      node.edges.forEach(edge => {
        edges.push({
          id: edge.id,
          source: node.id,
          target: edge.target,
          label: edge.label,
          data: {
            event: edge.event,
            keepInputs: edge.keepInputs,
            summary: edge.summary,
            contextPatch: edge.contextPatch,
            condition: edge.condition
          }
        });
      });
    }
  });

  return {
    nodes,
    edges,
    screens: data.screens || {}
  };
}

async function testAvitoWorkflowExport() {
  console.log('🧪 Testing Avito Demo Workflow Export with Screen Data\n');

  try {
    // Преобразуем avitoDemo в graphData
    const graphData = convertAvitoDemoToGraphData(avitoDemo);

    console.log('📊 Graph Data:', {
      nodesCount: graphData.nodes.length,
      edgesCount: graphData.edges.length,
      screensCount: Object.keys(graphData.screens).length,
      screenIds: Object.keys(graphData.screens)
    });

    // Преобразуем в workflow contract
    const workflow = mapGraphDataToWorkflow(graphData, avitoDemo.initialContext || {});

    console.log('\n✅ Workflow Contract Generated:\n');
    console.log(`States count: ${workflow.states.length}`);
    
    // Проверяем что screen-узлы имеют полные данные экрана
    const screenStates = workflow.states.filter(s => s.state_type === 'screen');
    console.log(`\nScreen states: ${screenStates.length}`);
    
    screenStates.forEach(state => {
      const hasScreenData = state.screen && Object.keys(state.screen).length > 0;
      const screenId = Object.keys(graphData.screens).find(id => 
        graphData.screens[id].name === state.name || graphData.screens[id].id === state.screen?.id
      );
      
      console.log(`\n  State: "${state.name}"`);
      console.log(`    - Has screen data: ${hasScreenData ? '✅' : '❌'}`);
      console.log(`    - Screen ID: ${state.screen?.id || 'N/A'}`);
      console.log(`    - Screen sections: ${state.screen?.sections ? Object.keys(state.screen.sections).join(', ') : 'N/A'}`);
      console.log(`    - Transitions: ${state.transitions.length}`);
      console.log(`    - Events: ${state.expressions?.length || 0}`);
    });

    // Проверяем что action/service узлы имеют пустые screens
    const nonScreenStates = workflow.states.filter(s => s.state_type !== 'screen');
    console.log(`\nNon-screen states: ${nonScreenStates.length}`);
    
    nonScreenStates.forEach(state => {
      const screenEmpty = !state.screen || Object.keys(state.screen).length === 0;
      console.log(`  State: "${state.name}" (${state.state_type}) - Empty screen: ${screenEmpty ? '✅' : '❌'}`);
    });

    // Валидация структуры
    console.log('\n📋 Validation:');
    const validationChecks = [
      {
        name: 'All states have screen field',
        passed: workflow.states.every(s => 'screen' in s)
      },
      {
        name: 'Screen states have non-empty screen data',
        passed: screenStates.every(s => s.screen && Object.keys(s.screen).length > 0)
      },
      {
        name: 'Non-screen states have empty screen data',
        passed: nonScreenStates.every(s => !s.screen || Object.keys(s.screen).length === 0)
      },
      {
        name: 'Initial state exists',
        passed: workflow.states.filter(s => s.initial_state).length === 1
      },
      {
        name: 'Final states exist',
        passed: workflow.states.filter(s => s.final_state).length > 0
      }
    ];

    validationChecks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = validationChecks.every(c => c.passed);
    
    if (allPassed) {
      console.log('\n🎉 All checks passed! Ready to export to backend.');
      
      // Выводим пример payload для одного screen state
      const exampleScreenState = screenStates[0];
      if (exampleScreenState) {
        console.log('\n📄 Example Screen State Structure:');
        console.log(JSON.stringify(exampleScreenState, null, 2).slice(0, 500) + '...');
      }
    } else {
      console.log('\n⚠️ Some checks failed. Please review the output above.');
    }

    return workflow;
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Запуск теста
testAvitoWorkflowExport()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
