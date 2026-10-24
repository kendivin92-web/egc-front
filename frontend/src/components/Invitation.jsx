export default function Invitation({ dark }) {
  const configuredDownloadUrl = import.meta.env.VITE_APP_DOWNLOAD_URL?.trim();
  const downloadUrl = configuredDownloadUrl || window.location.origin;
  const invitationMessage = configuredDownloadUrl
    ? `Bonjour ! Je t'invite à découvrir l'application de l'Église Glorieuse du Christ (EGC). Télécharge-la ici : ${downloadUrl}`
    : `Bonjour ! Je t'invite à découvrir l'application de l'Église Glorieuse du Christ (EGC). Retrouve-la ici : ${downloadUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(invitationMessage)}`;

  const colors = {
    background: dark ? "#242426" : "#ffffff",
    text: dark ? "#f5f5f7" : "#173b70",
    muted: dark ? "#a1a1a6" : "#6e6e73",
    border: dark ? "#38383a" : "#d2d2d7",
  };

  return (
    <main
      style={{
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: "24px 8px 100px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 24,
          borderRadius: 20,
          background: colors.background,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(26,39,68,0.08)",
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 44, marginBottom: 12 }}>
          💬
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>
          Invitez vos proches
        </h1>
        <p style={{ color: colors.muted, lineHeight: 1.6, margin: "0 0 20px" }}>
          Partagez l’application EGC avec vos contacts. WhatsApp s’ouvrira avec
          un message prêt à envoyer ; vous pourrez choisir le contact ou le
          groupe.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            padding: "0 20px",
            borderRadius: 12,
            background: "#25D366",
            color: "#ffffff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Inviter via WhatsApp
        </a>
        <a
          href="/app-egc.apk"
          download="EGC.apk"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            margin: "12px 0 0",
            padding: "0 20px",
            borderRadius: 12,
            background: "#173b70",
            color: "#ffffff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Télécharger l’application Android
        </a>
        <p
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.5,
            margin: "18px 0 0",
            overflowWrap: "anywhere",
          }}
        >
          Lien partagé : {downloadUrl}
        </p>
      </section>
    </main>
  );
}
