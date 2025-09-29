import { useVirtualContext } from '../../context/VirtualContext';
import { Menu, Bell, Settings, User } from 'lucide-react';
import './Header.css';

const Header = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { currentProduct, variables } = useVirtualContext();

  return (
    <header className={`header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="header-left">
        <button 
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        <h1 className="header-title">BDUI Admin Panel</h1>

        {currentProduct && (
          <span className="current-product">
            {currentProduct.name} v{currentProduct.version}
          </span>
        )}
      </div>

      <div className="header-center">
        {/* Virtual Context Variables Indicator */}
        {Object.keys(variables).length > 0 && (
          <div className="context-indicator">
            <span className="context-count">
              {Object.keys(variables).length} variables
            </span>
          </div>
        )}
      </div>

      <div className="header-right">
        <button className="header-btn">
          <Bell size={18} />
        </button>
        
        <button className="header-btn">
          <Settings size={18} />
        </button>
        
        <div className="user-menu">
          <button className="user-btn">
            <User size={18} />
            <span>aleksandrzvezdakov</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;