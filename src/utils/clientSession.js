/**
 * Client Session Manager
 * 
 * Управляет уникальным client_session_id для каждой загрузки страницы.
 * Session ID генерируется ЗАНОВО при каждой перезагрузке страницы (F5).
 * 
 * ВАЖНО: Session ID хранится только в памяти (не в storage), 
 * поэтому обновляется при каждом рефреше страницы.
 */

// Храним session ID в памяти (обновляется при каждой перезагрузке)
let currentSessionId = null;

/**
 * Генерирует уникальный session ID
 * @returns {string} UUID v4
 */
export function generateSessionId() {
  // Простая реализация UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Получает или создает client session ID
 * Session ID генерируется один раз при загрузке страницы и хранится в памяти.
 * При перезагрузке страницы (F5) генерируется новый ID.
 * 
 * @returns {string} Client session ID
 */
export function getClientSessionId() {
  // Если ID еще не сгенерирован в текущей сессии страницы
  if (!currentSessionId) {
    currentSessionId = generateSessionId();
    console.log('🆕 [ClientSession] New session created:', currentSessionId);
  }
  
  return currentSessionId;
}

/**
 * Очищает текущую сессию (для тестирования или logout)
 * Сбрасывает session ID в памяти
 */
export function clearClientSession() {
  const oldSessionId = currentSessionId;
  currentSessionId = null;
  console.log('🗑️ [ClientSession] Session cleared:', oldSessionId);
}

/**
 * Обновляет timestamp последней активности (legacy function)
 * Оставлена для обратной совместимости, но ничего не делает
 */
export function touchClientSession() {
  // No-op: session не хранится в storage
}

/**
 * Получает информацию о текущей сессии
 * @returns {Object|null} Объект с sessionId или null
 */
export function getSessionInfo() {
  if (!currentSessionId) {
    return {
      sessionId: getClientSessionId(), // Создаст новый, если еще нет
      createdAt: new Date(),
      isNew: true
    };
  }
  
  return {
    sessionId: currentSessionId,
    createdAt: new Date(), // Приблизительное время
    isNew: false
  };
}

export default {
  getClientSessionId,
  clearClientSession,
  touchClientSession,
  getSessionInfo
};
