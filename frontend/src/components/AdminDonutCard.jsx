import { createElement } from "react";

const COLORS = ["#2c87cc", "#23a579", "#f0a23a", "#7357c8", "#df6370", "#4b9b9b"];

export default function AdminDonutCard({ eyebrow, title, icon, metrics }) {
  const total = metrics.reduce((sum, metric) => sum + metric.value, 0);
  let currentPercent = 0;
  const segments = metrics.map((metric, index) => {
    const start = currentPercent;
    currentPercent += total > 0 ? (metric.value / total) * 100 : 0;
    return `${metric.color || COLORS[index % COLORS.length]} ${start}% ${currentPercent}%`;
  });
  const chartBackground = total > 0
    ? `conic-gradient(${segments.join(", ")})`
    : "conic-gradient(#e9eff6 0% 100%)";

  return (
    <article className="admin-analytics-card admin-donut-card">
      <div className="admin-panel-heading">
        <div>
          <span className="admin-panel-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <span className="admin-panel-icon">{createElement(icon, { size: 17, "aria-hidden": true })}</span>
      </div>
      <div className="admin-donut-content">
        <div className="admin-donut-chart" role="img" aria-label={`${title} : ${total} au total`}>
          <div className="admin-donut-ring" style={{ background: chartBackground }}>
            <div className="admin-donut-center">
              <strong>{total}</strong>
              <span>au total</span>
            </div>
          </div>
        </div>
        <ul className="admin-donut-legend" aria-label="Détail des catégories">
          {metrics.map((metric, index) => (
            <li key={metric.label}>
              <span
                className="admin-donut-swatch"
                style={{ backgroundColor: metric.color || COLORS[index % COLORS.length] }}
                aria-hidden="true"
              />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
