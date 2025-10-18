#!/usr/bin/env node

/**
 * Тест валидации onboarding-flow
 */

import { mapGraphDataToWorkflow } from './src/utils/workflowMapper.js';
import { readFileSync } from 'fs';

const onboardingFlow = JSON.parse(
  readFileSync('./src/pages/Sandbox/data/subflows/onboardingFlow.json', 'utf8')
);

console.log('🧪 Test: onboarding-flow validation\n');

console.log('1️⃣ Input data:');
console.log(`   Nodes: ${onboardingFlow.nodes.length}`);
onboardingFlow.nodes.forEach(node => {
  console.log(`   - ${node.id} (${node.type})`);
  console.log(`     label: ${node.label}`);
  console.log(`     data.label: ${node.data?.label}`);
  console.log(`     edges: ${node.edges?.length || 0}`);
  node.edges?.forEach(edge => {
    console.log(`       → ${edge.target} (event: ${edge.event})`);
  });
});

console.log('\n2️⃣ Convert GraphData to StateModel:');
try {
  const result = mapGraphDataToWorkflow(onboardingFlow, {});
  
  console.log(`   ✅ Conversion successful`);
  console.log(`   States generated: ${result.states.length}\n`);
  
  console.log('3️⃣ States structure:');
  result.states.forEach((state, index) => {
    console.log(`   State ${index + 1}:`);
    console.log(`   - state_type: ${state.state_type}`);
    console.log(`   - name: ${state.name}`);
    console.log(`   - initial_state: ${state.initial_state}`);
    console.log(`   - final_state: ${state.final_state}`);
    console.log(`   - transitions: ${state.transitions?.length || 0}`);
    
    if (state.transitions && state.transitions.length > 0) {
      state.transitions.forEach(t => {
        console.log(`     → ${t.state_id} (case: ${t.case || 'null'})`);
      });
    }
    console.log('');
  });
  
  console.log('4️⃣ Validate state references:');
  const stateNames = new Set(result.states.map(s => s.name));
  let hasErrors = false;
  
  result.states.forEach(state => {
    state.transitions?.forEach(transition => {
      if (transition.state_id && !stateNames.has(transition.state_id)) {
        console.log(`   ❌ "${state.name}" → "${transition.state_id}" (не существует)`);
        hasErrors = true;
      } else if (transition.state_id) {
        console.log(`   ✅ "${state.name}" → "${transition.state_id}"`);
      }
    });
  });
  
  if (!hasErrors) {
    console.log('\n✅ All state references are valid!\n');
  } else {
    console.log('\n❌ Found invalid state references\n');
    process.exit(1);
  }
  
  console.log('5️⃣ Final StateModel:');
  console.log(JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('   ❌ Conversion failed:', error.message);
  process.exit(1);
}

console.log('\n✅ onboarding-flow is ready to save to backend!');
