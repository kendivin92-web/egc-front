import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AdminAnnouncements from "./AdminAnnouncements.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

async function fetchAllRegistrations(token, statusFilter) {
  const registrations = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(EXPORT_PAGE_SIZE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
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
  const [session, setSession] = useState(null);
  const [section, setSection] = useState("registrations");
  const [registrations, setRegistrations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ registrations: {}, donations: {} });
  const [registrationPagination, setRegistrationPagination] = useState(null);
  const [donationPagination, setDonationPagination] = useState(null);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);

  const clearSession = useCallback(() => {
    setSession(null);
    setRegistrations([]);
    setDonations([]);
    setSummary({ registrations: {}, donations: {} });
    setRegistrationPagination(null);
    setDonationPagination(null);
    setLoading(false);
  }, []);

  const expireSession = useCallback(() => {
    clearSession();
    setError("Votre session a expiré. Veuillez vous reconnecter.");
  }, [clearSession]);

  const loadData = useCallback(async (token, selectedSection, page, signal) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const isRegistrations = selectedSection === "registrations";
      if (isRegistrations && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const path = isRegistrations ? "/api/admin/registrations" : "/api/admin/donations";
      const response = await fetch(`${API}${path}?${params}`, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        expireSession();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Chargement impossible.");
      }
      setSummary(data.summary);
      if (selectedSection === "registrations") {
        setRegistrations(data.registrations);
        setRegistrationPagination(data.pagination);
      } else {
        setDonations(data.donations);
        setDonationPagination(data.pagination);
      }
    } catch (requestError) {
      if (signal?.aborted) return;
      console.error(`Admin ${selectedSection} load failed:`, requestError);
      setError(requestError.message || "Impossible de charger les données.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter, expireSession]);

  useEffect(() => {
    if (!session || !["registrations", "donations"].includes(section)) return;
    const page = section === "registrations" ? registrationPage : donationPage;
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
    setSession({ token, admin });
  };

  const exportRegistrations = async (format) => {
    setExporting(true);
    setError("");
    let printWindow = null;
    try {
      if (format === "pdf") {
        printWindow = window.open("", "_blank");
        if (!printWindow) {
          throw new Error("Autorisez les fenêtres contextuelles pour préparer le PDF.");
        }
      }
      const records = await fetchAllRegistrations(session.token, statusFilter);
      if (format === "pdf") {
        printRegistrations(records, printWindow);
        return;
      }

      const rows = records.map((registration) => ({
        Nom: `${registration.first_name} ${registration.last_name}`,
        Type: registration.registration_kind === "formation" ? "Formation" : "Inscription",
        Activité: registration.activity_name,
        Téléphone: registration.phone,
        "E-mail": registration.email || "",
        Adresse: registration.address || "",
        Ville: registration.city || "",
        Quartier: registration.district || "",
        Statut: LABELS[registration.status] ?? registration.status,
        "Date d’inscription": formatDate(registration.created_at),
      }));
      const safeRows = rows.map((row) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, safeSpreadsheetValue(value)]),
      ));
      const worksheet = XLSX.utils.json_to_sheet(safeRows);
      worksheet["!cols"] = [
        { wch: 25 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 28 },
        { wch: 34 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 24 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inscriptions");
      XLSX.writeFile(workbook, `inscriptions-egc-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (requestError) {
      console.error("Registration export failed:", requestError);
      printWindow?.close();
      if (requestError.status === 401) {
        expireSession();
      } else {
        setError(requestError.message || "Impossible d’exporter les inscriptions.");
      }
    } finally {
      setExporting(false);
    }
  };

  const updateRegistration = async (registration, status) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/api/admin/registrations/${registration.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        expireSession();
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Mise à jour impossible.");
      setNotice(`Inscription de ${registration.first_name} mise à jour.`);
      setLoading(true);
      await loadData(session.token, section, registrationPage);
    } catch (requestError) {
      console.error("Admin registration update failed:", requestError);
      setError(requestError.message || "Impossible de mettre à jour l’inscription.");
    }
  };

  if (!session) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const pendingCount = summary.registrations.pending ?? 0;
  const pendingDonationCount = summary.donations.pending_provider ?? 0;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">ÉGLISE GLORIEUSE DU CHRIST</span>
          <h1>Administration</h1>
          <p>Connecté en tant que {session.admin.email}</p>
        </div>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={() => {
            clearSession();
            setError("");
            setNotice("");
          }}
        >
          Se déconnecter
        </button>
      </header>

      <section className="admin-summary" aria-label="Résumé">
        <article>
          <span>Inscriptions à examiner</span>
          <strong>{pendingCount}</strong>
        </article>
        <article>
          <span>Dons en attente d’activation</span>
          <strong>{pendingDonationCount}</strong>
        </article>
      </section>

      <nav className="admin-tabs" aria-label="Sections d’administration">
        <button
          type="button"
          className={section === "registrations" ? "is-active" : ""}
          onClick={() => {
            setLoading(true);
            setError("");
            if (section === "registrations" && registrationPage === 1) {
              loadData(session.token, "registrations", 1);
            }
            setRegistrationPage(1);
            setSection("registrations");
          }}
        >
          Inscriptions
        </button>
        <button
          type="button"
          className={section === "donations" ? "is-active" : ""}
          onClick={() => {
            setLoading(true);
            setError("");
            if (section === "donations" && donationPage === 1) {
              loadData(session.token, "donations", 1);
            }
            setDonationPage(1);
            setSection("donations");
          }}
        >
          Dons
        </button>
        <button
          type="button"
          className={section === "announcements" ? "is-active" : ""}
          onClick={() => {
            setLoading(false);
            setError("");
            setSection("announcements");
          }}
        >
          Annonces
        </button>
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
                section === "registrations" ? registrationPage : donationPage,
              );
            }}
            disabled={loading}
          >
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        )}
      </nav>

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
    </main>
  );
}
