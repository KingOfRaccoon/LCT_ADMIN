import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Package,
  Monitor,
  Edit3,
  Settings,
  Activity,
  ChevronRight,
  FlaskConical,
  PlayCircle
} from 'lucide-react';
import { useVirtualContext } from '../../context/VirtualContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, currentPath, mobileOpen }) => {
  const { productId, screenId: _screenId } = useParams();
  const { currentProduct, screens, variables, variablesOrder } = useVirtualContext();

  const _orderedVariableNames = useMemo(() => {
    const names = Object.keys(variables || {});
    if (!variablesOrder || variablesOrder.length === 0) {
      return names;
    }
    const ordered = variablesOrder.filter((name) => names.includes(name));
    const missing = names.filter((name) => !ordered.includes(name));
    return [...ordered, ...missing];
  }, [variables, variablesOrder]);

  const navigation = [
    {
      title: 'Products',
      items: [
        {
          label: 'All Products',
          icon: Package,
          path: '/products',
          active: currentPath === '/products'
        },
        {
          label: 'Sandbox',
          icon: FlaskConical,
          path: '/sandbox',
          active: currentPath === '/sandbox'
        },
        {
          label: 'Preview',
          icon: PlayCircle,
          path: '/preview',
          active: currentPath === '/preview'
        }
      ]
    }
  ];

  // Add product-specific navigation if we're in a product
  if (productId && currentProduct) {
    navigation.push({
      title: 'Current Product',
      items: [
        {
          label: 'Overview',
          icon: Monitor,
          path: `/products/${productId}`,
          active: currentPath === `/products/${productId}`
        },
        {
          label: 'Global Settings',
          icon: Settings,
          path: `/products/${productId}/settings`,
          active: currentPath.includes('/settings')
        }
      ]
    });

    // Add screens navigation if we have screens
  if ((screens?.length || 0) > 0) {
      navigation.push({
        title: 'Screens',
        items: screens.map(screen => ({
          label: screen.name,
          icon: Monitor,
          path: `/products/${productId}/screens/${screen.id}/editor`,
          active: currentPath.includes(`/screens/${screen.id}`),
          hasSubmenu: true,
          submenu: [
            {
              label: 'Flow Editor',
              icon: Activity,
              path: `/products/${productId}/screens/${screen.id}/editor`,
              active: currentPath.includes('/editor')
            },
            {
              label: 'UI Builder',
              icon: Edit3,
              path: `/products/${productId}/screens/${screen.id}/builder`,
              active: currentPath.includes('/builder')
            }
          ]
        }))
      });
    }
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <nav className="sidebar-nav">
        {navigation.map((section, index) => (
          <div key={index} className="nav-section">
            {!collapsed && (
              <h3 className="nav-section-title">{section.title}</h3>
            )}
            
            <ul className="nav-list">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="nav-item">
                  <Link 
                    to={item.path}
                    className={`nav-link ${item.active ? 'active' : ''}`}
                  >
                    <item.icon size={20} />
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        {item.hasSubmenu && <ChevronRight size={16} />}
                      </>
                    )}
                  </Link>
                  
                  {/* Submenu for screen items */}
                  {!collapsed && item.hasSubmenu && item.submenu && (
                    <ul className="nav-submenu">
                      {item.submenu.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <Link 
                            to={subItem.path}
                            className={`nav-sublink ${subItem.active ? 'active' : ''}`}
                          >
                            <subItem.icon size={16} />
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Virtual Context Variables Panel (bottom) */}
      {!collapsed && (
        <div className="sidebar-footer">
          {/* <div className="context-panel">
            <h4>Context Variables</h4>
            <div className="variable-list">
              {orderedVariableNames.slice(0, 3).map((name) => {
                const variable = variables[name];
                if (!variable) {
                  return null;
                }
                return (
                  <div key={name} className="variable-item">
                    <span className="variable-name">{name}</span>
                    <span className="variable-type">{variable.type}</span>
                  </div>
                );
              })}
              {orderedVariableNames.length > 3 && (
                <div className="variable-more">
                  +{orderedVariableNames.length - 3} more
                </div>
              )}
            </div>
          </div> */}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;