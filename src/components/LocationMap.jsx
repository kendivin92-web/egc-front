import churchImage from "../assets/church-location.jpg";

const CHURCHES = [
  {
    id: "brazzaville",
    city: "Brazzaville",
    title: "Église principale",
    landmark: "Dix Maisons, en face de la station",
    search: "Église Glorieuse du Christ Dix Maisons face station Brazzaville",
  },
  {
    id: "pointe-noire",
    city: "Pointe-Noire",
    title: "Église Glorieuse du Christ",
    landmark: "À côté de l'hôtel Elais",
    search: "Église Glorieuse du Christ à côté de l'hôtel Elais Pointe-Noire",
  },
  {
    id: "oyo",
    city: "Oyo",
    title: "Église Glorieuse du Christ",
    landmark: "Oyo, République du Congo",
    search: "Église Glorieuse du Christ Oyo République du Congo",
  },
];

export default function LocationMap({ dark }) {
  const colors = {
    background: dark ? "#242426" : "#ffffff",
    text: dark ? "#f5f5f7" : "#173b70",
    muted: dark ? "#a1a1a6" : "#6e6e73",
    border: dark ? "#38383a" : "#d2d2d7",
    page: dark ? "#1c1c1e" : "#f5f5f7",
  };

  return (
    <main
      style={{
        minHeight: "100%",
        padding: "24px 4px 100px",
        color: colors.text,
        background: colors.page,
      }}
    >
      <header style={{ margin: "0 auto 22px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>
          Trouver mon église
        </h1>
        <p style={{ color: colors.muted, lineHeight: 1.6, margin: 0 }}>
          Retrouvez les Églises Glorieuses du Christ et ouvrez leur emplacement
          dans Google Maps pour préparer votre itinéraire.
        </p>
      </header>

      <section
        aria-label="Emplacements des églises"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          gap: 14,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {CHURCHES.map((church) => {
          const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.search)}`;
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(church.search)}`;

          return (
            <article
              key={church.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: 20,
                borderRadius: 18,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                boxShadow: "0 4px 16px rgba(26,39,68,0.06)",
              }}
            >
              <img
                src={churchImage}
                alt={`Église Glorieuse du Christ à ${church.city}`}
                style={{
                  width: "100%",
                  height: 150,
                  marginBottom: 16,
                  borderRadius: 12,
                  objectFit: "cover",
                }}
              />
              <h2 style={{ fontSize: 19, margin: "0 0 4px" }}>
                {church.city}
              </h2>
              <p style={{ fontWeight: 700, margin: "0 0 8px" }}>
                {church.title}
              </p>
              <p
                style={{
                  color: colors.muted,
                  lineHeight: 1.5,
                  margin: "0 0 18px",
                  flex: 1,
                }}
              >
                {church.landmark}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ffffff",
                    background: "#173b70",
                    borderRadius: 10,
                    padding: "10px 13px",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Voir sur la carte
                </a>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: "10px 13px",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Itinéraire
                </a>
              </div>
            </article>
          );
        })}
      </section>
      <p
        style={{
          maxWidth: 900,
          margin: "16px auto 0",
          color: colors.muted,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Les liens ouvrent une recherche Google Maps à partir des repères
        indiqués. Pour afficher un point précis, les adresses ou coordonnées
        exactes de chaque église devront être confirmées.
      </p>
    </main>
  );
}
