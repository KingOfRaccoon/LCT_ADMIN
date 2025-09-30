import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Activity, Clock, Eye, MousePointerClick, Trash2 } from 'lucide-react';
import { useAnalytics, buildAnalyticsSummary } from '../../services/analytics';
import './AnalyticsDashboard.css';

const formatDuration = (ms) => {
  const numeric = Number(ms);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—';
  }
  if (numeric < 1000) {
    return `${Math.round(numeric)} мс`;
  }
  const seconds = numeric / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} с`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes} мин ${remainder} с`;
};

const palette = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#14b8a6', '#facc15'];

/**
 * Дашборд аналитики по действиям в Sandbox, визуализирует просмотры экранов, клики и длительность взаимодействия.
 */
const AnalyticsDashboard = () => {
  const { events, clearEvents } = useAnalytics();

  const summary = useMemo(() => buildAnalyticsSummary(events), [events]);
  const { totals, screenSeries, clickSeries, timelineSeries } = summary;

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Аналитика сценариев</h1>
          <p>Собранные метрики просмотров, кликов и длительности взаимодействий в песочнице.</p>
        </div>
        <button type="button" className="analytics-clear" onClick={clearEvents}>
          <Trash2 size={16} />
          Очистить события
        </button>
      </header>

      <section className="analytics-summary">
        <article className="analytics-card">
          <Eye size={20} />
          <div>
            <span>Просмотры экранов</span>
            <strong>{totals.views}</strong>
          </div>
        </article>
        <article className="analytics-card">
          <MousePointerClick size={20} />
          <div>
            <span>Клики</span>
            <strong>{totals.clicks}</strong>
          </div>
        </article>
        <article className="analytics-card">
          <Activity size={20} />
          <div>
            <span>Отслеживаемых экранов</span>
            <strong>{totals.trackedScreens}</strong>
          </div>
        </article>
        <article className="analytics-card">
          <Clock size={20} />
          <div>
            <span>Средняя длительность</span>
            <strong>{formatDuration(totals.avgDurationMs)}</strong>
          </div>
        </article>
      </section>

      <section className="analytics-grid">
        <div className="analytics-panel">
          <header>
            <h2>Динамика событий</h2>
            <p>Суммарные просмотры и клики по временным интервалам.</p>
          </header>
          <div className="analytics-chart">
            {timelineSeries.length === 0 ? (
              <div className="analytics-empty">Событий ещё не зафиксировано</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={timelineSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                  <Line type="monotone" dataKey="screenViews" name="Просмотры" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clicks" name="Клики" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="analytics-panel">
          <header>
            <h2>Экраны</h2>
            <p>Топ экранов по количеству просмотров и времени взаимодействия.</p>
          </header>
          <div className="analytics-chart">
            {screenSeries.length === 0 ? (
              <div className="analytics-empty">Просмотры ещё не собирались</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={screenSeries} layout="vertical" margin={{ top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="screenName" type="category" width={160} />
                  <Tooltip formatter={(value, name) => name === 'avgDurationMs' ? formatDuration(value) : value} />
                  <Bar dataKey="views" name="Просмотры" fill="#2563eb">
                    {screenSeries.map((entry, index) => (
                      <Cell key={entry.screenId} fill={palette[index % palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {screenSeries.length > 0 && (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Экран</th>
                  <th>Просмотры</th>
                  <th>Средняя длительность</th>
                </tr>
              </thead>
              <tbody>
                {screenSeries.map((screen) => (
                  <tr key={screen.screenId}>
                    <td>{screen.screenName}</td>
                    <td>{screen.views}</td>
                    <td>{formatDuration(screen.avgDurationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="analytics-panel">
        <header>
          <h2>Клики по компонентам</h2>
          <p>Компоненты с наибольшим количеством взаимодействий.</p>
        </header>
        {clickSeries.length === 0 ? (
          <div className="analytics-empty">Пока нет данных о кликах</div>
        ) : (
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Компонент</th>
                <th>Экран</th>
                <th>Количество</th>
              </tr>
            </thead>
            <tbody>
              {clickSeries.map((click) => (
                <tr key={`${click.componentId ?? click.label}-${click.screenId ?? 'global'}`}>
                  <td>{click.label}</td>
                  <td>{click.screenName || '—'}</td>
                  <td>{click.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
