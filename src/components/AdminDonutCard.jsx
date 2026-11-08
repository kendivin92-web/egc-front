const METRIC_CLASSES = {
  "is-pending": "admin-donut-metric-pending",
  "is-confirmed": "admin-donut-metric-confirmed",
  "is-rejected": "admin-donut-metric-rejected",
  "is-role": "admin-donut-metric-role",
};

export default function AdminDonutCard({
  eyebrow,
  title,
  value,
  total,
  centerLabel,
  metrics,
}) {
  const safeTotal = Number.isFinite(total) ? Math.max(total, 0) : 0;
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const percentage = safeTotal > 0
    ? Math.min(Math.round((safeValue / safeTotal) * 100), 100)
    : 0;

  return (
    <article className="admin-analytics-card admin-donut-card">
      <div className="admin-panel-heading">
        <div>
          <span className="admin-panel-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="admin-donut-content">
        <div
          className="admin-donut"
          style={{ "--donut-progress": `${percentage}%` }}
          role="img"
          aria-label={`${title} : ${percentage} %, ${safeValue} sur ${safeTotal}`}
        >
          <div className="admin-donut-center">
            <strong>{percentage}%</strong>
            <span>{centerLabel}</span>
          </div>
        </div>
        <ul className="admin-donut-legend">
          {metrics.map((metric) => (
            <li key={metric.label}>
              <span className={`admin-donut-marker ${METRIC_CLASSES[metric.className] || "admin-donut-metric-role"}`} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
