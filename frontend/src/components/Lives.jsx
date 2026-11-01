import { useEffect, useState } from "react";
import { API_URL } from "../services/apiConfig.js";
const VIDEOS_CACHE_KEY = "egc-live-videos";
const LIVE_CACHE_KEY = "egc-live-status";
const DEFAULT_CHANNEL_URL = "https://youtube.com/@egliseglorieuseduchrist";
const DEFAULT_LIVE_VIDEO_ID = import.meta.env.VITE_YOUTUBE_VIDEO_ID || "";
const FALLBACK_VIDEOS = [
  { id: "-L5muQwfe28", title: "Prédication du 1er dimanche du mois", sundayOfMonth: 1 },
  { id: "5e6qmOq2spA", title: "Prédication du 2e dimanche du mois", sundayOfMonth: 2 },
  { id: "_SN_Nf5rjBg", title: "Prédication du 3e dimanche du mois", sundayOfMonth: 3 },
  { id: "MHBnX57oivs", title: "Prédication du 4e dimanche du mois", sundayOfMonth: 4 },
];
const SUNDAY_LABELS = [
  "1er dimanche du mois",
  "2e dimanche du mois",
  "3e dimanche du mois",
  "4e dimanche du mois",
];

function readCache(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch (error) {
    console.error(`Unable to read ${key} cache:`, error);
    return fallback;
  }
}

export const Lives = ({ dark }) => {
  const cachedLive = readCache(LIVE_CACHE_KEY, null);
  const [live] = useState(
    cachedLive || (DEFAULT_LIVE_VIDEO_ID
      ? { actif: true, videoId: DEFAULT_LIVE_VIDEO_ID }
      : { actif: false, url: DEFAULT_CHANNEL_URL }),
  );
  const [videos, setVideos] = useState(() => {
    const cached = readCache(VIDEOS_CACHE_KEY, []);
    return Array.isArray(cached) && cached.length > 0 ? cached : FALLBACK_VIDEOS;
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videosLoading, setVideosLoading] = useState(() => videos.length === 0);
  const [videosError, setVideosError] = useState("");
  const liveVideoId = live?.videoId || (live?.url
    ? (() => {
      try {
        return new URL(live.url).searchParams.get("v");
      } catch (error) {
        console.error("Invalid cached live URL:", error);
        return null;
      }
    })()
    : null);
  const liveIsActive = Boolean(live?.actif && liveVideoId);
  const displayedVideo = liveVideoId
    ? { id: liveVideoId, title: "Direct de l’église" }
    : selectedVideo || videos[0] || null;

  const liveLoading = false;
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
  };
  const getSundayLabel = (video, index) =>
    SUNDAY_LABELS[(video.sundayOfMonth || index + 1) - 1] || SUNDAY_LABELS[index];

  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/videos`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data?.message || "Réponse vidéo invalide.");
        }
        if (cancelled) return;
        const latestVideos = data.slice(0, 4).map((video, index) => ({
          ...video,
          sundayOfMonth: video.sundayOfMonth || index + 1,
        }));
        setVideos(latestVideos);
        setSelectedVideo((current) => current || latestVideos[0] || null);
        localStorage.setItem(VIDEOS_CACHE_KEY, JSON.stringify(latestVideos));
        setVideosError("");
      } catch (error) {
        console.error("Impossible de charger les prédications du dimanche :", error);
        if (!cancelled) {
          setVideosError(
            "Connexion indisponible : les quatre dernières prédications sont affichées.",
          );
        }
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };

    loadVideos();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        padding:"40px 20px",
        textAlign:"center",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        minHeight:"60vh",
      }}
    >

      <h2
        style={{
          color:dark ? "#f0e6c8":"#173b70",
          fontSize:22,
          fontWeight:700
        }}
      >
        Live
      </h2>

      {liveLoading ? (
        <p>Recherche du direct…</p>
      ) : liveIsActive ? (
        <p style={{ color: "#b42318", fontWeight: 700 }}>🔴 Direct en cours</p>
      ) : (
        <p style={{ color: dark ? "#a1a1a6" : "#6e6e73" }}>
          Aucun direct n’est en cours pour le moment.
        </p>
      )}

      {!displayedVideo && (
        <a
          href={live?.url || DEFAULT_CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            color: dark ? "#e5c978" : "#173b70",
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          Ouvrir la chaîne YouTube
        </a>
      )}

      {displayedVideo && (
        <section style={{ width: "100%", maxWidth: 760, marginTop: 20 }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${displayedVideo.id}?playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
              title={displayedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="unsafe-url"
              loading="eager"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
                borderRadius: 14,
              }}
            />
          </div>
          <h3 style={{ color: dark ? "#f0e6c8" : "#173b70", textAlign: "left" }}>
            {displayedVideo.title}
          </h3>
        </section>
      )}
      <section style={{ width: "100%", maxWidth: 900, marginTop: 28 }}>
        <h3 style={{ color: dark ? "#f0e6c8" : "#173b70", marginBottom: 14 }}>
          Les prédications des 4 dimanches du mois
        </h3>
        {videosLoading ? (
          <p>Chargement des prédications…</p>
        ) : videos.length === 0 ? (
          <p style={{ color: dark ? "#a1a1a6" : "#6e6e73" }}>
            Aucune prédication récente n’a été trouvée.
          </p>
        ) : (
          <>
            {videosError && (
              <p role="alert" style={{ color: dark ? "#f0b4ad" : "#983e37" }}>
                {videosError}
              </p>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                gap: 12,
                textAlign: "left",
              }}
            >
              {videos.map((video, index) => {
                const active = !liveVideoId && selectedVideo?.id === video.id;
                const sundayLabel = getSundayLabel(video, index);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedVideo(video)}
                    aria-pressed={active}
                    style={{
                      padding: 8,
                      border: `2px solid ${active ? "#c9a84c" : "transparent"}`,
                      borderRadius: 12,
                      background: dark ? "#242426" : "#fff",
                      color: dark ? "#f0e6c8" : "#173b70",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", borderRadius: 8 }}
                    />
                    <strong style={{ display: "block", marginTop: 7 }}>{sundayLabel}</strong>
                    <span style={{ display: "block", marginTop: 5, fontSize: 13 }}>
                      {video.title}
                    </span>
                    {formatDate(video.date) && (
                      <span style={{ display: "block", marginTop: 5, fontSize: 12, opacity: 0.75 }}>
                        {formatDate(video.date)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
export const Prayer = ({ dark }) => {
  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        🙏
      </div>

      <h2
        style={{
          color: dark ? "#f0e6c8" : "#173b70",
          marginBottom: 8,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        Demande de priere
      </h2>

      <p
        style={{
          color: dark ? "#a1a1a6" : "#6e6e73",
          fontSize: 15,
          maxWidth: 450,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Cette fonctionnalité est actuellement en cours de développement.
        Elle permettra bientôt de faire des demandes de priere.
      </p>

      <div
        style={{
          marginTop: 24,
          padding: "16px 24px",
          borderRadius: 12,
          background: dark ? "#2c2c2e" : "#f0f4fb",
          borderLeft: "4px solid #c9a84c",
          maxWidth: 450,
        }}
      >
        <p
          style={{
            margin: 0,
            color: dark ? "#e0d5b8" : "#2c3e6b",
            fontSize: 14,
            fontStyle: "italic",
          }}
        >
          🚧 Cette section sera disponible dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  );
};