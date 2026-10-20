import React from "react";
import { Link, useNavigate } from "react-router-dom";

// ============================================================
// ICONS
// ============================================================

export const Icon = ({ name, size = 24, color = "currentColor" }) => {
  const icons = {
    home: (
      <path
        d="M3 12L12 3l9 9M5 10v10h5v-5h4v5h5V10"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),

    location: (
      <>
        <path
          d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="10"
          r="2.5"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
      </>
    ),

    bible: (
      <>
        <path
          d="M4 4h16v16H4zM9 4v16M9 9h7M9 13h5"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    give: (
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill={color}
        opacity="0"
      />
    ),

    profile: (
      <>
        <circle
          cx="12"
          cy="7"
          r="4"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),

    bell: (
      <>
        <path
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    user: (
      <>
        <circle
          cx="12"
          cy="7"
          r="4"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),

    calendar: (
      <>
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M16 2v4M8 2v4M3 10h18"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),

    members: (
      <>
        <circle
          cx="9"
          cy="7"
          r="3"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
        />
        <path
          d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
        />
        <circle
          cx="17"
          cy="8"
          r="2.5"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M21 20c0-2.8-2-5-4.5-5.3"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),

    growth: (
      <>
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
        />
        <path
          d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),

    offerings: (
      <>
        <path
          d="M20 12V22H4V12"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M22 7H2v5h20V7z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),

    ministry: (
      <>
        <path
          d="M12 2L8 6H4v4l-2 2 2 2v4h4l4 4 4-4h4v-4l2-2-2-2V6h-4l-4-4z"
          stroke={color}
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke={color}
          strokeWidth="1.6"
          fill="none"
        />
      </>
    ),

    about: (
      <>
        <path
          d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M9 22V12h6v10"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
      </>
    ),

    media: (
      <>
        <polygon
          points="23 7 16 12 23 17 23 7"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
        <rect
          x="1"
          y="5"
          width="15"
          height="14"
          rx="2"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
      </>
    ),

    bible_book: (
      <>
        <path
          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
      </>
    ),

    prayer: (
      <path
        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
        stroke={color}
        strokeWidth="1.7"
        fill="none"
        strokeLinejoin="round"
      />
    ),

    give2: (
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
      />
    ),

    sun: (
      <>
        <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.8" />
        <path
          d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),

    moon: (
      <path
        d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.5 8.5 0 1 0 20.2 15.6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),

    chevronLeft: (
      <path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),

    chevronRight: (
      <path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),

    news: (
      <>
        <path
          d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm0 0H6a2 2 0 0 1-2-2v-7"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
        />
        <path
          d="M18 14H10M18 18H10M10 6h4v4h-4z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {icons[name] || null}
    </svg>
  );
};

// ============================================================
// BIBLE SCREEN
// ============================================================

export const BibleScreen = ({ dark }) => {
  return (
    <main className={`bible-page${dark ? " is-dark" : ""}`}>
      <header className="bible-hero">
        <div className="bible-hero-icon" aria-hidden="true">
          <Icon name="bible" size={26} color="#fff" />
        </div>
        <span className="bible-eyebrow">VOTRE RENDEZ-VOUS AVEC DIEU</span>
        <h1>La Parole qui fait grandir</h1>
        <p>Un moment dans les Écritures peut éclairer toute votre journée.</p>
      </header>

      <section className="bible-resources" aria-label="Ressources bibliques">
        <Link to="/lectureBible" className="bible-resource bible-resource-primary">
          <span className="bible-resource-icon">
            <Icon name="bible" size={23} color="#fff" />
          </span>
          <span className="bible-resource-copy">
            <strong>Lire la Bible</strong>
            <span>Parcourez les Saintes Écritures</span>
          </span>
          <span className="bible-resource-arrow" aria-hidden="true">
            <Icon name="chevronRight" size={19} color="#fff" />
          </span>
        </Link>

        <Link to="/PlanDeLecture" className="bible-resource">
          <span className="bible-resource-icon">
            <Icon name="calendar" size={23} color={dark ? "#e5c978" : "#173b70"} />
          </span>
          <span className="bible-resource-copy">
            <strong>Plan de lecture de l’église</strong>
            <span>Avancez chaque jour dans la Parole</span>
          </span>
          <span className="bible-resource-arrow" aria-hidden="true">
            <Icon name="chevronRight" size={19} color={dark ? "#e5c978" : "#173b70"} />
          </span>
        </Link>

        <Link to="/plan-lecture-personnalise" className="bible-resource">
          <span className="bible-resource-icon">
            <Icon name="calendar" size={23} color={dark ? "#e5c978" : "#173b70"} />
          </span>
          <span className="bible-resource-copy">
            <strong>Plan de lecture personnalisé</strong>
            <span>Choisissez un thème et suivez vos lectures</span>
          </span>
          <span className="bible-resource-arrow" aria-hidden="true">
            <Icon name="chevronRight" size={19} color={dark ? "#e5c978" : "#173b70"} />
          </span>
        </Link>

        <Link to="/encouragement" className="bible-resource">
          <span className="bible-resource-icon" aria-hidden="true">
            <Icon name="bible" size={22} color={dark ? "#e5c978" : "#173b70"} />
          </span>
          <span className="bible-resource-copy">
            <strong>Encouragement</strong>
            <span>Une parole pour fortifier votre foi</span>
          </span>
          <span className="bible-resource-arrow" aria-hidden="true">
            <Icon name="chevronRight" size={19} color={dark ? "#e5c978" : "#173b70"} />
          </span>
        </Link>
      </section>

      <blockquote className="bible-daily-verse">
        <span className="bible-verse-label">UN VERSET POUR AUJOURD’HUI</span>
        <p>
          « Vous recevrez une puissance, le Saint-Esprit survenant sur vous, et
          vous serez mes témoins à Jérusalem, dans toute la Judée, dans la
          Samarie, et jusqu’aux extrémités de la terre. »
        </p>
        <cite>ACTES 1:8</cite>
      </blockquote>
    </main>
  );
};

// ============================================================
// ENCOURAGEMENT SCREEN
// ============================================================

export const EncouragementScreen = ({ dark }) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "24px 20px 32px",
        background: dark ? "#101A2A" : "#F7F9FC",
      }}
    >
      {/* RETOUR */}
      <button
        onClick={() => navigate(-1)}
        aria-label="Retour"
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          border: "none",
          background: dark ? "#1E2D45" : "#FFFFFF",
          color: dark ? "#F5E6B8" : "#1A2744",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: dark
            ? "0 4px 12px rgba(0,0,0,0.2)"
            : "0 4px 12px rgba(31,50,81,0.08)",
        }}
      >
        <Icon name="chevronLeft" size={22} />
      </button>

      {/* CONTENU */}
      <div
        style={{
          marginTop: 35,
          padding: "32px 22px",
          borderRadius: 24,
          background: dark
            ? "linear-gradient(135deg, #1E2D45, #253A5A)"
            : "#FFFFFF",
          textAlign: "center",
          boxShadow: dark
            ? "0 10px 30px rgba(0,0,0,0.25)"
            : "0 10px 25px rgba(31,50,81,0.08)",
        }}
      >
        <div style={{ fontSize: 45, marginBottom: 15 }}>
          📖
        </div>

        <h2
          style={{
            color: dark ? "#F5E6B8" : "#1A2744",
            fontSize: 23,
            marginBottom: 18,
          }}
        >
          Un encouragement pour aujourd'hui
        </h2>

        <p
          style={{
            color: dark ? "#D8E1ED" : "#53627A",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          Prenez quelques minutes aujourd'hui pour lire la Parole de Dieu.
          Même un seul passage peut apporter la paix, la sagesse et la force
          dont vous avez besoin.
        </p>

        <div
          style={{
            marginTop: 25,
            padding: "18px",
            borderRadius: 16,
            background: dark ? "#2A3B57" : "#F8F4E8",
            color: dark ? "#F5E6B8" : "#705B20",
            fontSize: 14,
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          « Ta parole est une lampe à mes pieds, et une lumière sur mon
          sentier. »
          <br />
          <strong>— Psaume 119:105</strong>
        </div>

        <Link
          to="/lectureBible"
          style={{
            display: "block",
            marginTop: 24,
            padding: "14px",
            borderRadius: 14,
            background: "#C9A84C",
            color: "#FFFFFF",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Commencer ma lecture
        </Link>
      </div>
    </div>
  );
};

// ============================================================
// PROFILE SCREEN
// ============================================================

export const ProfileScreen = ({ dark }) => {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Inscription", path: "/Inscription" },
    { label: "Se connecter", path: "/connexion" },
    { label: "A propos", path: "/about" },
  ];

  return (
    <div
      style={{
        padding: "30px 20px",
        background: dark ? "#101A2A" : "#F7F9FC",
        minHeight: "100%",
      }}
    >
      {/* RETOUR */}
      <button
        onClick={() => navigate(-1)}
        aria-label="Retour"
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          border: "none",
          background: dark ? "#1E2D45" : "#FFFFFF",
          color: dark ? "#F5E6B8" : "#1A2744",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginBottom: 25,
        }}
      >
        <Icon name="chevronLeft" size={22} />
      </button>

      {menuItems.map((item) => (
        <Link
          key={item.label}
          to={item.path}
          style={{
            textDecoration: "none",
            display: "block",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              marginBottom: 10,
              background: dark ? "#1E2D45" : "#FFFFFF",
              borderRadius: 14,
              cursor: "pointer",
              border: `1px solid ${dark ? "#324867" : "#E5ECF8"}`,
            }}
          >
            <span
              style={{
                color: dark ? "#E8DFC0" : "#1A2744",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>

            <span
              style={{
                color: "#C9A84C",
                fontSize: 22,
              }}
            >
              ›
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};