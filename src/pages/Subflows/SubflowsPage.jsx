import React from 'react';
import { SubflowManager } from '../../components/SubflowManager/SubflowManager';
import './SubflowsPage.css';

/**
 * Страница управления библиотекой Subflow
 */
function SubflowsPage() {
  // Получаем baseUrl из конфига или env
  const baseUrl = 'http://localhost:8000';

  return (
    <div className="subflows-page">
      <div className="subflows-page-container">
        <SubflowManager baseUrl={baseUrl} />
      </div>
    </div>
  );
}

export default SubflowsPage;
