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
import { FEATURES, FUTURE_FEATURES, NAV_ITEMS } from "./components/homeConfig";
import Footer from "./components/Footer";
import { API_URL as URL } from "./services/apiConfig";
import {
  getOfflineData,
  getOfflinePreference,
  setOfflineData,
  setOfflinePreference,
} from "./services/offlineStorage.js";
import { useNetworkStatus } from "./services/useNetworkStatus.js";
import imageLocal from "./assets/1234.jpg";
import churchImage from "./assets/egc-worship.jpg";

const COMING_SOON_MESSAGE = "Cette rubrique sera bientôt disponible dans les prochaines versions.";
const MAX_CAROUSEL_SLIDES = 7;
const PLATFORM_DEMOS = [
  {
    id: "bible",
    eyebrow: "LA PAROLE AU QUOTIDIEN",
    title: "Vous souhaitez lire la Bible chaque jour ?",
    description: "Ouvrez la Bible dans l’application et retrouvez la Parole où que vous soyez.",
    icon: "bible",
    actionLabel: "Lire la Bible",
    path: "/bible",
  },
  {
    id: "announcements",
    eyebrow: "LA VIE DE L’ÉGLISE",
    title: "Vous voulez connaître les annonces de l’Église ?",
    description: "Ouvrez Événements pour consulter les cultes, programmes et rendez-vous de la semaine.",
    icon: "calendar",
    actionLabel: "Voir les événements",
    path: "/events",
  },
  {
    id: "live",
    eyebrow: "L’ÉGLISE EN DIRECT",
    title: "Vous avez manqué un culte ?",
    description: "Pas de panique : retrouvez sa rediffusion dans la partie Direct de l’application et suivez les cultes en cours.",
    icon: "media",
    actionLabel: "Voir le direct et les rediffusions",
    path: "/live",
  },
  {
    id: "locations",
    eyebrow: "NOS ASSEMBLÉES",
    title: "Vous cherchez une assemblée près de vous ?",
    description: "Consultez la carte pour trouver les différentes Églises Glorieuses du Christ.",
    icon: "location",
    actionLabel: "Trouver mon Église",
    path: "/localisation",
  },
  {
    id: "invitation",
    eyebrow: "LE PARTAGE CONTINUE",
    title: "Vous voulez inviter vos membres ?",
    description: "Partagez l’application avec vos proches et votre communauté en quelques instants.",
    icon: "members",
    actionLabel: "Inviter mes proches",
    path: "/invitation",
  },
  {
    id: "contact",
    eyebrow: "RESTONS EN CONTACT",
    title: "Besoin de joindre l’Église ?",
    description: "Retrouvez son numéro et appelez directement l’Église Glorieuse du Christ depuis l’application.",
    icon: "phone",
    actionLabel: "Appeler l’Église",
    href: "tel:+242067527474",
  },
];

function ComingSoonScreen({ dark }) {
  return (
    <div
      role="status"
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        textAlign: "center",
        color: dark ? "#f5e6b8" : "#1a2744",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div aria-hidden="true" style={{ fontSize: 56, marginBottom: 18 }}>🙏</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 25 }}>Bientôt disponible</h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: dark ? "#b9c5d8" : "#68738a" }}>
          {COMING_SOON_MESSAGE}
        </p>
      </div>
    </div>
  );
}

function OnlineAdmin() {
  const { isOnline, isReady } = useNetworkStatus();

  if (!isReady) {
    return <div className="screen-loading" role="status">Vérification de la connexion…</div>;
  }

  if (!isOnline) {
    return (
      <main role="status" style={{ padding: 32, textAlign: "center" }}>
        <h1>Administration indisponible hors connexion</h1>
        <p>Reconnectez-vous à Internet pour accéder à l’authentification et à l’espace administrateur.</p>
      </main>
    );
  }

  return <AdminDashboard />;
}

function AnnouncementDetails({ announcement, dark, onClose }) {
  const title = announcement.titre || announcement.title || "Actualité de l’église";
  const image = getImageUrl(announcement.image);
  const detailCardStyle = {
    padding: 14,
    borderRadius: 12,
    background: dark ? "#263448" : "#f5f5f7",
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "rgba(0, 0, 0, 0.68)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-details-title"
        style={{
          width: "min(100%, 560px)",
          maxHeight: "90dvh",
          overflowY: "auto",
          borderRadius: 22,
          background: dark ? "#1b2636" : "#fff",
          color: dark ? "#f3f6fb" : "#173b70",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
        }}
      >
        {image && (
          <img
            src={image}
            alt=""
            style={{
              display: "block",
              width: "100%",
              maxHeight: 320,
              objectFit: "cover",
            }}
          />
        )}
        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <span style={{ color: dark ? "#e5c978" : "#9b7b28", fontSize: 13, fontWeight: 700 }}>
                {announcement.type || "Actualité"}
              </span>
              <h2 id="announcement-details-title" style={{ margin: "8px 0 0", fontSize: 24 }}>
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer les détails"
              style={{
                width: 40,
                height: 40,
                flex: "0 0 auto",
                border: 0,
                borderRadius: "50%",
                background: dark ? "#263448" : "#f0f2f5",
                color: "inherit",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
          {announcement.contenu && (
            <p style={{ margin: "18px 0", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {announcement.contenu}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {[
              ["Date", announcement.dateEvent || announcement.date],
              ["Heure / fréquence", announcement.heure || announcement.freq],
              ["Lieu", announcement.lieu],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label} style={detailCardStyle}>
                <span style={{ display: "block", marginBottom: 5, fontSize: 12, opacity: 0.7 }}>
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

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

const cacheAnnouncementImages = (announcements) => {
  if (!Array.isArray(announcements) || !("serviceWorker" in navigator)) return;
  const imageUrls = announcements
    .map((announcement) => getImageUrl(announcement.image))
    .filter(Boolean);
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({
        type: "CACHE_ANNOUNCEMENT_IMAGES",
        imageUrls,
      });
    })
    .catch((error) => {
      console.error("Impossible de préparer le cache hors ligne des images :", error);
    });
};

export default function EgliseFoiVictoire() {
  const { isOnline } = useNetworkStatus();
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("annonces") || "null");
      return Array.isArray(cached)
        ? cached
          .filter((announcement) => announcement.showInCarousel === true)
          .slice(0, MAX_CAROUSEL_SLIDES)
        : [];
    } catch (error) {
      console.error("Impossible de lire les annonces en cache :", error);
      return [];
    }
  });
  const [carouselMode, setCarouselMode] = useState("purpose");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [slide, setSlide] = useState(0);
  const [panelTransitionReady, setPanelTransitionReady] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [activeFeature, setActiveFeature] = useState(null);
  const [futureVersionsOpen, setFutureVersionsOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    let active = true;
    getOfflinePreference("theme")
      .then((savedTheme) => {
        if (active && (savedTheme === "dark" || savedTheme === "light")) {
          setDark(savedTheme === "dark");
        }
      })
      .catch((error) => {
        console.error("Impossible de charger le thème depuis IndexedDB :", error);
      })
      .finally(() => {
        if (active) setThemeLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

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

   // Les annonces synchronisées restent accessibles lorsque le réseau disparaît.
   useEffect(() => {
     let active = true;
     let controller;

     const chargerAnnonces = async () => {
       controller?.abort();
       const requestController = new AbortController();
       controller = requestController;
       try {
         const cached = await getOfflineData("cache:annonces");
         if (active && !requestController.signal.aborted && Array.isArray(cached)) {
           const cachedSlides = cached.filter(
             (announcement) => announcement.showInCarousel === true,
           ).slice(0, MAX_CAROUSEL_SLIDES);
           setCarouselSlides(cachedSlides);
           cacheAnnouncementImages(cached);
         }

         if (!isOnline) {
           if (active && !Array.isArray(cached)) {
             await setOfflineData("cache:annonces", EVENTS_LOCAL);
           }
           return;
         }

         const res = await fetch(`${URL}/api/annonces`, {
           signal: requestController.signal,
           cache: "no-store",
         });
         if (!res.ok) throw new Error(`HTTP ${res.status}`);

         const data = await res.json();
         if (!Array.isArray(data)) {
           throw new Error("Format de réponse des annonces invalide.");
         }

         const slides = data.map((announcement) => ({
           ...announcement,
           titre: announcement.titre ?? announcement.title,
           dateEvent: announcement.dateEvent ?? announcement.date ?? announcement.freq,
         }));
         if (!active || requestController.signal.aborted) return;
         const carouselAnnouncements = slides.filter(
           (announcement) => announcement.showInCarousel === true,
         ).slice(0, MAX_CAROUSEL_SLIDES);
         setCarouselSlides(carouselAnnouncements);
         await setOfflineData("cache:annonces", slides);
         localStorage.setItem("annonces", JSON.stringify(slides));
         cacheAnnouncementImages(slides);
       } catch (error) {
         if (!requestController.signal.aborted) {
           console.error("Impossible de charger ou mettre en cache les annonces :", error);
         }
       }
     };

     const refreshWhenForegrounded = () => {
       if (document.visibilityState === "visible") chargerAnnonces();
     };

     chargerAnnonces();
     window.addEventListener("focus", refreshWhenForegrounded);
     document.addEventListener("visibilitychange", refreshWhenForegrounded);
     return () => {
       active = false;
       controller?.abort();
       window.removeEventListener("focus", refreshWhenForegrounded);
       document.removeEventListener("visibilitychange", refreshWhenForegrounded);
     };
   }, [isOnline]);

  useEffect(() => {
    if (!themeLoaded) return;
    localStorage.setItem("theme", dark ? "dark" : "light");
    setOfflinePreference("theme", dark ? "dark" : "light").catch((error) => {
      console.error("Impossible d’enregistrer le thème dans IndexedDB :", error);
    });
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark, themeLoaded]);

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

  const visibleSlides = carouselSlides.slice(0, MAX_CAROUSEL_SLIDES);
  const isPurposeMode = carouselMode === "purpose";
  const carouselSlideCount = Math.max(
    isPurposeMode ? PLATFORM_DEMOS.length : visibleSlides.length,
    1,
  );
  const activeCarouselSlideIndex = slide % carouselSlideCount;
  const activePlatformDemo = isPurposeMode ? PLATFORM_DEMOS[activeCarouselSlideIndex] : null;
  const activeAnnouncement = isPurposeMode ? null : visibleSlides[activeCarouselSlideIndex];

  useEffect(() => {
    setPanelTransitionReady(false);
    const frame = window.requestAnimationFrame(() => setPanelTransitionReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [carouselMode, carouselSlides, slide]);

  // Auto-advance carousel

  useEffect(() => {
    if (carouselSlideCount <= 1) return undefined;
    const t = setInterval(
      () => setSlide((current) => (current + 1) % carouselSlideCount),
      5000
    );
    return () => clearInterval(t);
  }, [carouselMode, carouselSlideCount]);

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
    if (Math.abs(diff) > 40 && carouselSlideCount > 1)
      setSlide((s) =>
        diff > 0
          ? (s + 1) % carouselSlideCount
          : (s - 1 + carouselSlideCount) % carouselSlideCount
      );
    touchStartX.current = null;
  };

  // Helper : navigate vers un onglet
  // "home" → "/"   |   les autres → "/<id>"
  const goTo = (id) => navigate(id === "home" ? "/" : `/${id}`);

  const renderHome = () => (
    <div className="home-dashboard">
      <section className="home-welcome" aria-label="Bienvenue">
        <span className="home-eyebrow">UNE COMMUNAUTÉ DE FOI</span>
        <h1>Bienvenue chez vous</h1>
        <p>Croître jusqu’à manifester Christ dans sa plénitude.</p>
      </section>

      <section
        className="home-hero"
        aria-label="Découvrir la plateforme et les annonces"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="home-hero-modes" role="tablist" aria-label="Choisir le contenu du carrousel">
          <button
            id="carousel-purpose-tab"
            className={`home-hero-mode${isPurposeMode ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={isPurposeMode}
            aria-controls="home-hero-panel"
            onClick={() => {
              setCarouselMode("purpose");
              setSlide(0);
            }}
          >
            But de la plateforme
          </button>
          <button
            id="carousel-announcements-tab"
            className={`home-hero-mode${!isPurposeMode ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={!isPurposeMode}
            aria-controls="home-hero-panel"
            onClick={() => {
              setCarouselMode("announcements");
              setSlide(0);
            }}
          >
            Annonces
          </button>
        </div>

        {isPurposeMode && activePlatformDemo ? (
          <article
            key={`platform-${activePlatformDemo.id}`}
            id="home-hero-panel"
            className={`home-hero-slide home-hero-intro is-active${panelTransitionReady ? " is-entered" : ""}`}
            role="tabpanel"
            aria-labelledby="carousel-purpose-tab"
          >
            <img className="home-hero-brand-watermark" src={logo} alt="" aria-hidden="true" />
            <div className="home-hero-intro-content">
              <div className="home-hero-intro-kicker">
                <span className="home-hero-intro-icon" aria-hidden="true">
                  <Icon name={activePlatformDemo.icon} size={27} color="#f0d68e" />
                </span>
                <span className="home-hero-intro-eyebrow">{activePlatformDemo.eyebrow}</span>
              </div>
              <h2>{activePlatformDemo.title}</h2>
              <p>{activePlatformDemo.description}</p>
              {activePlatformDemo.path ? (
                <button
                  className="home-hero-content-action"
                  type="button"
                  onClick={() => navigate(activePlatformDemo.path)}
                >
                  {activePlatformDemo.actionLabel}
                  <Icon name="chevronRight" size={17} color="#17233b" />
                </button>
              ) : (
                <a className="home-hero-content-action" href={activePlatformDemo.href}>
                  {activePlatformDemo.actionLabel}
                  <Icon name="phone" size={17} color="#17233b" />
                </a>
              )}
            </div>
            <span className="home-hero-intro-orbit" aria-hidden="true" />
          </article>
        ) : !isPurposeMode && activeAnnouncement ? (
          <article
            key={`announcement-${activeAnnouncement.id}`}
            id="home-hero-panel"
            className="home-hero-slide home-hero-announcement is-active"
            role="tabpanel"
            aria-labelledby="carousel-announcements-tab"
          >
            <img
              className="home-hero-announcement-image"
              src={getImageUrl(activeAnnouncement.image)}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = churchImage;
              }}
            />
            <div className="home-hero-announcement-shade" />
            <div className="home-hero-announcement-content">
              <span className="home-hero-intro-eyebrow">
                {activeAnnouncement.type || "ANNONCE"} · À LA UNE
              </span>
              <h2>{activeAnnouncement.title || activeAnnouncement.titre}</h2>
              <p className="home-hero-announcement-meta">
                {[activeAnnouncement.dateEvent || activeAnnouncement.date || activeAnnouncement.freq,
                  activeAnnouncement.lieu].filter(Boolean).join(" · ")}
              </p>
              {activeAnnouncement.orateur && (
                <div className="home-hero-speaker">
                  {activeAnnouncement.orateurImage ? (
                    <img
                      src={getImageUrl(activeAnnouncement.orateurImage)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="home-hero-speaker-initial" aria-hidden="true">
                      {activeAnnouncement.orateur.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>
                    <small>ORATEUR</small>
                    <strong>{activeAnnouncement.orateur}</strong>
                  </span>
                </div>
              )}
              <p className="home-hero-announcement-description">
                {(activeAnnouncement.contenu || "").slice(0, 150)}
                {(activeAnnouncement.contenu || "").length > 150 ? "…" : ""}
              </p>
              <button
                className="home-hero-content-action"
                type="button"
                onClick={() => navigate("/events")}
              >
                Découvrir l’annonce
                <Icon name="chevronRight" size={17} color="#17233b" />
              </button>
            </div>
          </article>
        ) : !isPurposeMode ? (
          <div
            id="home-hero-panel"
            className="home-hero-empty"
            role="tabpanel"
            aria-labelledby="carousel-announcements-tab"
            aria-live="polite"
          >
            <span className="home-hero-empty-icon" aria-hidden="true">
              <Icon name="calendar" size={27} color="#f0d68e" />
            </span>
            <span className="home-hero-intro-eyebrow">LES NOUVELLES DE L’ÉGLISE</span>
            <h2>Les prochaines annonces arrivent ici</h2>
            <p>Les annonces publiées et sélectionnées dans l’administration apparaîtront dans ce carrousel.</p>
            <button
              className="home-hero-content-action"
              type="button"
              onClick={() => navigate("/events")}
            >
              Voir tous les événements
              <Icon name="chevronRight" size={17} color="#17233b" />
            </button>
          </div>
        ) : null}

        {carouselSlideCount > 1 && (
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
                    setSlide((current) => (current + direction + carouselSlideCount) % carouselSlideCount)
                  }
                >
                  <Icon name={icon} size={18} color="#fff" />
                </button>
              ))}
            </div>
            <div className="home-hero-dots" aria-label="Sélectionner une diapositive">
              {Array.from({ length: carouselSlideCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${carouselMode === "purpose" ? "Fonction" : "Annonce"} ${index + 1}`}
                  aria-current={index === activeCarouselSlideIndex}
                  className={index === activeCarouselSlideIndex ? "is-active" : ""}
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

      <section className="home-section">
        <button
          type="button"
          className="home-section-heading"
          aria-expanded={futureVersionsOpen}
          aria-controls="future-versions-list"
          data-section="future-versions"
          onClick={() => setFutureVersionsOpen((open) => !open)}
          style={{
            width: "100%",
            border: 0,
            padding: 0,
            background: "transparent",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div>
            <span className="home-eyebrow">À VENIR</span>
            <h2>Nos futures versions</h2>
          </div>
          <span className="home-section-count">{String(FUTURE_FEATURES.length).padStart(2, "0")}</span>
        </button>
        {futureVersionsOpen && <div id="future-versions-list" className="home-feature-grid">
          {FUTURE_FEATURES.map((feature) => {
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
              </button>
            );
          })}
        </div>}
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
              <button
                type="button"
                className="home-news-card"
                key={news.id}
                onClick={() => setSelectedAnnouncement(news)}
                aria-label={`Afficher les détails : ${news.titre || news.title || "Actualité"}`}
              >
                <img
                  src={getImageUrl(news.image)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = imageLocal;
                  }}
                />
                <div className="home-news-copy">
                  <span>{news.type || news.contenu || "Actualité"}</span>
                  <h3>{news.titre || news.title}</h3>
                  <p>{news.dateEvent || "Église Glorieuse du Christ"}</p>
                </div>
                <Icon name="chevronRight" size={17} color={C.textSub} />
              </button>
            ))}
          </div>
        ) : (
          <p className="home-news-empty">Les actualités de l’église apparaîtront ici.</p>
        )}
      </section>
      <Footer dark={dark} />
      {selectedAnnouncement && (
        <AnnouncementDetails
          announcement={selectedAnnouncement}
          dark={dark}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </div>
  );

  return (
    <div
      className={`app-shell${hideLayout ? " app-shell-fullscreen" : ""}${location.pathname === "/admin" ? " app-shell-admin" : ""}`}
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
        className={`app-scroll${hideLayout ? " app-scroll-fullscreen" : ""}`}
  ref={scrollRef}
  onScroll={handleScroll}
  style={{
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: hideLayout ? 0 :
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
        {location.pathname !== "/admin" && location.pathname !== "/connexion" && !isOnline && (
          <div
            role="status"
            style={{
              padding: "10px 16px",
              background: dark ? "#3d3420" : "#fff3cd",
              color: dark ? "#f5e6b8" : "#664d03",
              textAlign: "center",
              fontSize: 13,
            }}
          >
            Mode hors connexion — les lectures et contenus enregistrés restent disponibles.
          </div>
        )}
        {/* ── Toute la navigation est gérée par React Router ── */}
        <Suspense fallback={<div className="screen-loading" role="status">Chargement…</div>}>
        <Routes>
          <Route path="/"        element={renderHome()} />
          <Route path="/bible"   element={<BibleScreen dark={dark} />} />
          {/* Ancienne fonctionnalité conservée : <Route path="/give" element={<GiveScreen dark={dark} />} /> */}
          <Route path="/give"    element={<ComingSoonScreen dark={dark} />} />
          <Route path="/profile" element={<ProfileScreen dark={dark} />} />
          <Route path="/events" element={<EventsPage dark={dark} />} />
          {/* Ancienne fonctionnalité conservée : <Route path="/inscription" element={<Inscription dark={dark} />} /> */}
          <Route path="/inscription" element={<ComingSoonScreen dark={dark} />} />
          <Route path="/connexion" element={<Navigate to="/admin" replace />} />
          {/* Ancienne fonctionnalité conservée : <Route path="/formations" element={<Formations dark={dark} />} /> */}
          <Route path="/formations" element={<ComingSoonScreen dark={dark} />} />
          <Route path="/live" element={<Lives dark={dark} />} />
          {/* Ancienne fonctionnalité conservée : <Route path="/prayer" element={<Prayer dark={dark} />} /> */}
          <Route path="/prayer" element={<ComingSoonScreen dark={dark} />} />
          <Route path="/LectureBible" element={<LectureBible dark={dark} />} />
          <Route path="/about" element={<About dark={dark} />} />
          {/* Ancienne fonctionnalité conservée : <Route path="/testimony" element={<Testimony dark={dark} />} /> */}
          <Route path="/testimony" element={<ComingSoonScreen dark={dark} />} />
          <Route path="/PlanDeLecture" element={<Plandelecture dark={dark} />} />
          <Route path="/plan-lecture-personnalise" element={<PersonalizedReadingPlan dark={dark} />} />
          <Route path="/Historique" element={<Historique dark={dark} />} />
          <Route path="/Rappel" element={<Rappel dark={dark} />} />
          <Route path="/encouragement" element={<Encouragement dark={dark} />} />
          <Route path="/localisation" element={<LocationMap dark={dark} />} />
          <Route path="/invitation" element={<Invitation dark={dark} />} />
          <Route path="/admin" element={<OnlineAdmin />} />
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