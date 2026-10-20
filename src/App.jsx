import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from '@capacitor/status-bar';
const LocationMap = lazy(() => import("./components/LocationMap"));
const PersonalizedReadingPlan = lazy(() => import("./components/PersonalizedReadingPlan"));
const GiveScreen = lazy(() => import("./components/GiveScreen"));
const EventsPage = lazy(() => import("./components/EventsPage"));
const Inscription = lazy(() => import("./components/Formulaire"));
const Formations = lazy(() => import("./components/Formations"));
const Plandelecture = lazy(() => import("./components/Plandelecture"));
const Encouragement = lazy(() => import("./components/Encouragement"));
const Historique = lazy(() => import("./components/Historique"));
const Rappel = lazy(() => import("./components/Rappel"));
const Lives = lazy(() =>
  import("./components/Lives").then((module) => ({ default: module.Lives })),
);
const Prayer = lazy(() =>
  import("./components/Lives").then((module) => ({ default: module.Prayer })),
);
const LectureBible = lazy(() => import("./components/LectureBible"));
const About = lazy(() => import("./components/About"));
const Testimony = lazy(() => import("./components/Testimony"));
const Invitation = lazy(() => import("./components/Invitation"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
import logo from "./assets/logoNew.png";
import {
  Icon,
  ProfileScreen, BibleScreen,
} from "./components/carouselSlides";
import { FEATURES, NAV_ITEMS } from "./components/homeConfig";
import Footer from "./components/Footer";
const URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
import imageLocal from "./assets/1234.jpg";
import churchImage from "./assets/egc-worship.jpg";
const EVENTS_LOCAL = [
  {
    id: 1,
    image: churchImage,
    titre: "Culte du dimanche",
    contenu: "ÉGLISE GLORIEUSE DU CHRIST",
    type: "Événement",
    lieu: "Église",
    heure: "09:00",
    cat: "Culte",
  },
  {
    id: 2,
    image: imageLocal,
    titre: "Ensemble dans la louange",
    contenu: "VIE DE L’ÉGLISE",
    type: "Événement",
    dateEvent: "Chaque dimanche",
    lieu: "Église",
    heure: "09:00",
    cat: "Culte",
  },
];
const getImageUrl = (image) => {
  if (!image) return "";

  // Image locale importée avec Vite/React
  // Exemple : /src/assets/1234.jpg
  // ou : /assets/1234-abc123.jpg
  if (image.includes("/assets/")) {
    return image;
  }

  // URL complète
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Image venant du backend
  return `${URL}/${image.replace(/^\/+/, "")}`;
};

export default function EgliseFoiVictoire() {
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });
  const [carouselSlides, setCarouselSlides] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("annonces") || "null");
      return Array.isArray(cached) && cached.length > 0 ? cached : EVENTS_LOCAL;
    } catch (error) {
      console.error("Impossible de lire les annonces en cache :", error);
      return EVENTS_LOCAL;
    }
  });
  const [slide, setSlide] = useState(0);
  const [navVisible, setNavVisible] = useState(true);
  const [activeFeature, setActiveFeature] = useState(null);
  const lastScrollY = useRef(0);
  const scrollRef = useRef(null);
  const touchStartX = useRef(null);

  // ── React Router ──────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();

  const hideLayout = location.pathname === "/connexion" || location.pathname === "/admin";

  // Déduit l'onglet actif depuis l'URL  ( "/" → "home", "/bible" → "bible" … )
  const activeNav = location.pathname.replace("/", "") || "home";
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (location.pathname === "/plan-lecture-personnalise" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

// Activer le plein écran au démarrage
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  const configureStatusBar = async () => {
    try {
      // Permet à l'application web de s'étendre tout en haut sous la barre de statut
      await StatusBar.setOverlaysWebView({ overlay: true });
      // Optionnel : masque complètement la barre du haut
      await StatusBar.hide();
    } catch (error) {
      console.log("StatusBar non supportée sur le Web/navigateur", error);
    }
  };

  configureStatusBar();
}, []);

   // ── Chargement des slides depuis l'API ─
   useEffect(() => {
     const controller = new AbortController();
     const chargerAnnonces = async () => {
       try {
         const res = await fetch(`${URL}/api/annonces`, { signal: controller.signal });
         if (!res.ok) {
           throw new Error(`HTTP ${res.status}`);
         }

         const data = await res.json();
         if (!Array.isArray(data)) {
           throw new Error("Format de réponse des annonces invalide.");
         }

         setCarouselSlides(data.length > 0 ? data : EVENTS_LOCAL);
         localStorage.setItem("annonces", JSON.stringify(data));
       } catch (error) {
         if (!controller.signal.aborted) {
           console.error("Impossible d’actualiser les annonces :", error);
         }
       }
     };

     chargerAnnonces();
     return () => controller.abort();
   }, []);

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  // Palette
  const C = {
    bg: dark ? "#101722" : "#f5f5f7",
    card: dark ? "#1b2636" : "#ffffff",
    cardAlt: dark ? "#263448" : "#f5f5f7",
    primary: dark ? "#244b78" : "#173b70",
    accent: dark ? "#e5c978" : "#c9a84c",
    accentTeal: dark ? "#7ccfc1" : "#173b70",
    text: dark ? "#f3f6fb" : "#173b70",
    textSub: dark ? "#c0cad8" : "#6e6e73",
    border: dark ? "#35445a" : "#d2d2d7",
    navBg: dark ? "#141f2e" : "#ffffff",
    headerBg: dark ? "#141f2e" : "#ffffff",
  };

  // Auto-advance carousel

  useEffect(() => {
    if (carouselSlides.length === 0) return;
    const slideCount = Math.min(carouselSlides.length, 4);
    const t = setInterval(
      () => setSlide((s) => (s + 1) % slideCount),
      5000
    );
    return () => clearInterval(t);
  }, [carouselSlides.length]);

  // Hide/show nav on scroll
  const handleScroll = useCallback((e) => {
    const y = e.target.scrollTop;
    if (y > lastScrollY.current + 8) setNavVisible(false);
    else if (y < lastScrollY.current - 8) setNavVisible(true);
    lastScrollY.current = y;
  }, []);

  // Touch swipe carousel
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const slideCount = Math.min(carouselSlides.length, 4);
    if (Math.abs(diff) > 40 && slideCount > 0)
      setSlide((s) =>
        diff > 0
          ? (s + 1) % slideCount
          : (s - 1 + slideCount) % slideCount
      );
    touchStartX.current = null;
  };

  // Helper : navigate vers un onglet
  // "home" → "/"   |   les autres → "/<id>"
  const goTo = (id) => navigate(id === "home" ? "/" : `/${id}`);

  const visibleSlides = carouselSlides.slice(-4);
  const renderHome = () => (
    <div className="home-dashboard">
      <section className="home-welcome">
        <span className="home-eyebrow">UNE COMMUNAUTÉ DE FOI</span>
        <h1>Bienvenue chez vous</h1>
        <p>Croître jusqu’à manifester Christ dans sa plénitude.</p>
      </section>

      <section
        className="home-hero"
        aria-label="Actualités de l'Église"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {visibleSlides.length > 0 ? (
          visibleSlides.map((item, index) => (
            <article
              key={item.id}
              className={`home-hero-slide${index === slide % visibleSlides.length ? " is-active" : ""}`}
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(9,31,67,.88) 0%, rgba(9,31,67,.56) 58%, rgba(9,31,67,.1) 100%), url("${getImageUrl(item.image)}")`,
              }}
              aria-hidden={index !== slide % visibleSlides.length}
            >
              <div className="home-hero-copy">
                <span className="home-hero-tag">
                  <span />
                  {item.contenu || item.type || "EGC • ACTUALITÉ"}
                </span>
                <h2>{item.titre || "Vivez votre foi avec nous"}</h2>
                <button
                  type="button"
                  className="home-hero-cta"
                  onClick={() => navigate("/events")}
                  tabIndex={index === slide % visibleSlides.length ? 0 : -1}
                >
                  Découvrir nos activités
                  <Icon name="chevronRight" size={16} color="#173b70" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="home-hero-slide is-active home-hero-fallback">
            <div className="home-hero-copy">
              <span className="home-hero-tag"><span />ÉGLISE GLORIEUSE DU CHRIST</span>
              <h2>Ensemble, avançons dans la foi.</h2>
              <button type="button" className="home-hero-cta" onClick={() => navigate("/events")}>
                Découvrir nos activités
                <Icon name="chevronRight" size={16} color="#173b70" />
              </button>
            </div>
          </div>
        )}
        {visibleSlides.length > 1 && (
          <>
            <div className="home-hero-controls">
              {[
                [-1, "chevronLeft", "Précédent"],
                [1, "chevronRight", "Suivant"],
              ].map(([direction, icon, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() =>
                    setSlide((current) => (current + direction + visibleSlides.length) % visibleSlides.length)
                  }
                >
                  <Icon name={icon} size={18} color="#fff" />
                </button>
              ))}
            </div>
            <div className="home-hero-dots" aria-label="Sélectionner une actualité">
              {visibleSlides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Actualité ${index + 1}`}
                  aria-current={index === slide % visibleSlides.length}
                  className={index === slide % visibleSlides.length ? "is-active" : ""}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="home-verse" aria-label="Verset du jour">
        <div className="home-verse-mark" aria-hidden="true">
          <Icon name="bible" size={20} color="#e1c36f" />
        </div>
        <div>
          <span className="home-verse-reference">LA PAROLE DU JOUR · ACTES 1:8</span>
          <p>
            « Vous serez mes témoins à Jérusalem, dans toute la Judée, dans la
            Samarie, et jusqu’aux extrémités de la terre. »
          </p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">À PORTÉE DE MAIN</span>
            <h2>Explorer</h2>
          </div>
          <span className="home-section-count">{String(FEATURES.length).padStart(2, "0")}</span>
        </div>
        <div className="home-feature-grid">
          {FEATURES.map((feature) => {
            const active = activeFeature === feature.id;
            return (
              <button
                key={feature.id}
                type="button"
                className={`home-feature${active ? " is-active" : ""}`}
                onClick={() => {
                  setActiveFeature(feature.id);
                  navigate(feature.path);
                }}
              >
                <span className="home-feature-icon">
                  <Icon
                    name={feature.icon}
                    size={21}
                    color={active ? "#fff" : dark ? "#a8c9f4" : C.primary}
                  />
                </span>
                <span className="home-feature-label">{feature.label}</span>
                <span className="home-feature-arrow" aria-hidden="true">
                  <Icon name="chevronRight" size={15} color={active ? "#fff" : C.textSub} />
                </span>
                {feature.contenu && <span className="home-feature-badge">{feature.contenu}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section home-news">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">RESTEZ CONNECTÉS</span>
            <h2>Vie de l’église</h2>
          </div>
          <button type="button" className="home-text-link" onClick={() => navigate("/events")}>
            Tout voir <Icon name="chevronRight" size={15} color={C.accent} />
          </button>
        </div>
        {visibleSlides.length ? (
          <div className="home-news-list">
            {carouselSlides.slice(-3).reverse().map((news) => (
              <article className="home-news-card" key={news.id}>
                <img src={getImageUrl(news.image)} alt="" />
                <div className="home-news-copy">
                  <span>{news.type || news.contenu || "Actualité"}</span>
                  <h3>{news.titre}</h3>
                  <p>{news.dateEvent || "Église Glorieuse du Christ"}</p>
                </div>
                <Icon name="chevronRight" size={17} color={C.textSub} />
              </article>
            ))}
          </div>
        ) : (
          <p className="home-news-empty">Les actualités de l’église apparaîtront ici.</p>
        )}
      </section>
      <Footer dark={dark} />
    </div>
  );

  return (
    <div
      className="app-shell"
      style={{
        "--app-bg": C.bg,
        "--app-card": C.card,
        "--app-card-alt": C.cardAlt,
        "--app-text": C.text,
        "--app-muted": C.textSub,
        "--app-border": C.border,
        "--app-accent": C.accent,
        "--app-primary": C.primary,
        maxWidth:
  hideLayout ||
  activeNav === "LectureBible" ||
  activeNav === "PlanDeLecture" ||
  activeNav === "plan-lecture-personnalise"
    ? "100%"
    : 1440,
        margin: "0 auto",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      {!hideLayout && (
      <header
        className="app-header"
        style={{
          background: C.headerBg,
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          paddingRight: "20px",
          paddingBottom: "12px",
          paddingLeft: "20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div className="app-brand-wrap">
          {activeNav !== "home" && (
            <button
              type="button"
              aria-label="Retour"
              onClick={() => navigate(-1)}
              className="app-back-button"
            >
              <Icon name="chevronLeft" size={22} color={C.text} />
            </button>
          )}

          <img className="app-logo" src={logo} alt="Logo EGC" />
          <div className="app-brand-copy">
            <strong style={{ color: C.text }}>EGC</strong>
            <span style={{ color: C.textSub }}>ÉGLISE GLORIEUSE DU CHRIST</span>
          </div>
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}
            aria-pressed={dark}
            className="theme-toggle"
          >
            <Icon name={dark ? "sun" : "moon"} size={17} color={C.accent} />
            <span>{dark ? "Sombre" : "Clair"}</span>
          </button>
        </div>
      </header>)}

      {/* SCROLLABLE CONTENT */}
      <div
        className="app-scroll"
  ref={scrollRef}
  onScroll={handleScroll}
  style={{
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding:
      activeNav === "LectureBible" ||
      activeNav === "PlanDeLecture" ||
      activeNav === "plan-lecture-personnalise"
        ? 0
        : "20px 18px 0",
    scrollBehavior: "smooth",
    width:
      activeNav === "LectureBible" ||
      activeNav === "PlanDeLecture" ||
      activeNav === "plan-lecture-personnalise"
        ? "100%"
        : undefined,
  }}
>
        {/* ── Toute la navigation est gérée par React Router ── */}
        <Suspense fallback={<div className="screen-loading" role="status">Chargement…</div>}>
        <Routes>
          <Route path="/"        element={renderHome()} />
          <Route path="/bible"   element={<BibleScreen dark={dark} />} />
          <Route path="/give"    element={<GiveScreen dark={dark} />} />
          <Route path="/profile" element={<ProfileScreen dark={dark} />} />
          <Route path="/events" element={<EventsPage dark={dark} />} />
          <Route path="/inscription" element={<Inscription dark={dark} />} />
          <Route path="/connexion" element={<Navigate to="/admin" replace />} />
          <Route path="/formations" element={<Formations dark={dark} />} />
          <Route path="/live" element={<Lives dark={dark} />} />
          <Route path="/prayer" element={<Prayer dark={dark} />} />
          <Route path="/LectureBible" element={<LectureBible dark={dark} />} />
          <Route path="/about" element={<About dark={dark} />} />
          <Route path="/testimony" element={<Testimony dark={dark} />} />
          <Route path="/PlanDeLecture" element={<Plandelecture dark={dark} />} />
          <Route path="/plan-lecture-personnalise" element={<PersonalizedReadingPlan dark={dark} />} />
          <Route path="/Historique" element={<Historique dark={dark} />} />
          <Route path="/Rappel" element={<Rappel dark={dark} />} />
          <Route path="/encouragement" element={<Encouragement dark={dark} />} />
          <Route path="/localisation" element={<LocationMap dark={dark} />} />
          <Route path="/invitation" element={<Invitation dark={dark} />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        </Suspense>
      </div>

      {/* BOTTOM NAV */}
      {!hideLayout && (
      <nav
        aria-label="Navigation principale"
        className="app-bottom-nav"
  style={{
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
     background: C.navBg,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          transform: navVisible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 20,
          boxShadow: dark
            ? "0 -4px 20px rgba(0,0,0,0.4)"
            : "0 -2px 16px rgba(26,39,68,0.1)",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}   // ← navigate via React Router
              className="app-nav-item"
              aria-current={active ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "9px 0 10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                gap: 3,
              }}
            >
              {active && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 40,
                    height: 2.5,
                    borderRadius: 2,
                    background: C.accent,
                  }}
                />
              )}
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 12,
                  background: active
                    ? dark
                      ? "rgba(229,201,120,0.16)"
                      : "rgba(26,39,68,0.07)"
                    : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  color={active ? C.accent : C.textSub}
                />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? C.accent : C.textSub,
                  transition: "color 0.2s",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
      )}
    </div>
  );
}