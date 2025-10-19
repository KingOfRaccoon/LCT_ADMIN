import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  Monitor, 
  Activity, 
  Edit3,
  Trash2,
  Copy,
  Play,
  ArrowRight,
  Palette,
  Globe,
  Database,
  Save,
  ChevronDown
} from 'lucide-react';
import { useVirtualContext } from '../../context/VirtualContext';
import { WorkflowExportButton } from '../../components/WorkflowExportButton/WorkflowExportButton';
import toast from 'react-hot-toast';
import './ProductOverview.css';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { loadAvitoDemoAsGraphData, loadAvitoDemoSubflowAsGraphData, convertAvitoDemoScreensToArray } from '../../utils/avitoDemoConverter';
import { getProductById as getProductByIdApi } from '../../services/productApi.js';

const DEFAULT_REMOTE_VERSION = '1.0.0';

function normalizeScreensFromWorkflow(workflow) {
  if (!workflow) {
    return [];
  }

  if (Array.isArray(workflow.screens)) {
    return workflow.screens.map((screen, index) => ({
      id: screen?.id ?? `screen-${index + 1}`,
      name: screen?.name ?? `Screen ${index + 1}`,
      type: screen?.type ?? 'screen',
      description: screen?.description ?? '',
      order: screen?.order ?? index + 1,
      components: screen?.components ?? screen?.componentsCount ?? 0,
      actions: screen?.actions ?? screen?.actionsCount ?? 0,
      status: screen?.status ?? 'draft'
    }));
  }

  if (workflow.screens && typeof workflow.screens === 'object') {
    return Object.entries(workflow.screens).map(([id, screen], index) => ({
      id,
      name: screen?.name ?? id,
      type: screen?.type ?? screen?.screenType ?? 'screen',
      description: screen?.description ?? '',
      order: screen?.order ?? index + 1,
      components: screen?.components ?? screen?.componentsCount ?? 0,
      actions: screen?.actions ?? screen?.actionsCount ?? 0,
      status: screen?.status ?? 'draft'
    }));
  }

  if (Array.isArray(workflow.nodes)) {
    const screenNodes = workflow.nodes.filter((node) => String(node?.type || '').toLowerCase() === 'screen');
    return screenNodes.map((node, index) => ({
      id: node.id ?? `screen-${index + 1}`,
      name: node.data?.name ?? node.label ?? `Screen ${index + 1}`,
      type: node.type ?? 'screen',
      description: node.data?.description ?? '',
      order: node.data?.order ?? index + 1,
      components: node.data?.components ?? node.data?.componentsCount ?? 0,
      actions: node.data?.actions ?? node.data?.actionsCount ?? 0,
      status: node.data?.status ?? 'draft'
    }));
  }

  return [];
}

const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { 
    currentProduct, 
    setProduct, 
    screens: _screens, 
    addScreen, 
    deleteScreen,
    setCurrentScreen,
    setScreens,
    updateApiEndpointsInGraph,
    graphData,
    variables,
    setGraphData,
    setVariableSchemas
  } = useVirtualContext();

  // Local state for product metadata editing
  const [isEditing, setIsEditing] = useState(false);
  const [productMeta, setProductMeta] = useState({
    name: '',
    version: '',
    description: '',
    theme: 'light',
    permissions: [],
    integrations: []
  });

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState({
    theme: 'light',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    fontFamily: 'Inter',
    permissions: ['read', 'write'],
    apiBaseUrl: 'https://api.example.com',
    enableRealTimeUpdates: true,
    enableOfflineMode: false
  });

  // Синхронизация endpoint для всех API Call при изменении apiBaseUrl
  useEffect(() => {
    if (globalSettings.apiBaseUrl) {
      updateApiEndpointsInGraph(globalSettings.apiBaseUrl);
    }
  }, [globalSettings.apiBaseUrl, updateApiEndpointsInGraph]);

  // Screens data - будет загружено из JSON или mock данных
  const [productScreens, setProductScreens] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [screenPendingDelete, setScreenPendingDelete] = useState(null);

  useEffect(() => {
    setScreens(productScreens);
  }, [productScreens, setScreens]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadAvitoDemo = async () => {
      setIsLoadingData(true);
      try {
        const data = await loadAvitoDemoAsGraphData();
        if (!isMounted) {
          return;
        }

        setGraphData({ nodes: data.nodes, edges: data.edges, screens: data.screens });
        setVariableSchemas(data.variableSchemas);
        const screensArray = convertAvitoDemoScreensToArray(data.screens, data.nodes);
        setProductScreens(screensArray);

        const mockProduct = {
          id: productId,
          name: 'Авито — Корзина',
          version: '1.0.0',
          description: 'Демонстрационный сценарий корзины Avito с 11 экранами и 25 действиями',
          theme: 'light',
          permissions: ['admin', 'viewer'],
          integrations: ['avito-api']
        };

        setProduct(mockProduct);
        setProductMeta(mockProduct);
        toast.success('avitoDemo загружен успешно!');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to load avitoDemo:', error);
        toast.error('Ошибка загрузки avitoDemo: ' + error.message);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    const loadAvitoDemoSubflow = async () => {
      setIsLoadingData(true);
      try {
        const data = await loadAvitoDemoSubflowAsGraphData();
        if (!isMounted) {
          return;
        }

        setGraphData({ nodes: data.nodes, edges: data.edges, screens: data.screens });
        setVariableSchemas(data.variableSchemas);
        const screensArray = convertAvitoDemoScreensToArray(data.screens, data.nodes);
        setProductScreens(screensArray);

        const mockProduct = {
          id: productId,
          name: 'Авито — Корзина с Subflow',
          version: '1.0.0',
          description: 'Профессиональный сценарий корзины с переиспользуемым онбордингом (Subflow): 13 экранов, 27 действий',
          theme: 'light',
          permissions: ['admin', 'viewer'],
          integrations: ['avito-api'],
          badge: '🔥 NEW'
        };

        setProduct(mockProduct);
        setProductMeta(mockProduct);
        toast.success('avitoDemoSubflow загружен успешно!');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to load avitoDemoSubflow:', error);
        toast.error('Ошибка загрузки avitoDemoSubflow: ' + error.message);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    const loadRemoteProduct = async () => {
      setIsLoadingData(true);
      try {
        const product = await getProductByIdApi(productId, { signal: controller.signal, parseWorkflow: true });
        if (!isMounted) {
          return;
        }

        if (!product) {
          toast.error('Продукт не найден');
          setProductScreens([]);
          setGraphData({ nodes: [], edges: [], screens: {} });
          setVariableSchemas({});
          setProductMeta((prev) => ({
            ...prev,
            name: '',
            version: DEFAULT_REMOTE_VERSION,
            description: ''
          }));
          return;
        }

        setProduct(product);
        setProductMeta((prev) => ({
          ...prev,
          name: product.name ?? '',
          version: product.workflow?.version ?? DEFAULT_REMOTE_VERSION,
          description: product.description ?? ''
        }));

        setVariableSchemas(product.variableSchemas ?? {});

        const rawNodes = Array.isArray(product.workflow?.nodes) ? product.workflow.nodes : [];
        const edges = Array.isArray(product.workflow?.edges) ? product.workflow.edges : [];
        const screensMap = product.workflow?.screens ?? {};

        // Normalize nodes to ensure they have position field
        const nodes = rawNodes.map((node, index) => ({
          ...node,
          position: node.position && typeof node.position === 'object' && 
                    Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
            ? node.position
            : { x: 100 + (index % 5) * 200, y: 100 + Math.floor(index / 5) * 150 }
        }));

        // Preserve all workflow metadata
        const fullWorkflow = {
          ...product.workflow,
          nodes,
          edges,
          screens: screensMap,
          // Ensure essential fields exist
          id: product.workflow?.id || product.workflow?.workflow_id || product.workflowId,
          workflow_id: product.workflow?.workflow_id || product.workflow?.id || product.workflowId,
          name: product.workflow?.name || product.name || 'Workflow',
          version: product.workflow?.version || '1.0.0',
          variableSchemas: product.workflow?.variableSchemas || {},
          initialContext: product.workflow?.initialContext || {}
        };

        console.log('[ProductOverview] Setting graphData with metadata:', {
          id: fullWorkflow.id,
          workflow_id: fullWorkflow.workflow_id,
          name: fullWorkflow.name,
          version: fullWorkflow.version,
          nodesCount: fullWorkflow.nodes.length,
          edgesCount: fullWorkflow.edges.length,
          screensCount: Object.keys(fullWorkflow.screens).length
        });

        setGraphData(fullWorkflow);
        const screensArray = normalizeScreensFromWorkflow(product.workflow);
        setProductScreens(screensArray);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        if (!isMounted) {
          return;
        }
        console.error('Failed to load product:', error);
        toast.error('Ошибка загрузки продукта');
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    if (productId === 'avito-cart-demo') {
      loadAvitoDemo();
    } else if (productId === 'avito-cart-demo-subflow') {
      loadAvitoDemoSubflow();
    } else {
      loadRemoteProduct();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId, setProduct, setGraphData, setVariableSchemas]);

  const handleSaveMetadata = () => {
    const updatedProduct = { ...currentProduct, ...productMeta };
    setProduct(updatedProduct);
    setIsEditing(false);
    toast.success('Product metadata updated!');
  };

  const handleAddScreen = () => {
    const newScreen = {
      id: `screen-${Date.now()}`,
      name: 'New Screen',
      type: 'display',
      description: 'New screen description',
      order: productScreens.length + 1,
      components: 0,
      actions: 0,
      status: 'draft'
    };
    
    setProductScreens([...productScreens, newScreen]);
    addScreen(newScreen);
    toast.success('New screen added!');
  };

  const handleRequestDeleteScreen = (screen) => {
    setScreenPendingDelete(screen);
  };

  const handleCancelDeleteScreen = () => {
    setScreenPendingDelete(null);
  };

  const handleConfirmDeleteScreen = () => {
    if (!screenPendingDelete) {
      return;
    }

    const screenId = screenPendingDelete.id;
    setProductScreens((prev) => prev.filter((screen) => screen.id !== screenId));
    deleteScreen(screenId);
    toast.success('Screen deleted!');
    setScreenPendingDelete(null);
  };

  const handleEditScreen = (screen) => {
    setCurrentScreen(screen);
    navigate(`/products/${productId}/screens/${screen.id}/editor`);
  };

  const handleBuildScreen = (screen) => {
    setCurrentScreen(screen);
    navigate(`/products/${productId}/screens/${screen.id}/builder`);
  };

  const _reorderScreens = (fromIndex, toIndex) => {
    const reorderedScreens = [...productScreens];
    const [moved] = reorderedScreens.splice(fromIndex, 1);
    reorderedScreens.splice(toIndex, 0, moved);
    
    // Update order numbers
    const updatedScreens = reorderedScreens.map((screen, index) => ({
      ...screen,
      order: index + 1
    }));
    
    setProductScreens(updatedScreens);
    toast.success('Screen order updated!');
  };

  const getScreenTypeIcon = (type) => {
    switch (type) {
      case 'form': return Edit3;
      case 'display': return Monitor;
      case 'action': return Activity;
      default: return Monitor;
    }
  };

  const getStatusBadge = (status) => (
    <span className={`status-badge status-${status}`}>
      {status}
    </span>
  );

  return (
    <div className="product-overview-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="breadcrumb">
            <Link to="/products">Products</Link>
            <ArrowRight size={16} />
            <span>{productMeta.name}</span>
          </div>
          
          <div className="product-title">
            {isEditing ? (
              <input
                type="text"
                value={productMeta.name}
                onChange={(e) => setProductMeta({ ...productMeta, name: e.target.value })}
                className="title-input"
              />
            ) : (
              <h1>{productMeta.name}</h1>
            )}
            
            <div className="product-version">
              v{productMeta.version}
            </div>
          </div>
          
          {isEditing ? (
            <div className="edit-actions">
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveMetadata}>
                <Save size={18} />
                Save Changes
              </button>
            </div>
          ) : (
            <div className="edit-actions">
              {/* Кнопка экспорта workflow */}
              <WorkflowExportButton
                graphData={graphData}
                initialContext={variables || {}}
                productId={productId}
                label="Export Workflow"
                className="export-workflow-btn"
              />
              
              <button 
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={18} />
                Edit Metadata
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setCurrentScreen({ id: 'product-overview', name: productMeta.name, type: 'product' });
                  navigate(`/products/${productId}/screens/product-overview/editor`);
                }}
              >
                <Edit3 size={18} />
                Edit on Canvas
              </button>
            </div>
          )}
        </div>
      </div>

  <div className="overview-content">
        {/* Product Metadata Section */}
        <div className="metadata-section">
          <div className="section-header">
            <h2>Product Information</h2>
          </div>
          
          <div className="metadata-grid">
            <div className="metadata-item">
              <label>Description</label>
              {isEditing ? (
                <textarea
                  value={productMeta.description}
                  onChange={(e) => setProductMeta({ ...productMeta, description: e.target.value })}
                  className="metadata-input"
                  rows={3}
                />
              ) : (
                <p>{productMeta.description}</p>
              )}
            </div>
            
            <div className="metadata-item">
              <label>Version</label>
              {isEditing ? (
                <input
                  type="text"
                  value={productMeta.version}
                  onChange={(e) => setProductMeta({ ...productMeta, version: e.target.value })}
                  className="metadata-input"
                />
              ) : (
                <p>v{productMeta.version}</p>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{productScreens.length}</div>
                <div className="stat-label">Total Screens</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {productScreens.reduce((sum, screen) => sum + screen.actions, 0)}
                </div>
                <div className="stat-label">Total Actions</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {productScreens.reduce((sum, screen) => sum + screen.components, 0)}
                </div>
                <div className="stat-label">Total Components</div>
              </div>
            </div>
          </div>
        </div>

        {/* Screens Management Section */}
        <div className="screens-section">
          <div className="section-header">
            <h2>Screens & Flow</h2>
            <button className="btn btn-primary" onClick={handleAddScreen}>
              <Plus size={18} />
              Add Screen
            </button>
          </div>

          {isLoadingData ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px', 
              color: '#64748b',
              fontSize: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>⏳ Загрузка данных avitoDemo...</div>
              <div style={{ fontSize: '14px' }}>Пожалуйста, подождите</div>
            </div>
          ) : productScreens.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px', 
              color: '#94a3b8',
              fontSize: '16px'
            }}>
              Нет экранов для отображения
            </div>
          ) : (
            <div className="screens-flow">
              {productScreens.map((screen) => {
                const IconComponent = getScreenTypeIcon(screen.type);
                
                return (
                  <div key={screen.id} className="screen-flow-item">
                    <div className="screen-card">
                      <div className="screen-icon">
                        <IconComponent size={24} />
                      </div>
                      
                      <div 
                        className="screen-content"
                        onClick={() => handleBuildScreen(screen)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="screen-header">
                          <h3>{screen.name}</h3>
                          {getStatusBadge(screen.status)}
                        </div>
                      
                        <p className="screen-description">{screen.description}</p>
                        
                        <div className="screen-stats">
                          <span>{screen.components} components</span>
                          <span>{screen.actions} actions</span>
                        </div>
                      </div>
                    
                    <div className="screen-actions">
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditScreen(screen);
                        }}
                        title="Edit Flow"
                      >
                        <Activity size={16} />
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuildScreen(screen);
                        }}
                        title="Build UI"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestDeleteScreen(screen);
                        }}
                        title="Delete Screen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Global Settings Sidebar */}
        <div className="settings-sidebar">
          <div className="sidebar-header">
            <h3>
              <Settings size={20} />
              Global Settings
            </h3>
          </div>

          <div className="settings-sections">
            {/* Theme Settings */}
            <div className="settings-group">
              <h4>
                <Palette size={16} />
                Theme & Appearance
              </h4>
              
              <div className="setting-item">
                <label>Theme</label>
                <select 
                  value={globalSettings.theme}
                  onChange={(e) => setGlobalSettings({
                    ...globalSettings,
                    theme: e.target.value
                  })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label>Primary Color</label>
                <input 
                  type="color"
                  value={globalSettings.primaryColor}
                  onChange={(e) => setGlobalSettings({
                    ...globalSettings,
                    primaryColor: e.target.value
                  })}
                />
              </div>
            </div>

            {/* Integration Settings */}
            <div className="settings-group">
              <h4>
                <Database size={16} />
                Integrations
              </h4>
              
              <div className="setting-item">
                <label>API Base URL</label>
                <input 
                  type="url"
                  value={globalSettings.apiBaseUrl}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setGlobalSettings((prev) => ({
                      ...prev,
                      apiBaseUrl: newValue
                    }));
                    // updateApiEndpointsInGraph(newValue); // useEffect отработает
                  }}
                />
              </div>
              
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox"
                    checked={globalSettings.enableRealTimeUpdates}
                    onChange={(e) => setGlobalSettings({
                      ...globalSettings,
                      enableRealTimeUpdates: e.target.checked
                    })}
                  />
                  Enable Real-time Updates
                </label>
              </div>
            </div>

            {/* Permissions Settings */}
            <div className="settings-group">
              <h4>
                <Globe size={16} />
                Permissions
              </h4>
              
              {['read', 'write', 'admin', 'delete'].map(permission => (
                <div key={permission} className="setting-item">
                  <label>
                    <input 
                      type="checkbox"
                      checked={globalSettings.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGlobalSettings({
                            ...globalSettings,
                            permissions: [...globalSettings.permissions, permission]
                          });
                        } else {
                          setGlobalSettings({
                            ...globalSettings,
                            permissions: globalSettings.permissions.filter(p => p !== permission)
                          });
                        }
                      }}
                    />
                    {permission.charAt(0).toUpperCase() + permission.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(screenPendingDelete)}
        title="Delete screen?"
        message={`Screen "${screenPendingDelete?.name || 'Unnamed'}" will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmDeleteScreen}
        onCancel={handleCancelDeleteScreen}
      />
    </div>
  );
};

export default ProductOverview;