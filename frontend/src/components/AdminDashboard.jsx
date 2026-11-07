import { createElement, useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  LogOut,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";
import AdminAnnouncements from "./AdminAnnouncements.jsx";
import adminLogo from "../assets/admin-logo.png";
import { API_URL } from "../services/apiConfig.js";

const API = API_URL;

const LABELS = {
  pending: "À examiner",
  confirmed: "Validée",
  rejected: "Refusée",
  pending_provider: "Prestataire non configuré",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 100;
const ADMIN_SESSION_KEY = "egc-admin-session";
const ADMIN_DATA_KEY = "egc-admin-data";

function readCache(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch (error) {
    console.error("Unable to read offline admin cache:", error);
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Unable to save offline admin cache:", error);
  }
}

function formatDate(value) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function StatusBadge({ status }) {
  return <span className={`admin-status admin-status-${status}`}>{LABELS[status] ?? status}</span>;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeSpreadsheetValue(value) {
  return typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function printRegistrations(records, printWindow) {
  const rows = records.map((registration) => `
    <tr>
      <td>${escapeHtml(`${registration.first_name} ${registration.last_name}`)}</td>
      <td>${escapeHtml(registration.activity_name)}</td>
      <td>${escapeHtml(registration.phone)}</td>
      <td>${escapeHtml(registration.email)}</td>
      <td>${escapeHtml(registration.address)}</td>
      <td>${escapeHtml(registration.district)}</td>
      <td>${escapeHtml(registration.city)}</td>
      <td>${escapeHtml(LABELS[registration.status] ?? registration.status)}</td>
    </tr>
  `).join("");
  printWindow.document.write(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Liste des inscriptions EGC</title>
        <style>
          body { color: #111; font: 10pt Arial, sans-serif; padding: 12mm; }
          h1 { font-size: 18pt; }
          p { margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; overflow-wrap: anywhere; padding: 5px; text-align: left; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Liste des inscriptions EGC</h1>
        <p>Généré le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))} · ${records.length} inscriptions</p>
        <table>
          <thead><tr>
            <th>Nom</th><th>Activité</th><th>Téléphone</th><th>E-mail</th>
            <th>Adresse</th><th>Quartier</th><th>Ville</th><th>Statut</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

const DIRECTORY_EXPORT_COLUMNS = [
  "Nom",
  "Activité",
  "Téléphone",
  "E-mail",
  "Adresse",
  "Quartier",
  "Ville",
  "Statut dans l’église",
  "Fonction",
  "Date d’adhésion",
];

function getDirectoryExportRows(records) {
  return records.map((registration) => ({
    Nom: `${registration.first_name} ${registration.last_name}`,
    Activité: registration.activity_name,
    Téléphone: registration.phone,
    "E-mail": registration.email || "",
    Adresse: registration.address || "",
    Quartier: registration.district || "",
    Ville: registration.city || "",
    "Statut dans l’église": registration.church_status || "",
    Fonction: registration.church_role || "",
    "Date d’adhésion": formatDate(registration.created_at),
  }));
}

function printDirectoryRecords(records, directory, printWindow) {
  const title = directory === "servants" ? "Liste des serviteurs EGC" : "Liste des membres EGC";
  const rows = getDirectoryExportRows(records).map((record) => `
    <tr>${Object.values(record).map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>
  `).join("");
  printWindow.document.write(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          body { color: #111; font: 10pt Arial, sans-serif; padding: 12mm; }
          h1 { font-size: 18pt; }
          p { margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; overflow-wrap: anywhere; padding: 5px; text-align: left; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Généré le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))} · ${records.length} personnes</p>
        <table>
          <thead><tr>${DIRECTORY_EXPORT_COLUMNS.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function downloadWordDirectory(records, directory) {
  const title = directory === "servants" ? "Liste des serviteurs EGC" : "Liste des membres EGC";
  const rows = getDirectoryExportRows(records);
  const tableRows = rows.map((record) => `
    <tr>${Object.values(record).map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>
  `).join("");
  const documentContent = `<!doctype html>
    <html lang="fr">
      <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Généré le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))} · ${records.length} personnes</p>
        <table border="1">
          <thead><tr>${DIRECTORY_EXPORT_COLUMNS.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>`;
  const blob = new Blob(["\ufeff", documentContent], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${directory === "servants" ? "serviteurs" : "membres"}-egc-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const CHURCH_STATUSES = ["Assistant(e)", "En service", "En formation"];
const CHURCH_ROLES = [
  "Accueil", "Chantre", "Sonorisation", "Sécurité",
  "Logistique", "NTIC", "Administration", "Communication", "Traduction",
];
const REGISTRATION_SECTIONS = ["registrations", "members", "servants", "training"];
const TRAINING_STATUS_LABELS = {
  in_progress: "En formation",
  passed: "Formation validée",
  failed: "Formation échouée",
};
const TRAINING_STATUSES = Object.keys(TRAINING_STATUS_LABELS);

async function fetchAllRegistrations(
  token,
  statusFilter,
  churchStatusFilter,
  churchRoleFilter,
  directory = "registrations",
) {
  const registrations = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(EXPORT_PAGE_SIZE),
    });
    if (directory === "members" || directory === "servants") {
      params.set("status", "confirmed");
      params.set("registrationKind", "membership");
      if (directory === "servants") {
        params.set("hasRole", "true");
        if (churchRoleFilter !== "all") params.set("churchRole", churchRoleFilter);
      }
    } else {
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (churchStatusFilter !== "all") params.set("churchStatus", churchStatusFilter);
      if (churchRoleFilter !== "all") params.set("churchRole", churchRoleFilter);
    }
    const response = await fetch(`${API}/api/admin/registrations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || "Export impossible.");
      error.status = response.status;
      throw error;
    }
    registrations.push(...data.registrations);
    totalPages = data.pagination.totalPages;
  }
  return registrations;
}

function PaginationControls({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <nav className="admin-pagination" aria-label="Pages des résultats">
      <span>
        Page {pagination.page} sur {pagination.totalPages} · {pagination.total} résultats
      </span>
      <div>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Précédente
        </button>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
        >
          Suivante
        </button>
      </div>
    </nav>
  );
}

function RegistrationRecord({
  registration,
  onUpdate,
  onTrainingStatusChange,
  churchRoles = CHURCH_ROLES,
  showTrainingStatus = false,
}) {
  const isTraining = registration.registration_kind === "formation";

  return (
    <article className="admin-record" key={registration.id}>
      <div className="admin-record-main">
        <div className="admin-record-title">
          <h3>{registration.first_name} {registration.last_name}</h3>
          <StatusBadge status={registration.status} />
          {showTrainingStatus && isTraining && (
            <span className={`admin-status admin-training-status-${registration.training_status}`}>
              {TRAINING_STATUS_LABELS[registration.training_status] ?? "En formation"}
            </span>
          )}
        </div>
        <p className="admin-record-activity">
          {isTraining ? "Formation" : "Adhésion"}
          {" · "}{registration.activity_name}
        </p>
        {!isTraining && (
          <>
            <p>
              Statut dans l’église : <strong>{registration.church_status || "Non renseigné"}</strong>
              {" · "}Fonction : <strong>{registration.church_role || "Non renseignée"}</strong>
            </p>
            <div className="admin-record-fields">
              <label>
                <span>Statut dans l’église</span>
                <select
                  value={registration.church_status || ""}
                  onChange={(event) => onUpdate(registration, { churchStatus: event.target.value })}
                >
                  <option value="">Non renseigné</option>
                  {CHURCH_STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Fonction</span>
                <select
                  value={registration.church_role || ""}
                  onChange={(event) => onUpdate(registration, { churchRole: event.target.value })}
                >
                  <option value="">Non renseignée</option>
                  {churchRoles.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
        {showTrainingStatus && isTraining && (
          <div className="admin-record-fields admin-training-field">
            <label>
              <span>Résultat de la formation</span>
              <select
                value={registration.training_status || "in_progress"}
                onChange={(event) => onTrainingStatusChange(registration, event.target.value)}
              >
                {TRAINING_STATUSES.map((value) => (
                  <option key={value} value={value}>{TRAINING_STATUS_LABELS[value]}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <p>{registration.phone}{registration.email ? ` · ${registration.email}` : ""}</p>
        {(registration.address || registration.city || registration.district) && (
          <p>
            {registration.address || "Adresse non renseignée"}
            {registration.district ? ` · ${registration.district}` : ""}
            {registration.city ? `, ${registration.city}` : ""}
          </p>
        )}
        <time>{formatDate(registration.created_at)}</time>
      </div>
      {registration.status === "pending" && (
        <div className="admin-record-actions">
          <button
            type="button"
            className="admin-approve-button"
            onClick={() => onUpdate(registration, { status: "confirmed" })}
          >
            Valider
          </button>
          <button
            type="button"
            className="admin-reject-button"
            onClick={() => onUpdate(registration, { status: "rejected" })}
          >
            Refuser
          </button>
        </div>
      )}
    </article>
  );
}

function StatusOverviewCard({ eyebrow, title, icon, metrics, maxValue }) {
  return (
    <article className="admin-analytics-card">
      <div className="admin-panel-heading">
        <div>
          <span className="admin-panel-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <span className="admin-panel-icon">{createElement(icon, { size: 17, "aria-hidden": true })}</span>
      </div>
      <div className="admin-status-bars">
        {metrics.map((metric) => (
          <div className="admin-status-row" key={metric.label}>
            <div className="admin-status-row-label">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            <div
              className="admin-status-track"
              role="img"
              aria-label={`${metric.label} : ${metric.value}`}
            >
              <span
                className={metric.className || "is-role"}
                style={{ width: `${(metric.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function DonutOverviewCard({ eyebrow, title, icon, metrics }) {
  const total = metrics.reduce((sum, metric) => sum + metric.value, 0);
  const colors = ["#2c87cc", "#23a579", "#f0a23a", "#7357c8", "#df6370", "#4b9b9b"];
  let currentPercent = 0;
  const segments = metrics.map((metric, index) => {
    const start = currentPercent;
    currentPercent += total > 0 ? (metric.value / total) * 100 : 0;
    return `${metric.color || colors[index % colors.length]} ${start}% ${currentPercent}%`;
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
                style={{ backgroundColor: metric.color || colors[index % colors.length] }}
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

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Connexion impossible.");
        return;
      }
      onLogin(data.token, data.admin);
    } catch (requestError) {
      console.error("Admin login request failed:", requestError);
      setError("Serveur inaccessible. Vérifiez la connexion à l’API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <span className="admin-kicker">ESPACE SÉCURISÉ</span>
        <h1>Administration EGC</h1>
        <p>Connectez-vous pour gérer les inscriptions et consulter les demandes de dons.</p>
        <label htmlFor="admin-email">Adresse e-mail</label>
        <input
          id="admin-email"
          autoComplete="username"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="admin-password">Mot de passe</label>
        <input
          id="admin-password"
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-primary-button" disabled={loading} type="submit">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}

export default function AdminDashboard() {
  const [session, setSession] = useState(() => readCache(ADMIN_SESSION_KEY));
  const sessionTokenRef = useRef(session?.token ?? null);
  const [section, setSection] = useState("registrations");
  const [registrations, setRegistrations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ registrations: {}, donations: {} });
  const [registrationPagination, setRegistrationPagination] = useState(null);
  const [donationPagination, setDonationPagination] = useState(null);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [churchStatusFilter, setChurchStatusFilter] = useState("all");
  const [churchRoleFilter, setChurchRoleFilter] = useState("all");
  const [trainingStatusFilter, setTrainingStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);

  const clearSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSession(null);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    setRegistrations([]);
    setDonations([]);
    setSummary({ registrations: {}, memberships: {}, servants: {}, training: {}, donations: {} });
    setRegistrationPagination(null);
    setDonationPagination(null);
    setLoading(false);
  }, []);

  const expireSession = useCallback(() => {
    clearSession();
    setError("Votre session a expiré. Veuillez vous reconnecter.");
  }, [clearSession]);

  useEffect(() => {
    if (!session) localStorage.removeItem(ADMIN_DATA_KEY);
  }, [session]);

  const loadData = useCallback(async (token, selectedSection, page, signal) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const isRegistrationSection = REGISTRATION_SECTIONS.includes(selectedSection);
      const filters = {
        statusFilter: selectedSection === "registrations" ? statusFilter : "all",
        churchStatusFilter: selectedSection === "registrations" ? churchStatusFilter : "all",
        churchRoleFilter: selectedSection === "servants" ? churchRoleFilter : "all",
        trainingStatusFilter: selectedSection === "training" ? trainingStatusFilter : "all",
      };
      if (selectedSection === "registrations" && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (["members", "servants", "training"].includes(selectedSection)) {
        params.set("status", "confirmed");
      }
      if (selectedSection === "registrations" && churchStatusFilter !== "all") {
        params.set("churchStatus", churchStatusFilter);
      }
      if (selectedSection === "registrations" && churchRoleFilter !== "all") {
        params.set("churchRole", churchRoleFilter);
      }
      if (selectedSection === "members" || selectedSection === "servants") {
        params.set("registrationKind", "membership");
      }
      if (selectedSection === "servants") {
        params.set("hasRole", "true");
        if (churchRoleFilter !== "all") params.set("churchRole", churchRoleFilter);
      }
      if (selectedSection === "training") {
        params.set("registrationKind", "formation");
        if (trainingStatusFilter !== "all") params.set("trainingStatus", trainingStatusFilter);
      }
      const path = isRegistrationSection ? "/api/admin/registrations" : "/api/admin/donations";
      const response = await fetch(`${API}${path}?${params}`, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionTokenRef.current !== token) return;
      if (response.status === 401) {
        expireSession();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Chargement impossible.");
      }
      setSummary(data.summary);
      writeCache(ADMIN_DATA_KEY, {
        section: selectedSection,
        page,
        filters,
        data,
      });
      if (isRegistrationSection) {
        setRegistrations(data.registrations);
        setRegistrationPagination(data.pagination);
      } else {
        setDonations(data.donations);
        setDonationPagination(data.pagination);
      }
    } catch (requestError) {
      if (signal?.aborted || sessionTokenRef.current !== token) return;
      console.error(`Admin ${selectedSection} load failed:`, requestError);
      const cached = readCache(ADMIN_DATA_KEY);
      if (
        cached?.section === selectedSection
        && cached.page === page
        && JSON.stringify(cached.filters) === JSON.stringify({
          statusFilter: selectedSection === "registrations" ? statusFilter : "all",
          churchStatusFilter: selectedSection === "registrations" ? churchStatusFilter : "all",
          churchRoleFilter: selectedSection === "servants" ? churchRoleFilter : "all",
          trainingStatusFilter: selectedSection === "training" ? trainingStatusFilter : "all",
        })
        && cached.data
      ) {
        setSummary(cached.data.summary);
        if (REGISTRATION_SECTIONS.includes(selectedSection)) {
          setRegistrations(cached.data.registrations);
          setRegistrationPagination(cached.data.pagination);
        } else {
          setDonations(cached.data.donations);
          setDonationPagination(cached.data.pagination);
        }
        setNotice("Mode hors connexion : dernières données synchronisées affichées.");
      } else {
        setError("Connexion indisponible et aucune donnée synchronisée.");
      }
    } finally {
      if (!signal?.aborted && sessionTokenRef.current === token) setLoading(false);
    }
  }, [statusFilter, churchStatusFilter, churchRoleFilter, trainingStatusFilter, expireSession]);

  useEffect(() => {
    if (!session || (!REGISTRATION_SECTIONS.includes(section) && section !== "donations")) return;
    const page = REGISTRATION_SECTIONS.includes(section) ? registrationPage : donationPage;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        loadData(session.token, section, page, controller.signal);
      }
    });
    return () => controller.abort();
  }, [session, section, registrationPage, donationPage, loadData]);

  const handleLogin = (token, admin) => {
    setLoading(true);
    setError("");
    setSection("registrations");
    setRegistrationPage(1);
    sessionTokenRef.current = token;
    const nextSession = { token, admin };
    writeCache(ADMIN_SESSION_KEY, nextSession);
    setSession(nextSession);
  };

  const exportRegistrations = async (format, directory = "registrations") => {
    setExporting(true);
    setError("");
    let printWindow = null;
    const isDirectory = directory === "members" || directory === "servants";
    const exportName = directory === "servants"
      ? "serviteurs"
      : directory === "members"
        ? "membres"
        : "inscriptions";
    try {
      if (format === "pdf") {
        printWindow = window.open("", "_blank");
        if (!printWindow) {
          throw new Error("Autorisez les fenêtres contextuelles pour préparer le PDF.");
        }
      }
      const records = await fetchAllRegistrations(
        session.token,
        statusFilter,
        churchStatusFilter,
        isDirectory && directory === "members" ? "all" : churchRoleFilter,
        directory,
      );
      if (format === "pdf") {
        if (isDirectory) {
          printDirectoryRecords(records, directory, printWindow);
        } else {
          printRegistrations(records, printWindow);
        }
        return;
      }

      const rows = isDirectory
        ? getDirectoryExportRows(records)
        : records.map((registration) => ({
          Nom: `${registration.first_name} ${registration.last_name}`,
          Type: registration.registration_kind === "formation" ? "Formation" : "Inscription",
          Activité: registration.activity_name,
          Téléphone: registration.phone,
          "E-mail": registration.email || "",
          Adresse: registration.address || "",
          Ville: registration.city || "",
          Quartier: registration.district || "",
          "Statut de traitement": LABELS[registration.status] ?? registration.status,
          "Statut dans l’église": registration.church_status || "",
          Fonction: registration.church_role || "",
          "Date d’inscription": formatDate(registration.created_at),
        }));
      if (format === "word") {
        downloadWordDirectory(records, directory);
        return;
      }
      const safeRows = rows.map((row) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, safeSpreadsheetValue(value)]),
      ));
      const worksheet = isDirectory
        ? XLSX.utils.json_to_sheet(safeRows, { header: DIRECTORY_EXPORT_COLUMNS })
        : XLSX.utils.json_to_sheet(safeRows);
      worksheet["!cols"] = isDirectory ? [
        { wch: 25 }, { wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 34 },
        { wch: 24 }, { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 20 },
      ] : [
        { wch: 25 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 28 },
        { wch: 34 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 24 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, isDirectory ? exportName : "Inscriptions");
      XLSX.writeFile(workbook, `${exportName}-egc-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (requestError) {
      console.error(`${exportName} export failed:`, requestError);
      printWindow?.close();
      if (requestError.status === 401) {
        expireSession();
      } else {
        setError(requestError.message || `Impossible d’exporter les ${exportName}.`);
      }
    } finally {
      setExporting(false);
    }
  };

  const updateRegistrationProfile = async (registration, changes) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/api/admin/registrations/${registration.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });
      if (response.status === 401) {
        expireSession();
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Mise à jour impossible.");
      setNotice(`Fiche de ${registration.first_name} mise à jour.`);
      setLoading(true);
      await loadData(session.token, section, registrationPage);
    } catch (requestError) {
      console.error("Admin registration profile update failed:", requestError);
      setError(requestError.message || "Impossible de mettre à jour l’inscription.");
    }
  };

  const updateRegistration = (registration, status) =>
    updateRegistrationProfile(registration, { status });
  const selectSection = (nextSection) => {
    setError("");
    setNotice("");
    if (nextSection === section) {
      if (REGISTRATION_SECTIONS.includes(nextSection)) {
        setLoading(true);
        loadData(session.token, nextSection, registrationPage);
      } else if (nextSection === "donations") {
        setLoading(true);
        loadData(session.token, nextSection, donationPage);
      }
      return;
    }

    setSection(nextSection);
    if (REGISTRATION_SECTIONS.includes(nextSection)) {
      setLoading(true);
      setRegistrationPage(1);
    } else if (nextSection === "donations") {
      setLoading(true);
      setDonationPage(1);
    } else {
      setLoading(false);
    }
  };

  if (!session) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const registrationCounts = summary.registrations ?? {};
  const donationCounts = summary.donations ?? {};
  const pendingCount = registrationCounts.pending ?? 0;
  const pendingDonationCount = donationCounts.pending_provider ?? 0;
  const totalRegistrationCount = Object.values(registrationCounts)
    .reduce((total, count) => total + Number(count || 0), 0);
  const confirmedCount = registrationCounts.confirmed ?? 0;
  const rejectedCount = registrationCounts.rejected ?? 0;
  const membershipCounts = summary.memberships ?? {};
  const memberCount = Object.values(membershipCounts)
    .reduce((total, count) => total + Number(count || 0), 0);
  const servantSummary = summary.servants ?? {};
  const servantCount = servantSummary.total ?? 0;
  const servantRoleCounts = servantSummary.roles ?? {};
  const servantRoles = [...new Set([...CHURCH_ROLES, ...Object.keys(servantRoleCounts)])];
  const trainingCounts = summary.training ?? {};
  const membershipStatusMetrics = [
    { label: "À examiner", value: membershipCounts.pending ?? 0, className: "is-pending" },
    { label: "Adhésions validées", value: membershipCounts.confirmed ?? 0, className: "is-confirmed" },
    { label: "Refusées", value: membershipCounts.rejected ?? 0, className: "is-rejected" },
  ];
  const trainingStatusMetrics = [
    { label: TRAINING_STATUS_LABELS.in_progress, value: trainingCounts.in_progress ?? 0, className: "is-pending" },
    { label: TRAINING_STATUS_LABELS.passed, value: trainingCounts.passed ?? 0, className: "is-confirmed" },
    { label: TRAINING_STATUS_LABELS.failed, value: trainingCounts.failed ?? 0, className: "is-rejected" },
  ];
  const roleMetrics = servantRoles
    .map((role) => ({ label: role, value: servantRoleCounts[role] ?? 0 }))
    .filter((metric) => metric.value > 0);
  const maxTrainingCount = Math.max(...trainingStatusMetrics.map((metric) => metric.value), 1);
  const maxRegistrationCount = Math.max(pendingCount, confirmedCount, rejectedCount, 1);
  const registrationStatusMetrics = [
    { label: "À examiner", value: pendingCount, className: "is-pending" },
    { label: "Validées", value: confirmedCount, className: "is-confirmed" },
    { label: "Refusées", value: rejectedCount, className: "is-rejected" },
  ];
  const sectionCopy = {
    registrations: ["Inscriptions", "Consultez et traitez les demandes d’adhésion et de formation."],
    members: ["Membres", "Retrouvez les adhésions et mettez à jour les informations des membres."],
    servants: ["Serviteurs", "Consultez les serviteurs et filtrez-les selon leur fonction."],
    training: ["Formations", "Suivez les personnes en formation, leurs réussites et leurs résultats."],
    donations: ["Dons", "Consultez les demandes de dons en attente d’activation."],
    announcements: ["Annonces", "Publiez et gérez les événements de la communauté."],
  }[section];
  const renderDirectorySection = (directory) => {
    const headings = {
      members: ["Membres actifs", "Liste des adhésions validées."],
      servants: ["Serviteurs", "Membres actifs ayant une fonction dans l’église."],
      training: ["Personnes en formation", "Le résultat est indépendant de la validation de l’inscription."],
    };
    const [heading, description] = headings[directory];

    return (
      <section className="admin-content">
        <div className="admin-list-heading">
          <div>
            <h2>{heading}</h2>
            <p>{description}</p>
          </div>
          {directory === "servants" && (
            <label className="admin-filter">
              <span>Fonction</span>
              <select
                value={churchRoleFilter}
                onChange={(event) => {
                  setLoading(true);
                  setChurchRoleFilter(event.target.value);
                  setRegistrationPage(1);
                }}
              >
                <option value="all">Toutes</option>
                {servantRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
          )}
          {directory === "training" && (
            <label className="admin-filter">
              <span>Résultat</span>
              <select
                value={trainingStatusFilter}
                onChange={(event) => {
                  setLoading(true);
                  setTrainingStatusFilter(event.target.value);
                  setRegistrationPage(1);
                }}
              >
                <option value="all">Tous les résultats</option>
                {TRAINING_STATUSES.map((status) => (
                  <option key={status} value={status}>{TRAINING_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {(directory === "members" || directory === "servants") && (
          <div className="admin-export-actions" aria-label={`Exporter les ${directory === "servants" ? "serviteurs" : "membres"}`}>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => exportRegistrations("xlsx", directory)}
              disabled={exporting}
            >
              {exporting ? "Préparation…" : "Exporter Excel"}
            </button>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => exportRegistrations("word", directory)}
              disabled={exporting}
            >
              {exporting ? "Préparation…" : "Exporter Word"}
            </button>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => exportRegistrations("pdf", directory)}
              disabled={exporting}
            >
              {exporting ? "Préparation…" : "Exporter PDF"}
            </button>
          </div>
        )}
        {loading && registrations.length === 0 ? (
          <p className="admin-empty">Chargement…</p>
        ) : registrations.length === 0 ? (
          <p className="admin-empty">
            {directory === "servants"
              ? "Aucun serviteur pour cette fonction."
              : directory === "training"
                ? "Aucune personne en formation pour ce résultat."
                : "Aucun membre actif pour le moment."}
          </p>
        ) : (
          <div className="admin-record-list">
            {registrations.map((registration) => (
              <RegistrationRecord
                key={registration.id}
                registration={registration}
                onUpdate={updateRegistrationProfile}
                churchRoles={servantRoles}
                onTrainingStatusChange={(record, trainingStatus) => updateRegistrationProfile(
                  record,
                  { trainingStatus },
                )}
                showTrainingStatus={directory === "training"}
              />
            ))}
          </div>
        )}
        <PaginationControls
          pagination={registrationPagination}
          onPageChange={(page) => {
            setLoading(true);
            setRegistrationPage(page);
          }}
        />
      </section>
    );
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">
            <img src={adminLogo} alt="Logo de l’Église Glorieuse du Christ" />
          </span>
          <span className="admin-brand-copy">
            <strong>EGC</strong>
            <span>ESPACE ADMIN</span>
          </span>
        </div>

        <span className="admin-nav-label">GESTION DE L’ÉGLISE</span>
        <nav className="admin-tabs" aria-label="Sections d’administration">
          <button
            type="button"
            className={section === "registrations" ? "is-active" : ""}
            onClick={() => selectSection("registrations")}
          >
            <ClipboardList size={17} aria-hidden="true" />
            <span>Inscriptions</span>
            {pendingCount > 0 && <span className="admin-nav-count">{pendingCount}</span>}
          </button>
          <button
            type="button"
            className={section === "members" ? "is-active" : ""}
            onClick={() => selectSection("members")}
          >
            <Users size={17} aria-hidden="true" />
            <span>Membres</span>
          </button>
          <button
            type="button"
            className={section === "servants" ? "is-active" : ""}
            onClick={() => selectSection("servants")}
          >
            <UserRound size={17} aria-hidden="true" />
            <span>Serviteurs</span>
          </button>
          <button
            type="button"
            className={section === "training" ? "is-active" : ""}
            onClick={() => selectSection("training")}
          >
            <GraduationCap size={17} aria-hidden="true" />
            <span>Formations</span>
          </button>
          <button
            type="button"
            className={section === "donations" ? "is-active" : ""}
            onClick={() => selectSection("donations")}
          >
            <Wallet size={17} aria-hidden="true" />
            <span>Dons</span>
          </button>
          <button
            type="button"
            className={section === "announcements" ? "is-active" : ""}
            onClick={() => selectSection("announcements")}
          >
            <Megaphone size={17} aria-hidden="true" />
            <span>Annonces</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>
            <strong>Espace sécurisé</strong>
            <small>Administration EGC</small>
          </span>
        </div>
      </aside>

      <main className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>EGC</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>Administration</strong>
          </div>
          <div className="admin-profile">
            <span className="admin-profile-avatar" aria-hidden="true">
              {session.admin.email?.charAt(0).toUpperCase() || "A"}
            </span>
            <span className="admin-profile-email">{session.admin.email}</span>
            <button
              type="button"
              className="admin-logout-button"
              onClick={() => {
                clearSession();
                setError("");
                setNotice("");
              }}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="admin-page">
          <header className="admin-header">
            <div>
              <span className="admin-kicker">VOTRE ESPACE DE PILOTAGE</span>
              <h1>{sectionCopy[0]}</h1>
              <p>{sectionCopy[1]}</p>
            </div>
            {section !== "announcements" && (
              <button
                type="button"
                className="admin-refresh"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  loadData(
                    session.token,
                    section,
                    REGISTRATION_SECTIONS.includes(section) ? registrationPage : donationPage,
                  );
                }}
                disabled={loading}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {loading ? "Actualisation…" : "Actualiser"}
              </button>
            )}
          </header>

          {section === "registrations" && (
            <>
              <section className="admin-summary" aria-label="Résumé des inscriptions">
                <article>
                  <span className="admin-summary-icon"><Users size={17} aria-hidden="true" /></span>
                  <span>Total des inscriptions</span>
                  <strong>{totalRegistrationCount}</strong>
                </article>
                <article>
                  <span className="admin-summary-icon is-pending"><Clock3 size={17} aria-hidden="true" /></span>
                  <span>À examiner</span>
                  <strong>{pendingCount}</strong>
                </article>
                <article>
                  <span className="admin-summary-icon is-confirmed"><CheckCircle2 size={17} aria-hidden="true" /></span>
                  <span>Inscriptions validées</span>
                  <strong>{confirmedCount}</strong>
                </article>
              </section>

              <section className="admin-overview-grid" aria-label="État des inscriptions">
                <StatusOverviewCard
                  eyebrow="VUE D’ENSEMBLE"
                  title="État des inscriptions"
                  icon={FileText}
                  metrics={registrationStatusMetrics}
                  maxValue={maxRegistrationCount}
                />
              </section>
            </>
          )}

          {section === "members" && (
            <>
              <section className="admin-summary" aria-label="Résumé des membres">
                <article>
                  <span className="admin-summary-icon"><Users size={17} aria-hidden="true" /></span>
                  <span>Total des adhésions</span>
                  <strong>{memberCount}</strong>
                </article>
                <article>
                  <span className="admin-summary-icon is-confirmed"><CheckCircle2 size={17} aria-hidden="true" /></span>
                  <span>Membres validés</span>
                  <strong>{membershipCounts.confirmed ?? 0}</strong>
                </article>
                <article>
                  <span className="admin-summary-icon is-pending"><Clock3 size={17} aria-hidden="true" /></span>
                  <span>En attente</span>
                  <strong>{membershipCounts.pending ?? 0}</strong>
                </article>
              </section>
              <section className="admin-overview-grid admin-overview-single" aria-label="État des adhésions">
                <DonutOverviewCard
                  eyebrow="MEMBRES"
                  title="État des adhésions"
                  icon={Users}
                  metrics={membershipStatusMetrics}
                />
              </section>
            </>
          )}

          {section === "servants" && (
            <>
              <section className="admin-summary" aria-label="Résumé des serviteurs">
                <article>
                  <span className="admin-summary-icon"><UserRound size={17} aria-hidden="true" /></span>
                  <span>Serviteurs avec une fonction</span>
                  <strong>{servantCount}</strong>
                </article>
                <article>
                  <span className="admin-summary-icon is-confirmed"><ShieldCheck size={17} aria-hidden="true" /></span>
                  <span>Fonctions représentées</span>
                  <strong>{roleMetrics.length}</strong>
                </article>
              </section>
              {roleMetrics.length > 0 && (
                <section className="admin-overview-grid admin-overview-single" aria-label="Répartition par fonction">
                  <DonutOverviewCard
                    eyebrow="ÉQUIPES DE SERVICE"
                    title="Serviteurs par fonction"
                    icon={UserRound}
                    metrics={roleMetrics}
                  />
                </section>
              )}
            </>
          )}

          {section === "training" && (
            <>
              <section className="admin-summary" aria-label="Résumé des formations">
                {trainingStatusMetrics.map((metric) => (
                  <article key={metric.label}>
                    <span className={`admin-summary-icon ${metric.className}`}>
                      {metric.className === "is-confirmed"
                        ? <CheckCircle2 size={17} aria-hidden="true" />
                        : metric.className === "is-rejected"
                          ? <ShieldCheck size={17} aria-hidden="true" />
                          : <GraduationCap size={17} aria-hidden="true" />}
                    </span>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                ))}
              </section>
              <section className="admin-overview-grid" aria-label="Résultats des formations">
                <StatusOverviewCard
                  eyebrow="SUIVI PÉDAGOGIQUE"
                  title="État des formations"
                  icon={GraduationCap}
                  metrics={trainingStatusMetrics}
                  maxValue={maxTrainingCount}
                />
              </section>
            </>
          )}

          {section === "donations" && (
            <>
              <section className="admin-summary" aria-label="Résumé des dons">
                <article>
                  <span className="admin-summary-icon is-donations"><Wallet size={17} aria-hidden="true" /></span>
                  <span>Dons en attente d’activation</span>
                  <strong>{pendingDonationCount}</strong>
                </article>
              </section>

              <section className="admin-overview-grid admin-overview-single" aria-label="État des dons">
                <article className="admin-analytics-card admin-donation-card">
                  <div className="admin-panel-heading">
                    <div>
                      <span className="admin-panel-eyebrow">SOUTIEN</span>
                      <h2>Traitement des dons</h2>
                    </div>
                    <span className="admin-panel-icon"><Wallet size={17} aria-hidden="true" /></span>
                  </div>
                  <p>Les paiements mobiles ne sont pas encore connectés.</p>
                  <span className="admin-donation-note">Aucune demande affichée ne déclenche de paiement.</span>
                </article>
              </section>
            </>
          )}

          {error && <p className="admin-error" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}

          {section === "registrations" ? (
        <section className="admin-content">
          <div className="admin-list-heading">
            <div>
              <h2>Demandes d’inscription</h2>
              <p>Une inscription déjà validée bloque les doublons pour la même formation.</p>
            </div>
            <label className="admin-filter">
              <span>Statut</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setStatusFilter(event.target.value);
                  setRegistrationPage(1);
                }}
              >
                <option value="all">Tous</option>
                <option value="pending">À examiner</option>
                <option value="confirmed">Validées</option>
                <option value="rejected">Refusées</option>
              </select>
            </label>
            <label className="admin-filter">
              <span>Statut dans l’église</span>
              <select
                value={churchStatusFilter}
                onChange={(event) => {
                  setLoading(true);
                  setChurchStatusFilter(event.target.value);
                  setRegistrationPage(1);
                }}
              >
                <option value="all">Tous</option>
                {CHURCH_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="admin-filter">
              <span>Fonction</span>
              <select
                value={churchRoleFilter}
                onChange={(event) => {
                  setLoading(true);
                  setChurchRoleFilter(event.target.value);
                  setRegistrationPage(1);
                }}
              >
                <option value="all">Toutes</option>
                {CHURCH_ROLES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-export-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => exportRegistrations("xlsx")}
              disabled={exporting}
            >
              {exporting ? "Préparation…" : "Exporter Excel"}
            </button>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => exportRegistrations("pdf")}
              disabled={exporting}
            >
              {exporting ? "Préparation…" : "Exporter PDF"}
            </button>
          </div>
          {registrations.length === 0 ? (
            <p className="admin-empty">Aucune inscription pour ce filtre.</p>
          ) : (
            <div className="admin-record-list">
              {registrations.map((registration) => (
                <article className="admin-record" key={registration.id}>
                  <div className="admin-record-main">
                    <div className="admin-record-title">
                      <h3>{registration.first_name} {registration.last_name}</h3>
                      <StatusBadge status={registration.status} />
                    </div>
                    <p className="admin-record-activity">
                      {registration.registration_kind === "formation" ? "Formation" : "Inscription"}
                      {" · "}{registration.activity_name}
                    </p>
                    <p>
                      Statut dans l’église : <strong>{registration.church_status || "Non renseigné"}</strong>
                      {" · "}Fonction : <strong>{registration.church_role || "Non renseignée"}</strong>
                    </p>
                    <div className="admin-record-fields">
                      <label>
                        <span>Statut dans l’église</span>
                        <select
                          value={registration.church_status || ""}
                          onChange={(event) => updateRegistrationProfile(
                            registration,
                            { churchStatus: event.target.value },
                          )}
                        >
                          <option value="">Non renseigné</option>
                          {CHURCH_STATUSES.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Fonction</span>
                        <select
                          value={registration.church_role || ""}
                          onChange={(event) => updateRegistrationProfile(
                            registration,
                            { churchRole: event.target.value },
                          )}
                        >
                          <option value="">Non renseignée</option>
                          {CHURCH_ROLES.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p>{registration.phone}{registration.email ? ` · ${registration.email}` : ""}</p>
                    <p>
                      {registration.address || "Adresse non renseignée"}
                      {registration.district ? ` · ${registration.district}` : ""}
                      {registration.city ? `, ${registration.city}` : ""}
                    </p>
                    <time>{formatDate(registration.created_at)}</time>
                  </div>
                  {registration.status === "pending" && (
                    <div className="admin-record-actions">
                      <button
                        type="button"
                        className="admin-approve-button"
                        onClick={() => updateRegistration(registration, "confirmed")}
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="admin-reject-button"
                        onClick={() => updateRegistration(registration, "rejected")}
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <PaginationControls
            pagination={registrationPagination}
            onPageChange={(page) => {
              setLoading(true);
              setRegistrationPage(page);
            }}
          />
        </section>
      ) : section === "members" ? (
        renderDirectorySection("members")
      ) : section === "servants" ? (
        renderDirectorySection("servants")
      ) : section === "training" ? (
        renderDirectorySection("training")
      ) : section === "donations" ? (
        <section className="admin-content">
          <div className="admin-list-heading">
            <div>
              <h2>Demandes de dons</h2>
              <p>MTN MoMo n’est pas encore connecté : aucune de ces demandes n’a déclenché de paiement.</p>
            </div>
          </div>
          {donations.length === 0 ? (
            <p className="admin-empty">Aucune demande de don enregistrée.</p>
          ) : (
            <div className="admin-record-list">
              {donations.map((donation) => (
                <article className="admin-record" key={donation.id}>
                  <div className="admin-record-main">
                    <div className="admin-record-title">
                      <h3>{donation.full_name}</h3>
                      <StatusBadge status={donation.status} />
                    </div>
                    <p className="admin-record-activity">
                      {Number(donation.amount_xaf).toLocaleString("fr-FR")} FCFA · {donation.operator}
                    </p>
                    <p>{donation.phone}</p>
                    <time>{formatDate(donation.created_at)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
          <PaginationControls
            pagination={donationPagination}
            onPageChange={(page) => {
              setLoading(true);
              setDonationPage(page);
            }}
          />
        </section>
      ) : (
        <AdminAnnouncements token={session.token} onSessionExpired={expireSession} />
      )}
        </div>
      </main>
    </div>
  );
}
