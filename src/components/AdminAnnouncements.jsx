import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import AdminDonutCard from "./AdminDonutCard.jsx";
import { API_URL } from "../services/apiConfig.js";

const API = API_URL;
const ADMIN_ANNOUNCEMENTS_CACHE_KEY = "egc-admin-announcements";
const EMPTY_FORM = {
  title: "",
  type: "Culte",
  date: "",
  lieu: "",
  freq: "",
  contenu: "",
  image: "",
  showInCarousel: false,
  published: true,
};

const FREQUENCY_OPTIONS = [
  "Chaque dimanche",
  "1er dimanche du mois",
  "2e dimanche du mois",
  "3e dimanche du mois",
  "4e dimanche du mois",
];

async function fetchAnnouncements(token) {
  const response = await fetch(`${API}/api/admin/annonces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Impossible de charger les annonces.");
    error.status = response.status;
    throw error;
  }

  if (!Array.isArray(data)) throw new Error("Réponse d’annonces invalide.");
  return data;
}

function readCachedAnnouncements() {
  try {
    const cached = JSON.parse(localStorage.getItem(ADMIN_ANNOUNCEMENTS_CACHE_KEY) || "[]");
    return Array.isArray(cached) ? cached : [];
  } catch (error) {
    console.error("Unable to read offline announcements cache:", error);
    return [];
  }
}

export default function AdminAnnouncements({ token, onSessionExpired }) {
  const [announcements, setAnnouncements] = useState(readCachedAnnouncements);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const publishedCount = announcements.filter((announcement) => announcement.published).length;
  const carouselCount = announcements.filter((announcement) => announcement.showInCarousel).length;
  const categoryMetrics = [...new Set(announcements.map((announcement) => announcement.type))]
    .map((type) => ({
      label: type,
      value: announcements.filter((announcement) => announcement.type === type).length,
    }))
    .sort((left, right) => right.value - left.value);
  const maxCategoryCount = Math.max(...categoryMetrics.map((metric) => metric.value), 1);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnnouncements(token);
      setAnnouncements(data);
      localStorage.setItem(ADMIN_ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(data));
    } catch (requestError) {
      console.error("Admin announcements load failed:", requestError);
      if (requestError.status === 401) onSessionExpired();
      setError(requestError.message || "Impossible de charger les annonces.");
    } finally {
      setLoading(false);
    }
  }, [token, onSessionExpired]);

  useEffect(() => {
    let active = true;
    fetchAnnouncements(token)
      .then((data) => {
        if (active) setAnnouncements(data);
        localStorage.setItem(ADMIN_ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(data));
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Admin announcements load failed:", requestError);
        if (requestError.status === 401) onSessionExpired();
        if (readCachedAnnouncements().length > 0) {
          setNotice("Mode hors connexion : dernières annonces synchronisées affichées.");
        } else {
          setError("Connexion indisponible et aucune annonce synchronisée.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, onSessionExpired]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setEditingId(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      let image = form.image;
      if (imageFile) {
        const upload = await fetch(`${API}/api/admin/uploads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": imageFile.type,
          },
          body: imageFile,
        });
        const uploadData = await upload.json();
        if (upload.status === 401) {
          onSessionExpired();
          return;
        }
        if (!upload.ok) throw new Error(uploadData.message || "Import de l’image impossible.");
        image = uploadData.image;
      }

      const response = await fetch(
        `${API}/api/admin/annonces${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...form, image }),
        },
      );
      const data = response.status === 204 ? null : await response.json();
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (!response.ok) throw new Error(data.message || "Enregistrement impossible.");
      setNotice(editingId ? "Annonce mise à jour." : "Annonce publiée.");
      resetForm();
      await loadAnnouncements();
    } catch (requestError) {
      console.error("Admin announcement save failed:", requestError);
      setError(requestError.message || "Impossible d’enregistrer l’annonce.");
    } finally {
      setSaving(false);
    }
  };

  const editAnnouncement = (announcement) => {
    setEditingId(announcement.id);
    setImageFile(null);
    setForm({
      title: announcement.title,
      type: announcement.type,
      date: announcement.date,
      lieu: announcement.lieu,
      freq: announcement.freq,
      contenu: announcement.contenu,
      image: announcement.image,
      showInCarousel: announcement.showInCarousel,
      published: announcement.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Supprimer l’annonce « ${announcement.title} » ?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/api/admin/annonces/${announcement.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Suppression impossible.");
      }
      setNotice("Annonce supprimée.");
      if (editingId === announcement.id) resetForm();
      await loadAnnouncements();
    } catch (requestError) {
      console.error("Admin announcement delete failed:", requestError);
      setError(requestError.message || "Impossible de supprimer l’annonce.");
    }
  };

  const updateForm = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <section className="admin-content">
      <div className="admin-list-heading">
        <div>
          <h2>Gérer les événements, séminaires et carrousel</h2>
          <p>Publiez vos activités et choisissez les images à afficher sur le carrousel d’accueil.</p>
        </div>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={loadAnnouncements}
          disabled={loading}
        >
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <section className="admin-summary" aria-label="Résumé des annonces">
        <article>
          <span className="admin-summary-icon"><Megaphone size={17} aria-hidden="true" /></span>
          <span>Total des annonces</span>
          <strong>{announcements.length}</strong>
        </article>
        <article>
          <span className="admin-summary-icon is-confirmed"><Megaphone size={17} aria-hidden="true" /></span>
          <span>Publiées</span>
          <strong>{publishedCount}</strong>
        </article>
        <article>
          <span className="admin-summary-icon is-pending"><Megaphone size={17} aria-hidden="true" /></span>
          <span>Brouillons</span>
          <strong>{announcements.length - publishedCount}</strong>
        </article>
        <article>
          <span className="admin-summary-icon is-donations"><Megaphone size={17} aria-hidden="true" /></span>
          <span>Dans le carrousel</span>
          <strong>{carouselCount}</strong>
        </article>
      </section>

      <section className="admin-overview-grid" aria-label="Statistiques des annonces">
        <article className="admin-analytics-card">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-eyebrow">CONTENU</span>
              <h2>Répartition par catégorie</h2>
            </div>
            <span className="admin-panel-icon"><Megaphone size={17} aria-hidden="true" /></span>
          </div>
          {categoryMetrics.length > 0 ? (
            <div className="admin-status-bars">
              {categoryMetrics.map((metric) => (
                <div className="admin-status-row" key={metric.label}>
                  <div className="admin-status-row-label">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className="admin-status-track" role="img" aria-label={`${metric.label} : ${metric.value}`}>
                    <span className="is-role" style={{ width: `${(metric.value / maxCategoryCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty">Aucune catégorie à afficher.</p>
          )}
        </article>
        <AdminDonutCard
          eyebrow="PUBLICATION"
          title="Annonces publiées"
          value={publishedCount}
          total={announcements.length}
          centerLabel="publiées"
          metrics={[
            { label: "Publiées", value: publishedCount, className: "is-confirmed" },
            { label: "Brouillons", value: announcements.length - publishedCount, className: "is-pending" },
            { label: "Dans le carrousel", value: carouselCount, className: "is-role" },
          ]}
        />
      </section>

      <form className="admin-announcement-form" onSubmit={submit}>
        <h3>{editingId ? "Modifier l’annonce" : "Nouvelle annonce"}</h3>
        <div className="admin-announcement-fields">
          <label>
            Titre
            <input name="title" value={form.title} onChange={updateForm} maxLength={120} required />
          </label>
          <label>
            Catégorie
            <select name="type" value={form.type} onChange={updateForm}>
              {["Culte", "Formation", "Séminaire", "Prière", "Spéciaux", "Retraite"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input name="date" value={form.date} onChange={updateForm} maxLength={80} placeholder="Ex. dimanche à 10 h" />
          </label>
          <label>
            Lieu
            <input name="lieu" value={form.lieu} onChange={updateForm} maxLength={120} />
          </label>
          <label>
            Fréquence ou heure
            <input
              name="freq"
              value={form.freq}
              onChange={updateForm}
              maxLength={80}
              list="announcement-frequency-options"
            />
            <datalist id="announcement-frequency-options">
              {FREQUENCY_OPTIONS.map((frequency) => (
                <option key={frequency} value={frequency} />
              ))}
            </datalist>
          </label>
          <label className="admin-announcement-image">
            Image (JPEG, PNG ou WebP, 5 Mo maximum)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="admin-announcement-description">
            Description
            <textarea name="contenu" value={form.contenu} onChange={updateForm} maxLength={3000} rows={4} required />
          </label>
          <label className="admin-announcement-publish">
            <input type="checkbox" name="published" checked={form.published} onChange={updateForm} />
            Publier immédiatement
          </label>
          <label className="admin-announcement-publish">
            <input
              type="checkbox"
              name="showInCarousel"
              checked={form.showInCarousel}
              onChange={updateForm}
              disabled={!imageFile && !form.image}
            />
            Afficher l’image dans le carrousel d’accueil
          </label>
        </div>
        {imageFile && <p className="admin-announcement-file">Image sélectionnée : {imageFile.name}</p>}
        {!imageFile && form.image && (
          <img className="admin-announcement-preview" src={`${API}${form.image}`} alt="Aperçu de l’image de l’annonce" />
        )}
        <div className="admin-announcement-actions">
          <button className="admin-primary-button" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer l’annonce"}
          </button>
          {editingId && (
            <button className="admin-secondary-button" type="button" onClick={resetForm}>
              Annuler
            </button>
          )}
        </div>
      </form>

      {loading && announcements.length === 0 ? (
        <p className="admin-empty">Chargement des annonces…</p>
      ) : announcements.length === 0 ? (
        <p className="admin-empty">Aucune annonce pour le moment.</p>
      ) : (
        <div className="admin-record-list">
          {announcements.map((announcement) => (
            <article className="admin-record" key={announcement.id}>
              <div className="admin-record-main">
                <div className="admin-record-title">
                  <h3>{announcement.title}</h3>
                  <span className={`admin-status ${announcement.published ? "admin-status-confirmed" : "admin-status-pending"}`}>
                    {announcement.published ? "Publiée" : "Brouillon"}
                  </span>
                </div>
                <p className="admin-record-activity">
                  {announcement.type} · {announcement.date || "Date à confirmer"} ·{" "}
                  {announcement.showInCarousel ? "Dans le carrousel" : "Hors carrousel"}
                </p>
                <p>{announcement.lieu || "Lieu à confirmer"}</p>
              </div>
              <div className="admin-record-actions">
                <button type="button" className="admin-secondary-button" onClick={() => editAnnouncement(announcement)}>
                  Modifier
                </button>
                <button type="button" className="admin-reject-button" onClick={() => deleteAnnouncement(announcement)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
