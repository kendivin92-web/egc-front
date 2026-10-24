
import {
  FaFacebook,
  FaTiktok,
  FaYoutube,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";

export default function Footer({ dark }) {
  const C = {
    bg: dark ? "#1c1c1e" : "#ffffff",
    card: dark ? "#14243a" : "#f5f5f7",
    text: dark ? "#f5f5f7" : "#173b70",
    sub: dark ? "#a1a1a6" : "#6e6e73",
    border: dark ? "#38383a" : "#d2d2d7",
    accent: "#c9a84c",
  };

  const socialStyle = {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: C.card,
    border: `1px solid ${C.border}`,
    color: C.sub,
    textDecoration: "none",
    transition: "all 0.2s ease",
  };

  const infoStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: C.sub,
    fontSize: 14,
  };

  return (
    <footer
      style={{
        background: C.bg,
        color: C.text,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 18px 20px",
        }}
      >
        {/* =====================================================
            CONTENU PRINCIPAL
        ===================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 30,
          }}
        >
          {/* ===================================================
              À PROPOS
          =================================================== */}

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              

              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                Église Glorieuse du Christ
              </h3>
            </div>

            <p
              style={{
                margin: "0 0 18px",
                color: C.sub,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Venez vivre la présence de Dieu avec nous.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={infoStyle}>
                <FaMapMarkerAlt
                  size={15}
                  color={C.accent}
                />
                <span>Brazzaville, Congo</span>
              </div>

              <div style={infoStyle}>
                <FaEnvelope
                  size={14}
                  color={C.accent}
                />
                <span>contact@egliseglorieuse.cd</span>
              </div>

              <div style={infoStyle}>
                <FaPhone
                  size={14}
                  color={C.accent}
                />
                <a
                  href="tel:+242067527474"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  +242 06 752 74 74
                </a>
              </div>
            </div>
          </div>

          {/* ===================================================
              RÉSEAUX SOCIAUX
          =================================================== */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 16,
                fontWeight: 700,
                color: C.text,
              }}
            >
              Suivez-nous
            </h3>

            <p
              style={{
                margin: "0 0 15px",
                fontSize: 13,
                color: C.sub,
              }}
            >
              Retrouvez-nous sur nos réseaux sociaux.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                style={socialStyle}
              >
                <FaFacebook size={19} />
              </a>

              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                style={socialStyle}
              >
                <FaTiktok size={19} />
              </a>

              {/* YouTube */}
              <a
                href="#"
                aria-label="YouTube"
                style={socialStyle}
              >
                <FaYoutube size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* =====================================================
            SÉPARATEUR
        ===================================================== */}

       


        
      </div>

      {/* =======================================================
          MOBILE
      ======================================================= */}

      <style>
        {`
          @media (max-width: 600px) {
            footer > div {
              padding: 26px 16px 18px !important;
            }

            footer h3 {
              letter-spacing: -0.2px;
            }
          }
        `}
      </style>
    </footer>
  );
}
