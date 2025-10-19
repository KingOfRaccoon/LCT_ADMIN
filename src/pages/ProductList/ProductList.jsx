import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy,
  Grid,
  List as ListIcon
} from 'lucide-react';
import { useVirtualContext } from '../../context/VirtualContext';
import toast from 'react-hot-toast';
import {
  listProducts,
  createProduct as createProductApi,
  deleteProduct as deleteProductApi,
  getProductById as getProductByIdApi
} from '../../services/productApi.js';
import './ProductList.css';

const DEFAULT_VERSION = '1.0.0';

const DEMO_PRODUCTS = [
  {
    id: 'demo-ecommerce-dashboard',
    name: 'E-commerce Dashboard',
    description: 'Admin panel for managing products, orders, and customers',
    status: 'active',
    version: '2.1.0',
    lastModified: '2024-01-15T10:30:00Z',
    createdBy: 'aleksandrzvezdakov',
    screens: 8,
    actions: 15,
    isRemote: false,
    isDemo: true,
    numericId: null,
    workflowId: null,
    metadata: {
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    }
  },
  {
    id: 'demo-user-registration',
    name: 'User Registration Flow',
    description: 'Multi-step registration process with validation',
    status: 'draft',
    version: '1.0.0',
    lastModified: '2024-01-10T14:22:00Z',
    createdBy: 'aleksandrzvezdakov',
    screens: 4,
    actions: 7,
    isRemote: false,
    isDemo: true,
    numericId: null,
    workflowId: null,
    metadata: {
      createdAt: '2024-01-10T14:22:00Z',
      updatedAt: '2024-01-10T14:22:00Z'
    }
  },
  {
    id: 'demo-payment-gateway',
    name: 'Payment Gateway Integration',
    description: 'Complete payment processing workflow',
    status: 'active',
    version: '1.3.2',
    lastModified: '2024-01-08T09:15:00Z',
    createdBy: 'aleksandrzvezdakov',
    screens: 6,
    actions: 12,
    isRemote: false,
    isDemo: true,
    numericId: null,
    workflowId: null,
    metadata: {
      createdAt: '2024-01-08T09:15:00Z',
      updatedAt: '2024-01-08T09:15:00Z'
    }
  },
  {
    id: 'avito-cart-demo',
    name: 'Авито — Корзина',
    description: 'Демонстрационный сценарий корзины Avito: добавление товаров, изменение количества, upsell-блоки и переход к оформлению',
    status: 'active',
    version: '1.0.0',
    lastModified: '2024-01-01T12:00:00Z',
    createdBy: 'aleksandrzvezdakov',
    screens: 11,
    actions: 25,
    isRemote: false,
    isDemo: true,
    badge: '🔥 NEW',
    numericId: null,
    workflowId: 'avito-cart-demo',
    metadata: {
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    }
  },
  {
    id: 'avito-cart-demo-subflow',
    name: 'Авито — Корзина с Subflow',
    description: 'Профессиональный сценарий корзины с переиспользуемым онбордингом (Subflow): Input/Output mapping, dependent variables, изолированный контекст',
    status: 'active',
    version: '1.0.0',
    lastModified: '2024-10-18T10:00:00Z',
    createdBy: 'aleksandrzvezdakov',
    screens: 13,
    actions: 27,
    badge: '🔥 NEW',
    isRemote: false,
    isDemo: true,
    numericId: null,
    workflowId: 'avito-cart-demo-subflow',
    metadata: {
      createdAt: '2024-10-18T10:00:00Z',
      updatedAt: '2024-10-18T10:00:00Z'
    }
  }
];

function normalizeRemoteProduct(product) {
  if (!product) {
    return null;
  }

  const lastModified = product.metadata?.updatedAt ?? product.metadata?.createdAt ?? null;

  return {
    id: product.id,
    numericId: product.numericId,
    name: product.name,
    description: product.description,
    status: 'active',
    version: DEFAULT_VERSION,
    lastModified,
    createdBy: 'remote',
    screens: product.totalScreens ?? 0,
    actions: product.totalComponents ?? 0,
    workflowId: product.workflowId ?? null,
    workflowSerialized: product.workflowSerialized ?? null,
    metadata: product.metadata ?? {},
    isRemote: true,
    isDemo: false
  };
}

function formatDate(dateString) {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadge(product) {
  const status = product.status ?? (product.isRemote ? 'active' : 'draft');
  const label = status === 'active'
    ? 'Active'
    : status === 'draft'
      ? 'Draft'
      : status;

  return (
    <span className={`status-badge status-${status}`}>
      {label}
    </span>
  );
}

const ProductList = () => {
  const navigate = useNavigate();
  const { setProduct } = useVirtualContext();
  
  // State management
  const [remoteProducts, setRemoteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [_selectedProducts, _setSelectedProducts] = useState([]);

  // Load products from backend
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const backendProducts = await listProducts({ signal: controller.signal, parseWorkflow: false });
        if (!isMounted) {
          return;
        }

        const normalized = backendProducts
          .map(normalizeRemoteProduct)
          .filter(Boolean);

        console.log('[ProductList] Loaded products from API:', normalized);
        setRemoteProducts(normalized);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('[ProductList] Failed to load products', error);
        toast.error('Не удалось загрузить продукты с сервера');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Filter products based on search and status
  const filteredProducts = remoteProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle product actions
  const handleCreateProduct = async () => {
    if (creating) {
      return;
    }

    setCreating(true);
    try {
      const timestamp = new Date().toISOString();
      const productName = `Product ${timestamp.slice(0, 19).replace('T', ' ')}`;
      const createdProduct = await createProductApi({
        name: productName,
        description: 'Draft product',
        totalScreens: 0,
        totalComponents: 0
      });

      const normalized = normalizeRemoteProduct(createdProduct);
      if (normalized) {
        setRemoteProducts((prev) => [normalized, ...prev]);
      }

      setProduct(createdProduct);
      navigate(`/products/${createdProduct.id}`);
      toast.success('Product created successfully!');
    } catch (error) {
      console.error('[ProductList] Failed to create product', error);
      toast.error('Не удалось создать продукт');
    } finally {
      setCreating(false);
    }
  };

  const handleEditProduct = (product, { skipNavigate = false } = {}) => {
    if (product.isRemote) {
      setProduct(product);
      getProductByIdApi(product.numericId ?? product.id, { parseWorkflow: true })
        .then((fullProduct) => setProduct(fullProduct))
        .catch((error) => {
          console.warn('[ProductList] Failed to preload product details', error);
        });
    } else {
      setProduct(product);
    }

    if (!skipNavigate) {
      navigate(`/products/${product.id}`);
    }
  };

  const handleDuplicateProduct = async (product) => {
    if (!product.isRemote) {
      toast.error('Demo продукты нельзя клонировать через backend');
      return;
    }

    try {
      const sourceProduct = await getProductByIdApi(product.numericId ?? product.id, { parseWorkflow: true });
      const duplicatedProduct = await createProductApi({
        name: `${sourceProduct.name} (Copy)`,
        description: sourceProduct.description,
        totalScreens: sourceProduct.totalScreens,
        totalComponents: sourceProduct.totalComponents,
        workflow: sourceProduct.workflow ?? sourceProduct.workflowSerialized,
        workflowId: sourceProduct.workflowId
      });

      const normalized = normalizeRemoteProduct(duplicatedProduct);
      if (normalized) {
        setRemoteProducts((prev) => [normalized, ...prev]);
      }

      toast.success('Product duplicated successfully!');
    } catch (error) {
      console.error('[ProductList] Failed to duplicate product', error);
      toast.error('Не удалось дублировать продукт');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product.isRemote) {
      toast.error('Demo продукты нельзя удалять через backend');
      return;
    }

    if (!product.numericId) {
      toast.error('ID продукта отсутствует. Удаление невозможно.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await deleteProductApi(product.numericId);
      setRemoteProducts((prev) => prev.filter((item) => item.numericId !== product.numericId));
      toast.success('Product deleted successfully!');
    } catch (error) {
      console.error('[ProductList] Failed to delete product', error);
      toast.error('Не удалось удалить продукт');
    }
  };

  if (loading) {
    return (
      <div className="product-list-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Products</h1>
          <p>Manage your BDUI products and applications</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleCreateProduct}
          disabled={creating}
        >
          <Plus size={20} />
          {creating ? 'Creating...' : 'New Product'}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">
              <Plus size={48} />
            </div>
            <h3>No products found</h3>
            <p>Create your first BDUI product to get started</p>
            <button className="btn btn-primary" onClick={handleCreateProduct}>
              Create Product
            </button>
          </div>
        </div>
      ) : (
        <div className={`products-container ${viewMode}`}>
          {viewMode === 'grid' ? (
            // Grid View
            <div className="products-grid">
              {filteredProducts.map(product => (
                <div key={product.id} className="product-card">
                  <div className="card-header">
                    <div className="card-title">
                      <h3>
                        {product.name}
                        {product.badge && (
                          <span className="product-badge">{product.badge}</span>
                        )}
                      </h3>
                      {getStatusBadge(product)}
                    </div>
                    
                    <div className="card-actions">
                      <button
                        className="action-btn"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDuplicateProduct(product)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDeleteProduct(product)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="card-content">
                    <p className="card-description">{product.description}</p>
                    
                    <div className="card-stats">
                      <div className="stat">
                        <span className="stat-value">{product.screens}</span>
                        <span className="stat-label">Screens</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{product.actions}</span>
                        <span className="stat-label">Actions</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">v{product.version}</span>
                        <span className="stat-label">Version</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <span className="last-modified">
                      Modified {formatDate(product.lastModified)}
                    </span>
                    <Link
                      to={`/products/${product.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditProduct(product, { skipNavigate: true })}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Table View
            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Screens</th>
                    <th>Last Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <Link
                          to={`/products/${product.id}`}
                          className="product-name-link"
                          onClick={() => handleEditProduct(product, { skipNavigate: true })}
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="description-cell">{product.description}</td>
                      <td>{getStatusBadge(product)}</td>
                      <td>v{product.version}</td>
                      <td>{product.screens}</td>
                      <td>{formatDate(product.lastModified)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => handleDuplicateProduct(product)}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductList;