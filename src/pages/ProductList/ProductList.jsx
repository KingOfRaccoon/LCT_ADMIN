import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Copy,
  MoreVertical,
  Grid,
  List as ListIcon
} from 'lucide-react';
import { useVirtualContext } from '../../context/VirtualContext';
import toast from 'react-hot-toast';
import './ProductList.css';

const ProductList = () => {
  const navigate = useNavigate();
  const { setProduct } = useVirtualContext();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [_selectedProducts, _setSelectedProducts] = useState([]);

  // Mock data - In real app, this would come from API
  useEffect(() => {
    const mockProducts = [
      {
        id: '1',
        name: 'E-commerce Dashboard',
        description: 'Admin panel for managing products, orders, and customers',
        status: 'active',
        version: '2.1.0',
        lastModified: '2024-01-15T10:30:00Z',
        createdBy: 'aleksandrzvezdakov',
        screens: 8,
        actions: 15
      },
      {
        id: '2',
        name: 'User Registration Flow',
        description: 'Multi-step registration process with validation',
        status: 'draft',
        version: '1.0.0',
        lastModified: '2024-01-10T14:22:00Z',
        createdBy: 'aleksandrzvezdakov',
        screens: 4,
        actions: 7
      },
      {
        id: '3',
        name: 'Payment Gateway Integration',
        description: 'Complete payment processing workflow',
        status: 'active',
        version: '1.3.2',
        lastModified: '2024-01-08T09:15:00Z',
        createdBy: 'aleksandrzvezdakov',
        screens: 6,
        actions: 12
      }
    ];
    
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 500);
  }, []);

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle product actions
  const handleCreateProduct = () => {
    const newProduct = {
      id: Date.now().toString(),
      name: 'New Product',
      description: 'Product description',
      status: 'draft',
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      createdBy: 'aleksandrzvezdakov',
      screens: 0,
      actions: 0
    };
    
    setProducts([newProduct, ...products]);
    setProduct(newProduct);
    navigate(`/products/${newProduct.id}`);
    toast.success('New product created!');
  };

  const handleEditProduct = (product) => {
    setProduct(product);
    navigate(`/products/${product.id}`);
  };

  const handleDuplicateProduct = (product) => {
    const duplicatedProduct = {
      ...product,
      id: Date.now().toString(),
      name: `${product.name} (Copy)`,
      status: 'draft',
      lastModified: new Date().toISOString()
    };
    
    setProducts([duplicatedProduct, ...products]);
    toast.success('Product duplicated successfully!');
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted successfully!');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => (
    <span className={`status-badge status-${status}`}>
      {status === 'active' ? 'Active' : 'Draft'}
    </span>
  );

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
        >
          <Plus size={20} />
          New Product
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
                      <h3>{product.name}</h3>
                      {getStatusBadge(product.status)}
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
                        onClick={() => handleDeleteProduct(product.id)}
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
                      onClick={() => setProduct(product)}
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
                          onClick={() => setProduct(product)}
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="description-cell">{product.description}</td>
                      <td>{getStatusBadge(product.status)}</td>
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
                            onClick={() => handleDeleteProduct(product.id)}
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