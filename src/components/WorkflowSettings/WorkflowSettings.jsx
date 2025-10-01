/**
 * Workflow Settings Component
 * 
 * UI компонент для настройки Workflow Server интеграции
 */

import { useState, useEffect } from 'react';
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { CheckCircle, XCircle, Settings, Server, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import './WorkflowSettings.css';

export function WorkflowSettings({ productId, onClose }) {
  const workflow = useWorkflowApi();
  const [serverUrl, setServerUrl] = useState('');
  const [autoSave, setAutoSave] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [serverHealth, setServerHealth] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [lastExport, setLastExport] = useState(null);

  // Загрузка настроек при монтировании
  useEffect(() => {
    setServerUrl(workflow.getServerUrl());
    setAutoSave(workflow.getAutoSave());
    
    if (productId) {
      setWorkflowId(workflow.getWorkflowId(productId));
      setLastExport(workflow.getLastExportTime(productId));
    }
  }, [workflow, productId]);

  // Проверка здоровья сервера
  const handleCheckHealth = async () => {
    setIsChecking(true);
    try {
      const health = await workflow.checkServerHealth();
      setServerHealth(health);
      
      if (health.healthy) {
        toast.success('Сервер доступен ✓');
      } else {
        toast.error('Сервер недоступен ✗');
      }
    } catch (error) {
      setServerHealth({ healthy: false, error: error.message });
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Сохранение настроек
  const handleSave = () => {
    workflow.setServerUrl(serverUrl);
    workflow.setAutoSave(autoSave);
    toast.success('Настройки сохранены');
    
    if (onClose) {
      onClose();
    }
  };

  // Сброс настроек
  const handleReset = () => {
    const defaultUrl = 'http://127.0.0.1:8000';
    setServerUrl(defaultUrl);
    setAutoSave(false);
    workflow.setServerUrl(defaultUrl);
    workflow.setAutoSave(false);
    toast.success('Настройки сброшены');
  };

  // Очистка данных workflow
  const handleClearData = () => {
    if (productId) {
      workflow.clearWorkflowData(productId);
      setWorkflowId(null);
      setLastExport(null);
      toast.success('Данные workflow очищены');
    }
  };

  // Форматирование времени
  const formatTime = (date) => {
    if (!date) return 'Никогда';
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="workflow-settings">
      <div className="workflow-settings-header">
        <Settings size={20} />
        <h3>Настройки Workflow Server</h3>
      </div>

      <div className="workflow-settings-content">
        {/* Server URL */}
        <div className="setting-group">
          <label>
            <Server size={16} />
            URL сервера
          </label>
          <div className="input-with-button">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCheckHealth}
              disabled={isChecking}
            >
              {isChecking ? (
                <RefreshCw size={14} className="spinning" />
              ) : (
                'Проверить'
              )}
            </button>
          </div>
          
          {serverHealth && (
            <div className={`server-status ${serverHealth.healthy ? 'healthy' : 'unhealthy'}`}>
              {serverHealth.healthy ? (
                <>
                  <CheckCircle size={14} />
                  <span>Сервер доступен</span>
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  <span>Сервер недоступен</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Auto Save */}
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
            />
            <span>Автоматически отправлять на сервер при сохранении</span>
          </label>
          <p className="setting-hint">
            При включении workflow будет автоматически экспортироваться на сервер при каждом сохранении
          </p>
        </div>

        {/* Product Info */}
        {productId && (
          <div className="setting-group">
            <label>Информация о продукте</label>
            <div className="product-info">
              <div className="info-row">
                <span className="label">Product ID:</span>
                <code>{productId}</code>
              </div>
              <div className="info-row">
                <span className="label">Workflow ID:</span>
                <code>{workflowId || 'Не экспортирован'}</code>
              </div>
              <div className="info-row">
                <span className="label">Последний экспорт:</span>
                <span>{formatTime(lastExport)}</span>
              </div>
            </div>
            
            {workflowId && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleClearData}
              >
                Очистить данные workflow
              </button>
            )}
          </div>
        )}
      </div>

      <div className="workflow-settings-footer">
        <button className="btn btn-secondary" onClick={handleReset}>
          Сбросить
        </button>
        <div className="footer-right">
          {onClose && (
            <button className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowSettings;
