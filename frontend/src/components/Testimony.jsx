import React from "react";

export default function Testimony({ dark }) {
  const C = {
    bg: dark ? "#1c1c1e" : "#ffffff",
    text: dark ? "#f5f5f7" : "#173b70",
    sub: dark ? "#a1a1a6" : "#6e6e73",
    border: dark ? "#38383a" : "#d2d2d7",
    accent: "#c9a84c",
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 650,
          textAlign: "center",
          padding: "50px 25px",
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          background: dark ? "#111f33" : "#ffffff",
          boxShadow: dark
            ? "0 12px 35px rgba(0,0,0,0.25)"
            : "0 12px 35px rgba(31,50,81,0.08)",
        }}
      >
        {/* Icône */}
        <div
          style={{
            width: 80,
            height: 80,
            margin: "0 auto 25px",
            borderRadius: "50%",
            background: dark ? "#38383a" : "#f7f0df",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
        >
          📚
        </div>

        {/* Titre */}
        <h1
          style={{
            margin: "0 0 18px",
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 700,
            color: C.text,
          }}
        >
          Bibliothèque
        </h1>

        {/* Ligne dorée */}
        <div
          style={{
            width: 60,
            height: 3,
            margin: "0 auto 22px",
            borderRadius: 10,
            background: C.accent,
          }}
        />

        {/* Message */}
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.8,
            color: C.sub,
          }}
        >
          Ici sera développée la bibliothèque de l'Église.
          <br />
          Vous y trouverez les livres relatifs à la vie de l'Église,
          <br />
          ainsi que différentes ressources pour votre croissance spirituelle.
        </p>

        {/* Petit message */}
        <div
          style={{
            marginTop: 30,
            padding: "16px 20px",
            borderRadius: 15,
            background: dark ? "#172a43" : "#f8f4e8",
            color: dark ? "#f5f5f7" : "#705b20",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          📖 <strong>Prochainement...</strong>
          <br />
          Une collection de livres et de ressources sera disponible ici.
        </div>
      </div>
    </section>
  );
}