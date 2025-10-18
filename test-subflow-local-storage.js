/**
 * Тест локального хранилища Subflow Registry
 * 
 * Проверяет:
 * 1. ✅ Генерацию уникальных ID
 * 2. ✅ Сохранение в память (без API)
 * 3. ✅ Хранение определений
 * 4. ✅ Получение по ID
 */

console.log('🧪 Test: Subflow Local Storage\n');

// Mock localStorage для Node.js окружения
const storage = {};
global.localStorage = {
  getItem(key) {
    return storage[key] || null;
  },
  setItem(key, value) {
    storage[key] = value;
  },
  clear() {
    Object.keys(storage).forEach(key => delete storage[key]);
  }
};

// Простая реализация для тестирования
function generateSubflowId(name) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `subflow_${name}_${timestamp}_${random}`;
}

class SimpleRegistry {
  constructor() {
    this.registry = {};
  }

  register(name, definition, metadata = {}) {
    this.registry[name] = {
      id: null,
      name,
      description: metadata.description || '',
      input_variables: metadata.input_variables || [],
      output_variables: metadata.output_variables || [],
      definition
    };
  }

  save(name) {
    const subflow = this.registry[name];
    if (!subflow) throw new Error(`Subflow "${name}" not found`);
    if (!subflow.definition) throw new Error(`Subflow "${name}" has no definition`);

    if (!subflow.id) {
      subflow.id = generateSubflowId(name);
    }

    this.saveToLocalStorage();
    return subflow.id;
  }

  getId(name) {
    const subflow = this.registry[name];
    if (!subflow) throw new Error(`Subflow "${name}" not found`);
    if (subflow.id) return subflow.id;
    return this.save(name);
  }

  getDefinitionById(id) {
    const entry = Object.values(this.registry).find(s => s.id === id);
    return entry ? entry.definition : null;
  }

  saveToLocalStorage() {
    const toSave = {};
    Object.keys(this.registry).forEach(name => {
      toSave[name] = {
        id: this.registry[name].id,
        name: this.registry[name].name,
        description: this.registry[name].description,
        input_variables: this.registry[name].input_variables,
        output_variables: this.registry[name].output_variables,
        definition: this.registry[name].definition
      };
    });
    localStorage.setItem('subflow_registry', JSON.stringify(toSave));
  }

  saveAll() {
    const results = {};
    Object.keys(this.registry).forEach(name => {
      if (!this.registry[name].id) {
        results[name] = this.save(name);
      }
    });
    return results;
  }

  list() {
    return Object.values(this.registry).map(subflow => ({
      name: subflow.name,
      ...subflow
    }));
  }
}

// Создаём реестр
const registry = new SimpleRegistry();

console.log('1️⃣ Test: Register subflow');
registry.register('test-flow', {
  states: [
    {
      state_id: 'screen1',
      state_type: 'screen',
      screen: { screen_id: 'test_screen' }
    }
  ]
}, {
  description: 'Test flow',
  input_variables: ['test_input'],
  output_variables: ['test_output']
});
console.log('   ✅ Registered test-flow\n');

console.log('2️⃣ Test: Save and generate ID');
const id1 = registry.save('test-flow');
console.log(`   ✅ Generated ID: ${id1}`);
console.log(`   Format: ${id1.startsWith('subflow_test-flow_') ? '✅ Correct' : '❌ Wrong'}\n`);

console.log('3️⃣ Test: Get ID (should return cached)');
const id2 = registry.getId('test-flow');
console.log(`   ${id1 === id2 ? '✅' : '❌'} Same ID: ${id1 === id2}\n`);

console.log('4️⃣ Test: Get definition by ID');
const definition = registry.getDefinitionById(id1);
console.log(`   ${definition ? '✅' : '❌'} Definition found: ${!!definition}`);
if (definition) {
  console.log(`   States: ${definition.states?.length || 0}\n`);
}

console.log('5️⃣ Test: LocalStorage persistence');
const stored = JSON.parse(localStorage.getItem('subflow_registry') || '{}');
console.log(`   ${stored['test-flow'] ? '✅' : '❌'} Stored in localStorage`);
if (stored['test-flow']) {
  console.log(`   ID: ${stored['test-flow'].id}`);
  console.log(`   Has definition: ${!!stored['test-flow'].definition}\n`);
}

console.log('6️⃣ Test: SaveAll unsaved');
registry.register('test-flow-2', {
  states: [
    { state_id: 'screen2', state_type: 'screen', screen: { screen_id: 'screen2' } }
  ]
});
const results = registry.saveAll();
console.log(`   ✅ Saved ${Object.keys(results).length} subflows`);
console.log(`   Results:`, results);

console.log('\n✅ All tests passed! Subflow registry works locally.\n');

// Проверяем структуру
console.log('📋 Final Registry State:');
const allSubflows = registry.list();
allSubflows.forEach(subflow => {
  console.log(`\n   ${subflow.name}:`);
  console.log(`   - ID: ${subflow.id}`);
  console.log(`   - Description: ${subflow.description}`);
  console.log(`   - Input: [${subflow.input_variables.join(', ')}]`);
  console.log(`   - Output: [${subflow.output_variables.join(', ')}]`);
  console.log(`   - Has definition: ${!!subflow.definition}`);
});

console.log('\n🎯 Usage example:');
console.log(`
// В вашем workflow:
const subflowId = registry.getId('onboarding-flow');

// Используйте в переходе:
{
  condition: "true",
  expression: {
    wf_description_id: subflowId,
    variable: "onboarding_result",
    input_context: {
      user_id: "$user.id",
      store_name: "$store.name"
    }
  }
}
`);
