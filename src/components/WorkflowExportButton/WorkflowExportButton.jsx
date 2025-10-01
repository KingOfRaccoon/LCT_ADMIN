import { useState } from 'react';
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import './WorkflowExportButton.css';

/**
 * Универсальная кнопка экспорта workflow
 * Используется в Sandbox, Preview, ScreenBuilder и ProductOverview
 * 
 * @param {Object} graphData - Граф узлов и рёбер для экспорта
 * @param {Object} initialContext - Начальный контекст (переменные)
 * @param {string} productId - ID продукта
 * @param {string} label - Текст кнопки
 * @param {string} className - Дополнительные CSS классы
 * @param {boolean} showValidation - Показывать ли результат валидации
 */
export function WorkflowExportButton({ 
  graphData, 
  initialContext = {}, 
  productId = 'unknown',
  label = 'Export Workflow',
  className = '',
  showValidation = true,
  size = 18,
  variant = 'secondary'
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
        const validation = workflow.validateWorkflow(graphData, initialContext);
        if (!validation.valid) {
          toast.error(`Валидация не прошла:\n${validation.error}`, {
            duration: 5000
          });
          return;
        }
        // Показываем успех валидации
        toast.success('✓ Валидация пройдена', { duration: 2000 });
      }

      // Экспорт
      await workflow.exportWorkflow(graphData, initialContext, {
        productId,
        onSuccess: (res) => {
          toast.success(
            `Workflow экспортирован!\nID: ${res.wf_description_id}`,
            { duration: 5000 }
          );
        },
        onError: (err) => {
          toast.error(`Ошибка экспорта:\n${err.message}`, {
            duration: 5000
          });
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Ошибка экспорта workflow:\n${error.message}`);
    }
  };

  const btnClass = `btn btn-${variant} ${className}`;

  return (
    <div 
      className="workflow-export-button-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button 
        className={btnClass}
        onClick={handleExport}
        disabled={workflow.isExporting || !graphData}
        title={`Экспортировать на Workflow Server (${workflow.serverUrl || 'не настроен'})`}
      >
        <Send size={size} />
        {workflow.isExporting ? 'Экспорт...' : label}
      </button>

      {showTooltip && workflow.workflowId && (
        <div className="export-tooltip">
          <strong>Workflow ID:</strong> {workflow.workflowId}
          <br />
          <small>Server: {workflow.serverUrl}</small>
        </div>
      )}
    </div>
  );
}

export default WorkflowExportButton;
