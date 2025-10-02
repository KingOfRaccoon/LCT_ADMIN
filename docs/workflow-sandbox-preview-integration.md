# 🔄 Интеграция Workflow API в Sandbox, Preview и ScreenBuilder

## 📦 Добавленная функциональность

### 1. SandboxPage - Экспорт текущего состояния

**Что добавлено:**
- Кнопка "Export Workflow" в header песочницы
- Экспорт текущего графа и контекста в StateModel формат
- Валидация workflow перед тестированием
- Кнопка настроек Workflow Server

**Код для добавления в `src/pages/Sandbox/SandboxPage.jsx`:**

```jsx
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { WorkflowSettings } from '../../components/WorkflowSettings/WorkflowSettings';
import { Send, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const SandboxPage = () => {
  const workflow = useWorkflowApi();
  const [showWorkflowSettings, setShowWorkflowSettings] = useState(false);
  const [currentProduct, setCurrentProduct] = useState('ecommerceDashboard');

  // Экспорт текущего workflow
  const handleExportWorkflow = useCallback(async () => {
    try {
      // Получить текущий продукт данные
      const productData = currentProduct === 'avitoDemo' ? avitoDemo : ecommerceDashboard;
      
      // Создать graphData из nodes и edges
      const graphData = {
        nodes: productData.nodes || [],
        edges: productData.nodes?.flatMap(node => 
          (node.edges || []).map(edge => ({
            id: edge.id,
            source: node.id,
            target: edge.target,
            data: edge.data || {}
          }))
        ) || []
      };

      // Использовать текущий контекст
      const initialContext = context || productData.initialContext || {};

      // Валидация
      const validation = workflow.validateWorkflow(graphData, initialContext);
      if (!validation.valid) {
        toast.error(`Валидация не прошла: ${validation.error}`);
        return;
      }

      // Экспорт
      await workflow.exportWorkflow(graphData, initialContext, {
        productId: currentProduct,
        onSuccess: (res) => {
          toast.success(`Workflow экспортирован!\nID: ${res.wf_description_id}`);
        },
        onError: (err) => {
          toast.error(`Ошибка: ${err.message}`);
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Ошибка экспорта workflow');
    }
  }, [workflow, currentProduct, context]);

  return (
    <div className="sandbox-page">
      {/* Header с кнопками */}
      <div className="sandbox-header">
        <div className="header-left">
          {/* ... существующие элементы */}
        </div>
        
        <div className="header-right">
          {/* Кнопка экспорта */}
          <button 
            className="btn btn-secondary"
            onClick={handleExportWorkflow}
            disabled={workflow.isExporting}
            title="Экспортировать текущий workflow на сервер"
          >
            <Send size={18} />
            {workflow.isExporting ? 'Экспорт...' : 'Export Workflow'}
          </button>

          {/* Кнопка настроек */}
          <button 
            className="btn btn-ghost"
            onClick={() => setShowWorkflowSettings(true)}
            title="Настройки Workflow Server"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* ... остальной контент */}

      {/* Модальное окно настроек */}
      {showWorkflowSettings && (
        <div className="modal-overlay" onClick={() => setShowWorkflowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <WorkflowSettings 
              productId={currentProduct}
              onClose={() => setShowWorkflowSettings(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

**CSS для модального окна (`SandboxPage.css`):**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}
```

---

### 2. PreviewPage - Экспорт preview состояния

**Что добавлено:**
- Экспорт текущего экрана и контекста
- Кнопка в header preview

**Код для добавления в `src/pages/Preview/PreviewPage.jsx`:**

```jsx
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

const PreviewPage = () => {
  const workflow = useWorkflowApi();
  
  // Экспорт текущего состояния preview
  const handleExportWorkflow = useCallback(async () => {
    if (!screen || !context) {
      toast.error('Нет данных для экспорта');
      return;
    }

    try {
      // Создать простой граф из текущего экрана
      const graphData = {
        nodes: [
          {
            id: screen.id || 'preview-screen',
            type: 'screen',
            data: {
              label: screen.name || 'Preview Screen',
              screenId: screen.id,
              start: true,
              final: true
            }
          }
        ],
        edges: []
      };

      await workflow.exportWorkflow(graphData, context, {
        productId: 'preview',
        onSuccess: (res) => {
          toast.success(`Preview экспортирован!\nID: ${res.wf_description_id}`);
        },
        onError: (err) => {
          toast.error(`Ошибка: ${err.message}`);
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Ошибка экспорта preview');
    }
  }, [workflow, screen, context]);

  return (
    <div className="preview-page">
      <div className="preview-header">
        <h2>{contextTitle}</h2>
        
        <div className="preview-actions">
          {/* Кнопка экспорта */}
          <button 
            className="btn btn-secondary"
            onClick={handleExportWorkflow}
            disabled={workflow.isExporting || !screen}
            title="Экспортировать preview как workflow"
          >
            <Send size={18} />
            {workflow.isExporting ? 'Экспорт...' : 'Export'}
          </button>
        </div>
      </div>

      {/* ... остальной контент */}
    </div>
  );
};
```

---

### 3. ScreenBuilder - Экспорт построенного экрана

**Что добавлено:**
- Экспорт layout экрана как workflow
- Валидация компонентов перед экспортом
- Конвертация компонентов в StateModel

**Код для добавления в `src/pages/ScreenBuilder/ScreenBuilder.jsx`:**

```jsx
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

const ScreenBuilder = () => {
  const workflow = useWorkflowApi();
  const { productId, screenId } = useParams();

  // Экспорт screen layout
  const handleExportWorkflow = useCallback(async () => {
    if (!components || components.length === 0) {
      toast.error('Нет компонентов для экспорта');
      return;
    }

    try {
      // Создать узел экрана из текущего layout
      const screenNode = {
        id: screenId || 'built-screen',
        type: 'screen',
        data: {
          label: currentScreen?.name || 'Built Screen',
          screenId: screenId,
          start: true,
          final: true,
          layout: {
            components: components,
            sections: sections // если используется новый формат
          }
        }
      };

      const graphData = {
        nodes: [screenNode],
        edges: []
      };

      // Создать initialContext из переменных
      const initialContext = variablesList.reduce((acc, varName) => {
        const variable = variables[varName];
        if (variable) {
          acc[varName] = variable.value;
        }
        return acc;
      }, {});

      // Валидация
      const validation = workflow.validateWorkflow(graphData, initialContext);
      if (!validation.valid) {
        toast.error(`Валидация не прошла: ${validation.error}`);
        return;
      }

      // Экспорт
      await workflow.exportWorkflow(graphData, initialContext, {
        productId: productId,
        onSuccess: (res) => {
          toast.success(`Screen экспортирован!\nID: ${res.wf_description_id}`);
        },
        onError: (err) => {
          toast.error(`Ошибка: ${err.message}`);
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Ошибка экспорта screen');
    }
  }, [workflow, components, sections, screenId, currentScreen, variablesList, variables, productId]);

  return (
    <div className="screen-builder">
      <div className="builder-header">
        {/* ... существующие кнопки */}
        
        <button 
          className="btn btn-secondary"
          onClick={handleExportWorkflow}
          disabled={workflow.isExporting}
          title="Экспортировать screen как workflow"
        >
          <Send size={18} />
          {workflow.isExporting ? 'Экспорт...' : 'Export Screen'}
        </button>
      </div>

      {/* ... остальной контент */}
    </div>
  );
};
```

---

## 🎯 Общие функции для всех компонентов

### Универсальный компонент кнопки экспорта

**Создать:** `src/components/WorkflowExportButton/WorkflowExportButton.jsx`

```jsx
import { useState } from 'react';
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import './WorkflowExportButton.css';

export function WorkflowExportButton({ 
  graphData, 
  initialContext, 
  productId,
  label = 'Export Workflow',
  className = '',
  showValidation = true 
}) {
  const workflow = useWorkflowApi();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleExport = async () => {
    if (!graphData) {
      toast.error('Нет данных для экспорта');
      return;
    }

    try {
      // Валидация если включена
      if (showValidation) {
        const validation = workflow.validateWorkflow(graphData, initialContext || {});
        if (!validation.valid) {
          toast.error(`Валидация не прошла: ${validation.error}`);
          return;
        }
      }

      // Экспорт
      await workflow.exportWorkflow(graphData, initialContext || {}, {
        productId,
        onSuccess: (res) => {
          toast.success(
            `Workflow экспортирован!\nID: ${res.wf_description_id}`,
            { duration: 5000 }
          );
        },
        onError: (err) => {
          toast.error(`Ошибка: ${err.message}`);
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Ошибка экспорта workflow');
    }
  };

  return (
    <div className="workflow-export-button-wrapper">
      <button 
        className={`btn btn-secondary ${className}`}
        onClick={handleExport}
        disabled={workflow.isExporting || !graphData}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Send size={18} />
        {workflow.isExporting ? 'Экспорт...' : label}
      </button>

      {showTooltip && workflow.workflowId && (
        <div className="export-tooltip">
          Workflow ID: {workflow.workflowId}
        </div>
      )}
    </div>
  );
}

export default WorkflowExportButton;
```

**CSS:** `src/components/WorkflowExportButton/WorkflowExportButton.css`

```css
.workflow-export-button-wrapper {
  position: relative;
  display: inline-block;
}

.export-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
}

.export-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #1e293b;
}
```

---

## 📝 Использование универсального компонента

### В SandboxPage:
```jsx
import { WorkflowExportButton } from '../../components/WorkflowExportButton/WorkflowExportButton';

<WorkflowExportButton
  graphData={graphData}
  initialContext={context}
  productId={currentProduct}
  label="Export Sandbox"
/>
```

### В PreviewPage:
```jsx
<WorkflowExportButton
  graphData={graphData}
  initialContext={context}
  productId="preview"
  label="Export Preview"
  showValidation={false}
/>
```

### В ScreenBuilder:
```jsx
<WorkflowExportButton
  graphData={graphData}
  initialContext={initialContext}
  productId={productId}
  label="Export Screen"
/>
```

---

## ✅ Чек-лист интеграции

### SandboxPage
- [ ] Добавить `useWorkflowApi` hook
- [ ] Добавить кнопку "Export Workflow"
- [ ] Добавить кнопку "Workflow Settings"
- [ ] Добавить модальное окно настроек
- [ ] Создать graphData из nodes/edges
- [ ] Валидация перед экспортом

### PreviewPage
- [ ] Добавить `useWorkflowApi` hook
- [ ] Добавить кнопку экспорта
- [ ] Создать graphData из текущего screen
- [ ] Обработка ошибок

### ScreenBuilder
- [ ] Добавить `useWorkflowApi` hook
- [ ] Добавить кнопку экспорта
- [ ] Преобразовать components в graphData
- [ ] Создать initialContext из variables
- [ ] Валидация layout

### Универсальный компонент
- [ ] Создать WorkflowExportButton
- [ ] CSS стили
- [ ] Tooltip с Workflow ID
- [ ] Обработка состояния загрузки

---

## 🚀 Готово к использованию!

После добавления этих изменений, все основные компоненты проекта будут иметь интеграцию с Workflow API:
- ✅ ScreenEditor
- ✅ SandboxPage
- ✅ PreviewPage
- ✅ ScreenBuilder

Каждый компонент сможет экспортировать свое состояние в StateModel формат на сервер! 🎉

---

*Дата: 1 октября 2025 г.*
