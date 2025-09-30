import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { applyDesignTokens } from './styles/applyDesignTokens.js';
import { AnalyticsProvider } from './services/analytics';

applyDesignTokens();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AnalyticsProvider>
      <App />
    </AnalyticsProvider>
  </StrictMode>
);
