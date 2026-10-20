import { useCallback, useEffect, useState } from "react";

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

function formatDate(value) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function StatusBadge({ status }) {
  return <span className={`admin-status admin-status-${status}`}>{LABELS[status] ?? status}</span>;
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

  const loadData = useCallback(async (token, selectedSection, page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const isRegistrations = selectedSection === "registrations";
      if (isRegistrations && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const path = isRegistrations ? "/api/admin/registrations" : "/api/admin/donations";
      const response = await fetch(`${API}${path}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        setSession(null);
        setError("Votre session a expiré. Veuillez vous reconnecter.");
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
      console.error(`Admin ${selectedSection} load failed:`, requestError);
      setError(requestError.message || "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!session) return;
    const page = section === "registrations" ? registrationPage : donationPage;
    loadData(session.token, section, page);
  }, [session, section, registrationPage, donationPage, loadData]);

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
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Mise à jour impossible.");
      setNotice(`Inscription de ${registration.first_name} mise à jour.`);
      await loadData(session.token, section, registrationPage);
    } catch (requestError) {
      console.error("Admin registration update failed:", requestError);
      setError(requestError.message || "Impossible de mettre à jour l’inscription.");
    }
  };

  if (!session) {
    return <LoginForm onLogin={(token, admin) => setSession({ token, admin })} />;
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
        <button type="button" className="admin-secondary-button" onClick={() => setSession(null)}>
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
            setDonationPage(1);
            setSection("donations");
          }}
        >
          Dons
        </button>
        <button
          type="button"
          className="admin-refresh"
          onClick={() => loadData(
            session.token,
            section,
            section === "registrations" ? registrationPage : donationPage,
          )}
          disabled={loading}
        >
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
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
            onPageChange={setRegistrationPage}
          />
        </section>
      ) : (
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
            onPageChange={setDonationPage}
          />
        </section>
      )}
    </main>
  );
}
