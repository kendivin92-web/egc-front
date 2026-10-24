import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

const API = import.meta.env.VITE_API_URL?.replace(/\/+$/, "")
  || (Capacitor.isNativePlatform() ? "" : "http://localhost:8080");
const DEFAULT_CHANNEL_URL = "https://youtube.com/@egliseglorieuseduchrist";

export const Lives = ({ dark }) => {
  const [live, setLive] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState("");

  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
  const CHANNEL_URL = import.meta.env.VITE_YOUTUBE_CHANNEL_URL || DEFAULT_CHANNEL_URL;

  const verifierDirect = useCallback(async () => {
    try {
      if (!API_KEY || !CHANNEL_ID) {
        setLive({ actif: false, url: CHANNEL_URL });
        return;
      }
      const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet` +
        `&channelId=${CHANNEL_ID}` +
        `&eventType=live` +
        `&type=video` +
        `&key=${API_KEY}`;


      const response = await fetch(url);
      if (!response.ok) throw new Error(`YouTube API HTTP ${response.status}`);
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        setLive({
          actif: true,
          url: `https://youtube.com/watch?v=${videoId}`,
        });
      } else {
        setLive({ actif: false, url: CHANNEL_URL });
      }
    } catch (error) {
      console.error("Unable to check the church YouTube live stream:", error);
      setLive({ actif: false, url: CHANNEL_URL });
    } finally {
      setLiveLoading(false);
    }
  }, [API_KEY, CHANNEL_ID, CHANNEL_URL]);

  useEffect(() => {
    let cancelled = false;
    const loadSundayVideos = async () => {
      setVideosLoading(true);
      setVideosError("");
      try {
        if (!API) {
          throw new Error(
            "L’adresse du serveur n’est pas configurée. Définissez VITE_API_URL, puis reconstruisez l’application Android.",
          );
        }
        const response = await fetch(`${API}/api/videos`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Impossible de charger les prédications.");
        }
        if (!Array.isArray(data)) throw new Error("Réponse des vidéos invalide.");
        if (!cancelled) {
          setVideos(data);
          setSelectedVideo((current) => current ?? data[0] ?? null);
        }
      } catch (error) {
        console.error("Unable to load Sunday sermons:", error);
        if (!cancelled) {
          setVideosError(
            error instanceof TypeError
              ? "Impossible de joindre le serveur vidéo. Vérifiez l’adresse VITE_API_URL et que capacitor://localhost est autorisé dans PUBLIC_ORIGINS."
              : error instanceof Error
                ? error.message
                : "Les vidéos sont momentanément indisponibles.",
          );
        }
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };
    loadSundayVideos();
    const initialCheck = setTimeout(verifierDirect, 0);
    const timer = setInterval(verifierDirect, 300000);
    return () => {
      cancelled = true;
      clearTimeout(initialCheck);
      clearInterval(timer);
    };
  }, [verifierDirect]);

  const liveVideoId = live?.actif
    ? new URL(live.url).searchParams.get("v")
    : null;
  const displayedVideo = liveVideoId
    ? { id: liveVideoId, title: "Direct de l’église" }
    : selectedVideo;
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
  };

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

      <div style={{fontSize:64}}>
        🎥
      </div>


      <h2
        style={{
          color:dark ? "#f0e6c8":"#173b70",
          fontSize:22,
          fontWeight:700
        }}
      >
        Direct et prédications
      </h2>

      {liveLoading ? (
        <p>Recherche du direct…</p>
      ) : live?.actif ? (
        <p style={{ color: "#b42318", fontWeight: 700 }}>🔴 Direct en cours</p>
      ) : (
        <p style={{ color: dark ? "#a1a1a6" : "#6e6e73" }}>
          Aucun direct n’est en cours pour le moment.
        </p>
      )}

      <p
        style={{
          maxWidth: 440,
          marginTop: 12,
          color: dark ? "#a1a1a6" : "#6e6e73",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Regardez le direct ou retrouvez les prédications des quatre derniers dimanches, sans quitter l’application.
      </p>
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
        <h3 style={{ color: dark ? "#f0e6c8" : "#173b70" }}>
          Prédications des quatre derniers dimanches
        </h3>
        {videosLoading ? (
          <p>Chargement des prédications…</p>
        ) : videosError ? (
          <p role="alert" style={{ color: dark ? "#f0b4ad" : "#983e37" }}>{videosError}</p>
        ) : videos.length === 0 ? (
          <p style={{ color: dark ? "#a1a1a6" : "#6e6e73" }}>
            Aucune prédication récente n’a été trouvée.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
              gap: 12,
              textAlign: "left",
            }}
          >
            {videos.map((video) => {
              const active = !liveVideoId && selectedVideo?.id === video.id;
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
                  <strong style={{ display: "block", marginTop: 7 }}>{video.title}</strong>
                  <span style={{ display: "block", marginTop: 5, fontSize: 12, opacity: 0.75 }}>
                    {formatDate(video.date)}
                  </span>
                </button>
              );
            })}
          </div>
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