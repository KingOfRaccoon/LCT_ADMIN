import avitoDemoSubflow from './avitoDemoSubflow.json';

/**
 * Продукт с демонстрацией использования Subflow
 * 
 * Этот продукт показывает:
 * - Использование subflow для переиспользуемых частей workflow
 * - Input mapping: передача данных из родительского контекста в subflow
 * - Output mapping: возврат результатов из subflow обратно в родительский контекст
 * - Dependent variables: проверка существования необходимых переменных
 * - Error handling: обработка ошибок через error_variable
 * 
 * Структура workflow:
 * 1. onboarding-subflow (start) - двухэкранный онбординг пользователя
 *    - Экран 1: Приветствие с кнопкой "Продолжить"
 *    - Экран 2: Настройка профиля с кнопками "Завершить" и "Пропустить"
 * 2. fetch-cart-items - загрузка корзины после завершения онбординга
 * 3. cart-main - основной экран корзины с персонализацией
 * 
 * Subflow возвращает:
 * - onboarding_result.completed: boolean - завершен ли онбординг
 * - user_name: string - имя/тип пользователя для персонализации
 */

export const avitoDemoSubflowProduct = avitoDemoSubflow;
export default avitoDemoSubflow;
