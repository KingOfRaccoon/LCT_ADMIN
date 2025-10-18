import { useState, useEffect } from 'react';
import { PRODUCTS, CATEGORIES, getProductById } from '../data/products';
import './ProductSelector.css';

/**
 * Компонент для выбора продукта (workflow) в Sandbox
 * 
 * @param {Object} props
 * @param {string} props.currentProductId - ID текущего продукта
 * @param {Function} props.onProductChange - Callback при выборе продукта (productId) => void
 * @param {boolean} props.disabled - Отключить выбор
 */
export default function ProductSelector({ currentProductId, onProductChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const currentProduct = getProductById(currentProductId);

  // Фильтрация продуктов
  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Группировка по категориям
  const featuredProducts = filteredProducts.filter(p => p.featured);
  const regularProducts = filteredProducts.filter(p => !p.featured);

  const handleSelect = (productId) => {
    onProductChange(productId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (!e.target.closest('.product-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="product-selector">
      <button
        type="button"
        className={`product-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Выбрать продукт"
      >
        <span className="product-selector-icon">📦</span>
        <span className="product-selector-label">
          {currentProduct?.name || 'Выберите продукт'}
        </span>
        {currentProduct?.badge && (
          <span className="product-selector-badge">{currentProduct.badge}</span>
        )}
        <span className={`product-selector-arrow ${isOpen ? 'up' : 'down'}`}>▼</span>
      </button>

      {isOpen && (
        <div className="product-selector-dropdown">
          {/* Поиск */}
          <div className="product-selector-search">
            <input
              type="text"
              placeholder="Поиск по названию или тегам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Фильтр по категориям */}
          <div className="product-selector-categories">
            <button
              className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Все
            </button>
            {Object.values(CATEGORIES).map(category => (
              <button
                key={category.id}
                className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
                title={category.description}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Список продуктов */}
          <div className="product-selector-list">
            {/* Рекомендуемые */}
            {featuredProducts.length > 0 && (
              <div className="product-group">
                <div className="product-group-title">⭐ Рекомендуемые</div>
                {featuredProducts.map(product => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    isSelected={product.id === currentProductId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Остальные */}
            {regularProducts.length > 0 && (
              <div className="product-group">
                {featuredProducts.length > 0 && (
                  <div className="product-group-title">Другие</div>
                )}
                {regularProducts.map(product => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    isSelected={product.id === currentProductId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Пусто */}
            {filteredProducts.length === 0 && (
              <div className="product-selector-empty">
                <p>Ничего не найдено</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Элемент списка продуктов
 */
function ProductItem({ product, isSelected, onSelect }) {
  const categoryInfo = CATEGORIES[product.category];

  return (
    <button
      type="button"
      className={`product-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(product.id)}
    >
      <div className="product-item-header">
        <div className="product-item-title">
          {product.name}
          {product.badge && (
            <span className="product-item-badge">{product.badge}</span>
          )}
        </div>
        {isSelected && <span className="product-item-check">✓</span>}
      </div>
      
      <div className="product-item-description">{product.description}</div>
      
      <div className="product-item-footer">
        {categoryInfo && (
          <span className="product-item-category">
            <span>{categoryInfo.icon}</span>
            <span>{categoryInfo.name}</span>
          </span>
        )}
        <div className="product-item-tags">
          {product.tags.slice(0, 3).map(tag => (
            <span key={tag} className="product-tag">{tag}</span>
          ))}
          {product.tags.length > 3 && (
            <span className="product-tag">+{product.tags.length - 3}</span>
          )}
        </div>
      </div>
    </button>
  );
}
