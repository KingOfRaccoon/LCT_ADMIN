/**
 * Централизованный список всех доступных продуктов (workflows) в Sandbox
 */

import ecommerceDashboard from './ecommerceDashboard.json';
import avitoDemo from './avitoDemo.json';
import avitoDemoSubflow from './avitoDemoSubflow.json';

/**
 * @typedef {Object} Product
 * @property {string} id - Уникальный идентификатор продукта
 * @property {string} name - Отображаемое название
 * @property {string} description - Краткое описание
 * @property {string} category - Категория продукта
 * @property {Object} data - JSON данные workflow
 * @property {string[]} tags - Теги для фильтрации
 * @property {boolean} featured - Рекомендуемый продукт
 */

/**
 * Список всех доступных продуктов
 * @type {Product[]}
 */
export const PRODUCTS = [
  {
    id: 'avito-cart-demo-subflow',
    name: 'Авито — Корзина с Subflow',
    description: 'Профессиональный сценарий корзины с переиспользуемым онбордингом (Subflow)',
    category: 'ecommerce',
    data: avitoDemoSubflow,
    tags: ['avito', 'cart', 'subflow', 'onboarding', 'api', 'advanced'],
    featured: true,
    badge: '🔥 NEW'
  },
  {
    id: 'avito-cart-demo',
    name: 'Авито — Корзина (классическая)',
    description: 'Профессиональный сценарий корзины с загрузкой товаров из API',
    category: 'ecommerce',
    data: avitoDemo,
    tags: ['avito', 'cart', 'api', 'classic'],
    featured: false
  },
  {
    id: 'demo-checkout-product',
    name: 'E-commerce Dashboard',
    description: 'Мини-песочница для исследования переходов в воронке оформления заказа',
    category: 'ecommerce',
    data: ecommerceDashboard,
    tags: ['checkout', 'demo', 'simple'],
    featured: false
  }
];

/**
 * Категории продуктов
 */
export const CATEGORIES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    icon: '🛒',
    description: 'Сценарии для интернет-магазинов'
  },
  onboarding: {
    id: 'onboarding',
    name: 'Onboarding',
    icon: '👋',
    description: 'Приветственные сценарии'
  },
  forms: {
    id: 'forms',
    name: 'Forms',
    icon: '📝',
    description: 'Формы и сбор данных'
  }
};

/**
 * Получить продукт по ID
 * @param {string} productId
 * @returns {Product|null}
 */
export function getProductById(productId) {
  return PRODUCTS.find(p => p.id === productId) || null;
}

/**
 * Получить продукты по категории
 * @param {string} categoryId
 * @returns {Product[]}
 */
export function getProductsByCategory(categoryId) {
  return PRODUCTS.filter(p => p.category === categoryId);
}

/**
 * Получить рекомендуемые продукты
 * @returns {Product[]}
 */
export function getFeaturedProducts() {
  return PRODUCTS.filter(p => p.featured);
}

/**
 * Получить продукт по умолчанию
 * @returns {Product}
 */
export function getDefaultProduct() {
  // Возвращаем первый featured или первый в списке
  return getFeaturedProducts()[0] || PRODUCTS[0];
}

/**
 * Поиск продуктов по тегам или названию
 * @param {string} query
 * @returns {Product[]}
 */
export function searchProducts(query) {
  const lowerQuery = query.toLowerCase();
  return PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Экспорт продукта по умолчанию
export const defaultProduct = getDefaultProduct().data;
export default defaultProduct;
