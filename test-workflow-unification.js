/**
 * Тест для проверки унификации получения workflow и работы кэша
 * 
 * Запуск: node test-workflow-unification.js
 */

// Имитация модулей
const workflowDataCache = new Map();
const startingWorkflows = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Счётчик реальных API запросов
let apiRequestCount = 0;

// Имитация API запроса
async function mockApiRequest(workflowId, initialContext) {
  apiRequestCount++;
  console.log(`📡 [Mock API] Request #${apiRequestCount} to /client/workflow`);
  
  // Имитация задержки сети
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    session_id: 'test-session-123',
    current_state: 'start',
    state_type: 'screen',
    context: initialContext,
    screen: { id: 'screen-1', title: 'Test Screen' }
  };
}

// Функция startClientWorkflow с кэшем
async function startClientWorkflow(workflowId, initialContext = {}, useCache = true) {
  console.log(`\n🚀 [startClientWorkflow] Called with:`, { workflowId, useCache });
  
  // Проверяем кэш
  if (useCache) {
    const cached = workflowDataCache.get(workflowId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`✅ [Cache HIT] Using cached data for workflow: ${workflowId}`);
      return cached.data;
    } else if (cached) {
      console.log(`⚠️ [Cache EXPIRED] Cache expired for workflow: ${workflowId}`);
    } else {
      console.log(`❌ [Cache MISS] No cache for workflow: ${workflowId}`);
    }
  }
  
  // Проверяем, не идёт ли уже запрос
  if (startingWorkflows.has(workflowId)) {
    console.log(`⏸️ [Pending] Returning existing promise for workflow: ${workflowId}`);
    return startingWorkflows.get(workflowId);
  }
  
  // Создаём новый запрос
  const promise = (async () => {
    try {
      const data = await mockApiRequest(workflowId, initialContext);
      
      // Сохраняем в кэш
      if (useCache) {
        workflowDataCache.set(workflowId, {
          data,
          timestamp: Date.now()
        });
        console.log(`💾 [Cache SAVED] Cached workflow: ${workflowId}`);
      }
      
      return data;
    } finally {
      startingWorkflows.delete(workflowId);
    }
  })();
  
  startingWorkflows.set(workflowId, promise);
  return promise;
}

// Тестовые сценарии
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('ТЕСТ: Унификация получения Workflow');
  console.log('='.repeat(60));
  
  // Сценарий 1: Первый запрос (должен пойти в API)
  console.log('\n📋 Сценарий 1: Первый запрос к workflow');
  console.log('-'.repeat(60));
  await startClientWorkflow('workflow-1', { user: 'test' });
  console.log(`📊 Total API requests: ${apiRequestCount} (expected: 1)`);
  
  // Сценарий 2: Повторный запрос (должен использовать кэш)
  console.log('\n📋 Сценарий 2: Повторный запрос к тому же workflow');
  console.log('-'.repeat(60));
  await startClientWorkflow('workflow-1', { user: 'test' });
  console.log(`📊 Total API requests: ${apiRequestCount} (expected: 1)`);
  
  // Сценарий 3: Параллельные запросы (должны дедуплицироваться)
  console.log('\n📋 Сценарий 3: Параллельные запросы к новому workflow');
  console.log('-'.repeat(60));
  await Promise.all([
    startClientWorkflow('workflow-2', { user: 'test' }),
    startClientWorkflow('workflow-2', { user: 'test' }),
    startClientWorkflow('workflow-2', { user: 'test' })
  ]);
  console.log(`📊 Total API requests: ${apiRequestCount} (expected: 2)`);
  
  // Сценарий 4: Разные workflow ID
  console.log('\n📋 Сценарий 4: Разные workflow ID');
  console.log('-'.repeat(60));
  await Promise.all([
    startClientWorkflow('workflow-3', { user: 'test' }),
    startClientWorkflow('workflow-4', { user: 'test' })
  ]);
  console.log(`📊 Total API requests: ${apiRequestCount} (expected: 4)`);
  
  // Сценарий 5: Запрос без кэша
  console.log('\n📋 Сценарий 5: Запрос с отключенным кэшем');
  console.log('-'.repeat(60));
  await startClientWorkflow('workflow-1', { user: 'test' }, false);
  console.log(`📊 Total API requests: ${apiRequestCount} (expected: 5)`);
  
  // Итоги
  console.log('\n' + '='.repeat(60));
  console.log('✅ РЕЗУЛЬТАТЫ ТЕСТА');
  console.log('='.repeat(60));
  console.log(`Всего API запросов: ${apiRequestCount}`);
  console.log(`Записей в кэше: ${workflowDataCache.size}`);
  console.log(`Ожидаемый результат: 5 запросов вместо 9 без оптимизации`);
  console.log(`Экономия: ${9 - apiRequestCount} запросов (${Math.round((1 - apiRequestCount/9) * 100)}%)`);
  
  if (apiRequestCount === 5) {
    console.log('\n✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
  } else {
    console.log('\n❌ ТЕСТ ПРОВАЛЕН! Ожидалось 5 запросов, получено:', apiRequestCount);
  }
}

// Запуск тестов
runTests().catch(console.error);
