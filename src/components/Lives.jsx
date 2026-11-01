import { useEffect, useState } from "react";
import { API_URL, YOUTUBE_CHANNEL_URL } from "../services/apiConfig";

const VIDEOS_CACHE_KEY = "egc-live-videos";
const LIVE_URL = `${YOUTUBE_CHANNEL_URL}/live`;

function readCachedVideos() {
  try {
    const videos = JSON.parse(localStorage.getItem(VIDEOS_CACHE_KEY) || "[]");
    return Array.isArray(videos) ? videos : [];
  } catch (error) {
    console.error("Impossible de lire les prédications en cache :", error);
    return [];
  }
}

export const Lives = ({ dark }) => {
  const [videos, setVideos] = useState(readCachedVideos);
  const [selectedVideo, setSelectedVideo] = useState(() => readCachedVideos()[0] || null);
  const [loading, setLoading] = useState(() => readCachedVideos().length === 0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/videos`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data?.message || "Réponse vidéo invalide.");
        }
        if (cancelled) return;
        setVideos(data);
        setSelectedVideo((current) => current || data[0] || null);
        localStorage.setItem(VIDEOS_CACHE_KEY, JSON.stringify(data));
        setOffline(false);
      } catch (error) {
        console.error("Impossible d’actualiser les prédications :", error);
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshVideos();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        padding: "32px 20px 48px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <h2 style={{ color: dark ? "#f0e6c8" : "#173b70", fontSize: 22, fontWeight: 700 }}>
        Direct de l&apos;église
      </h2>
      <p style={{ color: dark ? "#c0cad8" : "#6e6e73", maxWidth: 560 }}>
        Le direct YouTube nécessite une connexion. La Bible et les dernières
        prédications déjà téléchargées restent accessibles hors connexion.
      </p>

      <a
        href={LIVE_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          marginTop: 16,
          padding: "14px 28px",
          borderRadius: 12,
          background: "#c9a84c",
          color: "#fff",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ▶ Ouvrir le direct YouTube
      </a>

      {offline && (
        <p style={{ color: dark ? "#e5c978" : "#8a6d1d", marginTop: 18 }}>
          Hors connexion : affichage des dernières prédications enregistrées.
        </p>
      )}

      {loading && <p>Chargement des dernières prédications…</p>}

      {selectedVideo && (
        <section style={{ width: "100%", maxWidth: 760, marginTop: 24 }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.id}?playsinline=1&rel=0`}
              title={selectedVideo.title || "Prédication EGC"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
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
          <h3 style={{ color: dark ? "#f0e6c8" : "#173b70", marginTop: 14 }}>
            {selectedVideo.title}
          </h3>
        </section>
      )}

      {!loading && videos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {videos.map((video) => (
            <button
              type="button"
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #c9a84c",
                background: selectedVideo?.id === video.id ? "#c9a84c" : "transparent",
                color: selectedVideo?.id === video.id ? "#fff" : dark ? "#f0e6c8" : "#173b70",
              }}
            >
              {video.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Prayer = ({ dark }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", minHeight: "60vh" }}>
    <div style={{ fontSize: 64 }}>🙏</div>
    <h2 style={{ color: dark ? "#f0e6c8" : "#173b70" }}>Demande de prière</h2>
    <p style={{ color: dark ? "#a1a1a6" : "#6e6e73" }}>
      Cette fonctionnalité est actuellement en cours de développement.
    </p>
  </div>
);
