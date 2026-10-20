// src/screens/GiveScreen.jsx
import { useState } from "react";

const URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
// ── Logo SVGs ──────────────────────────────────────────────────
const MtnLogo = () => (
  <svg width="48" height="30" viewBox="0 0 80 50" aria-hidden="true">
    <rect width="80" height="50" rx="6" fill="#FFCC00" />
    <text
      x="40" y="35"
      textAnchor="middle"
      fontSize="22"
      fontWeight="700"
      fill="#1a1a1a"
      fontFamily="sans-serif"
    >
      MTN
    </text>
  </svg>
);
const Toast = ({ message, type = "success", onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 20,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 2000,
      background: type === "success" ? "#1a7a40" : "#c0392b",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: 12,
      boxShadow: "0 5px 20px rgba(0,0,0,0.25)",
      maxWidth: 320,
      textAlign: "center",
      fontSize: 14,
      cursor: "pointer",
    }}
    onClick={onClose}
  >
    {message}
  </div>
);

const Loader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      marginTop: 10,
      color: "#fff",
    }}
  >
    <div
      style={{
        width: 18,
        height: 18,
        border: "3px solid rgba(255,255,255,0.3)",
        borderTop: "3px solid #fff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />

    <span>Paiement en cours...</span>

    <style>
      {`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

const AirtelLogo = () => (
  <svg width="48" height="30" viewBox="0 0 80 50" aria-hidden="true">
    <rect width="80" height="50" rx="6" fill="#E30613" />
    <text
      x="40" y="35"
      textAnchor="middle"
      fontSize="16"
      fontWeight="700"
      fill="#fff"
      fontFamily="sans-serif"
    >
      airtel
    </text>
  </svg>
);

const VisaLogo = () => (
  <svg width="48" height="30" viewBox="0 0 80 50" aria-hidden="true">
    <rect width="80" height="50" rx="6" fill="#1A1F71" />
    <text
      x="40" y="35"
      textAnchor="middle"
      fontSize="22"
      fontWeight="700"
      fill="#fff"
      fontFamily="sans-serif"
      letterSpacing="2"
    >
      VISA
    </text>
  </svg>
);

const PaypalLogo = () => (
  <svg width="48" height="30" viewBox="0 0 80 50" aria-hidden="true">
    <rect width="80" height="50" rx="6" fill="#003087" />
    <text
      x="40" y="34"
      textAnchor="middle"
      fontSize="14"
      fontWeight="700"
      fill="#fff"
      fontFamily="sans-serif"
    >
      PayPal
    </text>
  </svg>
);

// ── Shared styles (inline, no styled-components needed) ────────
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
    padding: "24px 20px",
    width: "100%",
    maxWidth: 360,
  }),
  input: (dark) => ({
    width: "100%",
    padding: "10px 12px",
    marginBottom: 12,
    borderRadius: 10,
    border: `1px solid ${dark ? "#38383a" : "#d2d2d7"}`,
    background: dark ? "#242426" : "#f5f5f7",
    color: dark ? "#f5f5f7" : "#173b70",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  }),
  label: (dark) => ({
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: dark ? "#6e6e73" : "#8896b3",
    marginBottom: 4,
  }),
  btnPrimary: (color, textColor = "#fff") => ({
    width: "100%",
    padding: "12px 0",
    border: "none",
    borderRadius: 10,
    background: color,
    color: textColor,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 8,
  }),
  btnCancel: (dark) => ({
    width: "100%",
    padding: "10px 0",
    border: `1px solid ${dark ? "#38383a" : "#d2d2d7"}`,
    borderRadius: 10,
    background: "transparent",
    color: dark ? "#6e6e73" : "#6e6e73",
    fontSize: 14,
    cursor: "pointer",
  }),
};

// ── Modal: Mobile Money (MTN / Airtel) ─────────────────────────
const MobileMoneyModal = ({ dark, config, onClose }) => {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [phone, setPhone] = useState("");
  const [noms_prenoms, setNoms_prenoms] = useState("");
  const [amount, setAmount] = useState("");
const [popup, setPopup] = useState(null);
const [loading, setLoading] = useState(false);
const handlePay = async () => {
  if (!phone.trim() || !amount.trim() || !noms_prenoms.trim()) {
    setPopup({
  type: "error",
  message: "Champs manquants"
});
    return;
  }

   // Vérification du nom
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(noms_prenoms)) {
    setPopup({
      type: "error",
      message: "Le nom ne doit contenir que des lettres."
    });
    return;
  }
  
  if (phone.length !== 9 ||
    Number(amount) < 100 ||
    noms_prenoms.trim().length < 3) {
    setPopup({
  type: "error",
  message: "Champs invalide"
});
    return;
  }


  try {
  setLoading(true);

  const response = await fetch(URL+"/api/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
    noms_prenoms,
    phone,
    amount,
    operator: config.label,
}),
    });

    const data = await response.json();
    setLoading(false);

    if (data.success) {

  if (data.payment_url) {
    window.location.href = data.payment_url;
    return;
  }

  setPopup({
    type: "success",
    message: data.message || "Demande enregistrée. Aucun paiement n’a été effectué.",
  });
}else {
      setPopup({ type: "error", message: data.message || "Paiement indisponible." });
    }
  } catch (err) {
  console.error("Donation intent request failed:", err);
  setLoading(false);
  setPopup({
    type: "error",
    message: "Erreur de connexion."
  });
}
};

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal(dark)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {config.logo}
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: dark ? "#f0e6c8" : "#173b70" }}>
              {config.label}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: dark ? "#6e6e73" : "#8896b3" }}>
              {config.sub}
            </p>
          </div>
        </div>

        {/* Fields */}
        <label style={S.label(dark)}>Noms et prenoms</label>
        <input
  type="text"
  placeholder="Nom Prénom"
  value={noms_prenoms}
  onChange={(e) => {
    setIdempotencyKey(crypto.randomUUID());
    setNoms_prenoms(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ""));
  }}
  style={S.input(dark)}
  minLength={3}
/>
        <label style={S.label(dark)}>Numéro de téléphone</label>
        <input
    type="tel"
    inputMode="numeric"
    value={phone}
    onChange={(e) => {
      setIdempotencyKey(crypto.randomUUID());
      setPhone(e.target.value.replace(/\D/g, "").slice(0, 9));
    }}
    style={S.input(dark)}
/>

        <label style={S.label(dark)}>Montant (FCFA)</label>
        <input
          type="number"
          placeholder="Ex : 5000"
          value={amount}
          onChange={(e) => {
            setIdempotencyKey(crypto.randomUUID());
            setAmount(e.target.value);
          }}
          style={S.input(dark)}
          min={100}
        />

        {/* Buttons */}
        <button 
  style={{
    ...S.btnPrimary(config.color, config.textColor),
    opacity: loading ? 0.7 : 1,
  }} 
  onClick={handlePay}
  disabled={loading}
>
  {loading ? <Loader /> : `Payer avec ${config.label}`}
</button>
        <button style={S.btnCancel(dark)} onClick={onClose}>
          Annuler
        </button>
      </div>
      {popup && (
  <Toast
    type={popup.type}
    message={popup.message}
    onClose={() => setPopup(null)}
  />
)}
    </div>
  );
};

// ── Modal: Visa / Mastercard ───────────────────────────────────
const VisaModal = ({ dark, onClose }) => {
  const [popup, setPopup] = useState(null);
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [amount, setAmount] = useState("");

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const handlePay = () => {
    if (!holder || !number || !expiry || !cvv || !amount) {
      setPopup({
  type: "error",
  message: "Veuillez remplir tous les champs."
});
      return;
    }
    setPopup({
  type: "error",
  message: "Veuillez remplir tous les champs."
});
    // TODO: appel API Stripe / Flutterwave ici
    onClose();
  };

  const row = { display: "flex", gap: 12 };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal(dark)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <VisaLogo />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: dark ? "#f0e6c8" : "#173b70" }}>
              Visa / Mastercard
            </p>
            <p style={{ margin: 0, fontSize: 12, color: dark ? "#6e6e73" : "#8896b3" }}>
              Carte bancaire internationale
            </p>
          </div>
        </div>

        {/* Titulaire */}
        <label style={S.label(dark)}>Titulaire de la carte</label>
        <input
          type="text"
          placeholder="Nom Prénom"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          style={S.input(dark)}
        />

        {/* Numéro de carte */}
        <label style={S.label(dark)}>Numéro de carte</label>
        <input
          type="tel"
          placeholder="1234 5678 9012 3456"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          style={S.input(dark)}
          maxLength={19}
        />

        {/* Expiration + CVV */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={S.label(dark)}>Expiration</label>
            <input
              type="tel"
              placeholder="MM/AA"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              style={S.input(dark)}
              maxLength={5}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label(dark)}>CVV</label>
            <input
              type="tel"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={S.input(dark)}
              maxLength={4}
            />
          </div>
        </div>

        {/* Montant */}
        <label style={S.label(dark)}>Montant (FCFA)</label>
        <input
          type="number"
          placeholder="Ex : 10 000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={S.input(dark)}
          min={100}
        />

        {/* Boutons */}
        <button style={S.btnPrimary("#1A1F71")} onClick={handlePay}>
          Confirmer le paiement
        </button>
        <button style={S.btnCancel(dark)} onClick={onClose}>
          Annuler
        </button>
      </div>
      {popup && (
  <Toast
    type={popup.type}
    message={popup.message}
    onClose={() => setPopup(null)}
  />
)}
    </div>
  );
};

// ── Payment method row ─────────────────────────────────────────
const PaymentRow = ({ logo, label, sub, active, onClick, dark, statusLabel }) => (
  <div
    onClick={active ? onClick : undefined}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      marginBottom: 10,
      background: dark ? "#2c2c2e" : "#f0f4fb",
      borderRadius: 14,
      cursor: active ? "pointer" : "not-allowed",
      opacity: active ? 1 : 0.45,
      transition: "background 0.15s",
    }}
  >
    {logo}
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: dark ? "#f5f5f7" : "#173b70" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: dark ? "#6e6e73" : "#8896b3" }}>
        {sub}
      </p>
    </div>
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 20,
        background: active ? (dark ? "#163a28" : "#e2f5ea") : (dark ? "#3a1e1e" : "#fdeaea"),
        color: active ? (dark ? "#4ecb82" : "#1a7a40") : (dark ? "#e05a5a" : "#c0392b"),
      }}
    >
      {statusLabel || (active ? "Actif" : "Bientôt")}
    </span>
  </div>
);

// ── Main screen ────────────────────────────────────────────────
const GiveScreen = ({ dark = false }) => {
  const [modal, setModal] = useState(null); // "mtn" | "airtel" | "visa" | null

  const mtnConfig = {
    label: "MTN Mobile Money",
    sub: "Demande enregistrée sans prélèvement — intégration en attente",
    placeholder: "06x xxx xxxx",
    color: "#FFCC00",
    textColor: "#1a1a1a",
    logo: <MtnLogo />,
  };

  const airtelConfig = {
    label: "Airtel Money",
    sub: "Airtel · Congo",
    placeholder: "07x xxx xxxx",
    color: "#E30613",
    textColor: "#fff",
    logo: <AirtelLogo />,
  };

  return (
    <div style={{ padding: "40px 20px", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
      {/* Heading */}
      <div style={{ fontSize: 52, marginBottom: 12 }}>🙏</div>
      <h2 style={{ color: dark ? "#f0e6c8" : "#173b70", fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
        Offrandes & Dimes
      </h2>
      <p style={{ color: dark ? "#6e6e73" : "#6e6e73", fontSize: 14, marginBottom: 28 }}>
        Choisissez votre moyen de paiement
      </p>
      <p style={{
        color: dark ? "#f5f5f7" : "#6e6e73",
        background: dark ? "#2c2c2e" : "#fff8e6",
        borderRadius: 12,
        padding: "12px 14px",
        fontSize: 12,
        lineHeight: 1.5,
        margin: "0 0 18px",
      }}>
        Les paiements ne sont pas encore activés. Une demande MTN peut être enregistrée,
        mais aucun montant ne sera prélevé avant la mise en service officielle.
      </p>

      {/* Rows */}
      <PaymentRow
        dark={dark}
        logo={<MtnLogo />}
        label="MTN Mobile Money"
        sub={mtnConfig.sub}
        active
        onClick={() => setModal("mtn")}
        statusLabel="En attente"
      />
      <PaymentRow
        dark={dark}
        logo={<AirtelLogo />}
        label="Airtel Money"
        sub="Airtel · Congo"
        active={false}
      />
      <PaymentRow
        dark={dark}
        logo={<VisaLogo />}
        label="Visa / Mastercard"
        sub="Carte bancaire internationale"
        active={false}
      />
      <PaymentRow
        dark={dark}
        logo={<PaypalLogo />}
        label="PayPal"
        sub="Paiement en ligne"
        active={false}
      />

      {/* Modals */}
      {modal === "mtn" && (
        <MobileMoneyModal dark={dark} config={mtnConfig} onClose={() => setModal(null)} />
      )}
      {modal === "airtel" && (
        <MobileMoneyModal dark={dark} config={airtelConfig} onClose={() => setModal(null)} />
      )}
      {modal === "visa" && (
        <VisaModal dark={dark} onClose={() => setModal(null)} />
      )}
       
{/* ── Verset ───────────────────────────────────── */}
<div
  style={{
    margin: "28px 0 20px",
    padding: "20px",
    borderRadius: 16,
    background: dark ? "#2c2c2e" : "#f8f5ec",
    border: `1px solid ${dark ? "#d8b75b55" : "#d8c48a"}`,
    textAlign: "center",
  }}
>

  <h2
    style={{
      margin: "0 0 12px",
      color: dark ? "#e8cf8a" : "#9a762d",
      fontSize: 15,
      fontFamily: "Georgia, serif",
    }}
  >
    2 Corinthiens 9:7
  </h2>

  <p
    style={{
      margin: 0,
      color: dark ? "#e6e0d2" : "#4d4638",
      fontSize: 14,
      lineHeight: 1.7,
      fontStyle: "italic",
      fontFamily: "Georgia, serif",
    }}
  >
    Que chacun donne comme il l’a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie.
  </p>
</div>

      
    </div>
  );
};

export default GiveScreen;