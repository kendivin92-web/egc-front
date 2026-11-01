import { useState } from "react";
import { useLocation } from "react-router-dom";
import { API_URL } from "../services/apiConfig.js";
import churchImage from "../assets/egc-worship.jpg";
import imageLocal from "../assets/1234.jpg";

const API = API_URL;
const DEFAULT_EVENTS = [
  {
    id: "local-sunday-service",
    type: "Culte",
    title: "Culte du dimanche",
    contenu: "ÉGLISE GLORIEUSE DU CHRIST",
    lieu: "Église",
    freq: "09:00",
    image: churchImage,
  },
  {
    id: "local-worship",
    type: "Culte",
    title: "Ensemble dans la louange",
    contenu: "VIE DE L’ÉGLISE",
    lieu: "Église",
    freq: "Chaque dimanche à 09:00",
    image: imageLocal,
  },
];

export default function EventsPage({ dark }) {
const location = useLocation();
const [EVENTS] = useState(() => {
  try {
    const cached = JSON.parse(localStorage.getItem("annonces") || "[]");
    return Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_EVENTS;
  } catch (error) {
    console.error("Unable to read cached church announcements:", error);
    return DEFAULT_EVENTS;
  }
});
const C = {
  bg: dark ? "#1c1c1e" : "#f5f5f7",
  card: dark ? "#242426" : "#ffffff",
  cardAlt: dark ? "#2c2c2e" : "#f5f5f7",
  primary: "#173b70",
  accent: "#c9a84c",
  text: dark ? "#f5f5f7" : "#173b70",
  textSub: dark ? "#a1a1a6" : "#6e6e73",
  border: dark ? "#38383a" : "#d2d2d7",
};
const CATEGORIES = [
  
  { key: "tous", label: "Tous", emoji: "🔮" },
  
  { key: "Culte", label: "Culte", emoji: "☀️" },
  
  { key: "Formation", label: "Formation", emoji: "📖" },

  { key: "Séminaire", label: "Séminaire", emoji: "🎤" },
  
  { key: "Prière", label: "Prière", emoji: "🤲" },
  
  { key: "Spéciaux", label: "Spéciaux", emoji: "🎉" },
  
  { key: "Retraite", label: "Retraite", emoji: "🏕️" },
  
];
  
  const [activeCat, setActiveCat] = useState("tous");
  
  const [selectedEvent, setSelectedEvent] = useState(location.state?.event || null);


  
  const filteredEvents = activeCat === "tous" ? EVENTS : EVENTS.filter(e => e.type === activeCat);
  
  return (
  
    <div
  style={{
    background: C.bg,
    minHeight: "100%",
    padding: 16,
  }}
>
  
      {/* ══════════ FILTRES ══════════ */}
  
      <section className="max-w-6xl mx-auto mt-6 mb-10">
  
  <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold mb-4">
  
    Filtrer par catégorie
  
  </p>
  
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2">
  
    {CATEGORIES.map(cat => (
  
      <button
  
        key={cat.key}
  
        onClick={() => setActiveCat(cat.key)}
  
        className={`cat-btn flex flex-col items-center gap-1.5 border rounded-2xl py-3 px-2 text-stone-400  transition-all duration-200 ${
  
          activeCat === cat.key
  
            ? "active border-ink bg-ink text-cream"
  
            : "hover:border-gold hover:text-gold"
  
        }`}
  
      >
  
        <span className="text-xl">{cat.emoji}</span>
  
        <span className="text-xs font-semibold text-center leading-tight">
  
          {cat.label}
  
        </span>
  
        <span
  
          className={`dot w-1.5 h-1.5 rounded-full ${
  
            activeCat === cat.key ? "bg-gold-warm" : "bg-stone-300"
  
          }`}
  
        ></span>
  
      </button>
  
    ))}
  
  </div>
  
</section>
  

  
      {/* ══════════ BARRE DE RÉSULTATS ══════════ */}
  
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
  
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-400">
  
          {activeCat === "tous"
  
            ? "Tous les événements"
  
            : CATEGORIES.find(c => c.key === activeCat)?.label}
  
        </h2>
  
        <span className="text-sm font-semibold bg-stone-900 text-yellow-400 rounded-full px-4 py-1.5">
  
          {filteredEvents.length} 
  
        </span>
  
      </div>
  

  
      {/* ══════════ GRILLE DES CARTES ══════════ */}
  
      <main className="max-w-6xl mx-auto pb-16">
  
        {filteredEvents.length === 0 ? (
  
          <div className="text-center py-20">
  
            <p className="text-5xl mb-4">🕊️</p>
  
            <p className="font-display text-2xl text-stone-400">
  
              Aucun événement dans cette catégorie
  
            </p>
  
          </div>
  
        ) : (
  
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
  
            {filteredEvents.map(event => (
  
              <article
  
                key={event.id}
  
                className="event-card bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg"
  
                onClick={() => setSelectedEvent(event)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                    keyboardEvent.preventDefault();
                    setSelectedEvent(event);
                  }
                }}
                role="button"
                tabIndex={0}
  
              >
  
                <div className="relative h-52 overflow-hidden">
  
                  {event.image && (
                    <img
                      src={event.image?.startsWith("http") || event.image?.includes("/assets/")
                        ? event.image
                        : `${API}/${event.image?.replace(/^\/+/, "")}`}
                      alt={event.title}
                      className="w-full h-full object-cover card-img"
                    />
                  )}
  
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
  
                  <span className="absolute bottom-3 left-4 text-xs font-bold text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
  
                    {event.type}
  
                  </span>
  
                </div>
  
                <div className="p-5">
  
                  <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
  
                    {event.title}
  
                  </h3>
  
                  <p className="text-sm text-stone-500 leading-relaxed">
  
                    {event.contenu.length > 80
  
                      ? event.contenu.slice(0, 80) + "..."
  
                      : event.contenu}
  
                  </p>
  
                </div>
  
              </article>
  
            ))}
  
          </div>
  
        )}
  
      </main>
  

  
      {/* ══════════ MODAL ══════════ */}
  
      {selectedEvent && (
  
        <div
  
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  
          onClick={e => {
  
            if (e.target === e.currentTarget) setSelectedEvent(null);
  
          }}
  
        >
  
          <div className="bg-white rounded-3xl overflow-hidden w-[92%] max-w-md shadow-2xl">
  
            <div className="relative h-52 overflow-hidden">
  
              {selectedEvent.image && (
                <img
                  src={selectedEvent.image?.startsWith("http") || selectedEvent.image?.includes("/assets/")
                    ? selectedEvent.image
                    : `${API}/${selectedEvent.image?.replace(/^\/+/, "")}`}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
              )}
  
              <div className=""></div>
  
              <button
  
                onClick={() => setSelectedEvent(null)}
  
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white text-lg flex items-center justify-center hover:bg-black/60 transition"
  
              >
  
                ✕
  
              </button>
  
              <span className="absolute bottom-3 left-4 text-xs font-bold text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
  
                {selectedEvent.type}
  
              </span>
  
            </div>
  
            <div className="p-6">
  
              <h3 className="font-display text-2xl font-bold text-stone-900 mb-2">
  
                {selectedEvent.title}
  
              </h3>
  
              <p className="text-sm text-stone-500 leading-relaxed mb-5">
  
                {selectedEvent.contenu}
  
              </p>
  
              <div className="grid grid-cols-2 gap-3">
  
                <div className="bg-stone-50 rounded-xl p-3">
  
                  <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">
  
                    Date
  
                  </p>
  
                  <p className="text-sm font-semibold text-stone-700">
  
                    {selectedEvent.date || selectedEvent.dateEvent || "À confirmer"}
  
                  </p>
  
                </div>
  
                <div className="bg-stone-50 rounded-xl p-3">
  
                  <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">
  
                    Lieu
  
                  </p>
  
                  <p className="text-sm font-semibold text-stone-700">
  
                    {selectedEvent.lieu}
  
                  </p>
  
                </div>
  
                <div className="bg-amber-50 rounded-xl p-3 col-span-2">
  
                  <p className="text-xs text-amber-600 mb-1 uppercase tracking-wide">
  
                    Heure
  
                  </p>
  
                  <p className="text-sm font-semibold text-amber-800">
  
                    {selectedEvent.freq || selectedEvent.heure || "À confirmer"}
  
                  </p>
  
                </div>
                
  
              </div>
  
            </div>
  
          </div>
  
        </div>
  
      )}
  
    </div>
  
  );
  
}
