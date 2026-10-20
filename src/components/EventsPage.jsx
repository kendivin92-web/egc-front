import { useState , useEffect } from "react";

//pour les envenement
  const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function EventsPage({ dark }) {
const [EVENTS,setEVENTS] = useState([]);
const [eventsUnavailable, setEventsUnavailable] = useState(false);
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
   // Récupérer les annonces depuis le serveur
    useEffect(() => {
      const fetchFideles = async () => {
        try {
          const token = localStorage.getItem("token");console.log("TOKEN =", token);
          const res = await fetch(`${API}/api/annonces`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error("Réponse d’annonces invalide.");
          setEVENTS(data);
          setEventsUnavailable(false);
         
        } catch (error) {
          console.error("Unable to load church announcements:", error);
          setEventsUnavailable(true);
         
        } 
      };
      fetchFideles();
    }, []);
  
 /* const EVENTS = [
  
  { id: 1, type: "culte",  title: "Culte du dimanche", freq: "Hebdomadaire", date: "2026-05-10", lieu: "10 maison", contenu: "venez vivre une presence divine avec nous", img: API+"/uploads/1778046247872.png" },
  
  { id: 2, type: "formation", emoji: "📚", title: "Étude Biblique", freq: "Hebdomadaire", date: "Vendredi soir", lieu: "Salle d'étude", contenu: "Exploration approfondie des Écritures avec discussion interactive et application pratique pour la vie quotidienne.", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80" },
  
  { id: 3, type: "priere", emoji: "🙌", title: "Réunion de Prière", freq: "Hebdomadaire", date: "Mardi 19h00", lieu: "Sanctuaire", contenu: "Intercession collective pour la nation, l'église, les familles et les besoins personnels des membres.", img: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=80" },
  
  // ... ajoute tous les autres événements ici
  
];*/
  

  
const CATEGORIES = [
  
  { key: "tous", label: "Tous", emoji: "🔮" },
  
  { key: "Culte", label: "Culte", emoji: "☀️" },
  
  { key: "Formation", label: "Formation", emoji: "📖" },
  
  { key: "Prière", label: "Prière", emoji: "🤲" },
  
  { key: "Spéciaux", label: "Spéciaux", emoji: "🎉" },
  
  { key: "Retraite", label: "Retraite", emoji: "🏕️" },
  
];
  
  const [activeCat, setActiveCat] = useState("tous");
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  

  
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
  
              {eventsUnavailable
                ? "Les événements ne sont pas disponibles pour le moment. Réessayez plus tard."
                : "Aucun événement dans cette catégorie"}
  
            </p>
  
          </div>
  
        ) : (
  
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
  
            {filteredEvents.map(event => (
  
              <div
  
                key={event.id}
  
                className="event-card bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg"
  
                onClick={() => setSelectedEvent(event)}
  
              >
  
                <div className="relative h-52 overflow-hidden">
  
                  <img
  
                    src={API + event.image}
  
                    alt={event.title}
  
                    className="w-full h-full object-cover card-img"
  
                  />
  
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
  
              </div>
  
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
  
              <img
  
                src={API + selectedEvent.image}
  
                alt={selectedEvent.title}
  
                className="w-full h-full object-cover"
  
              />
  
              <div className=""></div>
  
              <button
  
                onClick={() => setSelectedEvent(null)}
  
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white text-lg flex items-center justify-center hover:bg-black/60 transition"
  
              >
  
                ✕
  
              </button>
  
              <span className="absolute bottom-3 left-4 text-xs font-bold text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
  
                {selectedEvent.type} {selectedEvent.cat}
  
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
  
                    {selectedEvent.dateEvent}
  
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
  
                    {selectedEvent.heure}
  
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



