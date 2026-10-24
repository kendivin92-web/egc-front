// src/screens/FormationScreen.jsx
import { useRef, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ── Icône Formation ──────────────────────────────────────────
const FormationIcon = () => (
  <div
    style={{
      width: 50,
      height: 50,
      borderRadius: 12,
      background: "#d4af37",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
    }}
  >
    📖
  </div>
);

// ── Styles ──────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "0 16px",
  },

  modal: (dark) => ({
    background: dark ? "#2c2c2e" : "#fff",
    borderRadius: 16,
    padding: "24px",
    width: "100%",
    maxWidth: 380,
  }),

  input: (dark) => ({
    width: "100%",
    padding: "12px",
    marginBottom: 12,
    borderRadius: 10,
    border: `1px solid ${dark ? "#38383a" : "#d2d2d7"}`,
    background: dark ? "#242426" : "#f5f5f7",
    color: dark ? "#f5f5f7" : "#173b70",
    outline: "none",
    boxSizing: "border-box",
  }),

  btnPrimary: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: 10,
    background: "#d4af37",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 10,
  },

  btnCancel: (dark) => ({
    width: "100%",
    padding: "12px",
    marginTop: 8,
    borderRadius: 10,
    border: `1px solid ${dark ? "#38383a" : "#d2d2d7"}`,
    background: "transparent",
    color: dark ? "#6e6e73" : "#6e6e73",
    cursor: "pointer",
  }),
};

// ── Carte Formation ─────────────────────────────────────────
const FormationRow = ({ dark, formation, onClick }) => (
  <div
    onClick={() => onClick(formation)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      marginBottom: 12,
      borderRadius: 14,
      cursor: "pointer",
      background: dark ? "#2c2c2e" : "#f0f4fb",
      transition: "0.2s",
    }}
  >
    <FormationIcon />

    <div style={{ flex: 1, textAlign: "left" }}>
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          color: dark ? "#f0e6c8" : "#173b70",
        }}
      >
        {formation}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: dark ? "#6e6e73" : "#8896b3",
        }}
      >
        Cliquez pour vous inscrire
      </p>
    </div>

    <span style={{ color: "#d4af37", fontWeight: 700 }}>→</span>
  </div>
);

// ── Modal d'inscription ─────────────────────────────────────
const FormationModal = ({ formation, dark, onClose }) => {
  const [loading, setLoading] = useState(false);
  const requestKeyRef = useRef(null);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    ville: "",
    arrondissement: "",
  });

  const handleChange = (e) => {
    requestKeyRef.current = null;
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (
      !form.nom.trim() ||
      !form.prenom.trim() ||
      !form.adresse.trim() ||
      !form.ville.trim() ||
      !form.arrondissement.trim() ||
      !/^\d{9}$/.test(form.telephone.replace(/\D/g, ""))
    ) {
      alert("Veuillez renseigner votre identité, votre domicile et un numéro de téléphone valide à 9 chiffres.");
      return;
    }

    try {
      setLoading(true);
      requestKeyRef.current ??= crypto.randomUUID();

      const response = await fetch(
        `${API}/api/formations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKeyRef.current,
          },
          body: JSON.stringify({
            formation,
            ...form,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l’inscription.");
      }

      alert(
        `✅ Votre demande d'inscription à la formation "${formation}" a été envoyée.`
      );

      onClose();
    } catch (error) {
      alert(error.message || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div
        style={S.modal(dark)}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            color: dark ? "#f0e6c8" : "#173b70",
            marginTop: 0,
          }}
        >
          Formation : {formation}
        </h3>

        <input
          style={S.input(dark)}
          placeholder="Nom"
          name="nom"
          value={form.nom}
          onChange={handleChange}
        />

        <input
          style={S.input(dark)}
          placeholder="Prénom"
          name="prenom"
          value={form.prenom}
          onChange={handleChange}
        />

        <input
          style={S.input(dark)}
          placeholder="Téléphone"
          name="telephone"
          value={form.telephone}
          onChange={handleChange}
        />

        <input
          style={S.input(dark)}
          placeholder="Email"
          name="email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="adresse"
          placeholder="Adresse complète (rue et repère)"
          value={form.adresse}
          onChange={handleChange}
          style={S.input(dark)}
          required
        />
        <input
          name="ville"
          placeholder="Ville"
          value={form.ville}
          onChange={handleChange}
          style={S.input(dark)}
          required
        />
        <input
          name="arrondissement"
          placeholder="Quartier ou arrondissement"
          value={form.arrondissement}
          onChange={handleChange}
          style={S.input(dark)}
          required
        />
        <p style={{ fontSize: 12, color: dark ? "#a1a1a6" : "#6e6e73" }}>
          Votre adresse est conservée pour le suivi de l’inscription et visible uniquement par l’administration.
        </p>

        <button
          style={S.btnPrimary}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "Envoi..."
            : "S'inscrire ou se preinscrire à la formation"}
        </button>

        <button
          style={S.btnCancel(dark)}
          onClick={onClose}
        >
          Annuler
        </button>
      </div>
    </div>
  );
};

// ── Écran principal ──────────────────────────────────────────
const FormationScreen = ({ dark = false }) => {
  const [selectedFormation, setSelectedFormation] =
    useState(null);

  const formations = [
    "Miséricorde",
    "Serviteur",
    "La Grâce",
    "Autre a preciser",
  ];

  return (
    <div
      style={{
        padding: "40px 20px",
        maxWidth: 450,
        margin: "0 auto",
        textAlign: "center",
      }}
    >

      {formations.map((formation) => (
        <FormationRow
          key={formation}
          formation={formation}
          dark={dark}
          onClick={setSelectedFormation}
        />
      ))}

      {selectedFormation && (
        <FormationModal
          formation={selectedFormation}
          dark={dark}
          onClose={() =>
            setSelectedFormation(null)
          }
        />
      )}
    </div>
  );
};

export default FormationScreen;