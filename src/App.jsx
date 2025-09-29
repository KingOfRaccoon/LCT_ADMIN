import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { VirtualContextProvider } from './context/VirtualContext';
import Layout from './components/Layout/Layout';
import ProductList from './pages/ProductList/ProductList';
import ProductOverview from './pages/ProductOverview/ProductOverview';
import ScreenEditor from './pages/ScreenEditor/ScreenEditor';
import ScreenBuilder from './pages/ScreenBuilder/ScreenBuilder';
import SandboxPage from './pages/Sandbox/SandboxPage';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  return (
    <VirtualContextProvider>
      <Router>
        <div className="app">
          <Toaster position="top-right" />
          <Layout>
            <Routes>
              {/* Default route - redirect to products */}
              <Route path="/" element={<Navigate to="/products" replace />} />

              {/* Sandbox */}
              <Route path="/sandbox" element={<SandboxPage />} />
              
              {/* 1. Product List Page */}
              <Route path="/products" element={<ProductList />} />
              
              {/* 2. Current Product Overview */}
              <Route path="/products/:productId" element={<ProductOverview />} />
              
              {/* Product Builder (for editing whole product on canvas) */}
              <Route path="/products/:productId/builder" element={<ScreenBuilder />} />
              
              {/* 3. Screen Editor with Graph */}
              <Route path="/products/:productId/screens/:screenId/editor" element={<ScreenEditor />} />
              
              {/* 4. Screen Builder Modal/Page */}
              <Route path="/products/:productId/screens/:screenId/builder" element={<ScreenBuilder />} />
              <Route path="/products/:productId/screens/new" element={<ScreenBuilder />} />
            </Routes>
          </Layout>
        </div>
      </Router>
    </VirtualContextProvider>
  );

}

export default App;