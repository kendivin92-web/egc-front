import { useState } from "react";

export default function About({ dark }) {
  const [openValue, setOpenValue] = useState(null);

  const C = {
    bg: dark ? "#1c1c1e" : "#ffffff",
    text: dark ? "#f5f5f7" : "#173b70",
    sub: dark ? "#a1a1a6" : "#6e6e73",
    border: dark ? "#38383a" : "#d2d2d7",
    accent: "#c9a84c",
  };

  const values = [
    {
      title: "La foi en Jésus-Christ",
      content:
        "Nous plaçons notre foi en Jésus-Christ au centre de notre vie. Nous croyons en sa Parole, en son œuvre et en la puissance de sa grâce pour transformer chaque personne.",
    },
    {
      title: "L'amour du prochain",
      content:
        "Nous sommes appelés à aimer, respecter et soutenir notre prochain. Nous voulons être une communauté où chacun est accueilli avec compassion, respect et bienveillance.",
    },
    {
      title: "La prière et la communion",
      content:
        "La prière et la communion fraternelle sont essentielles à notre vie spirituelle. Nous encourageons chacun à développer une relation profonde avec Dieu et avec les autres.",
    },
    {
      title: "Le service de Dieu",
      content:
        "Nous croyons que chaque personne possède des dons et des talents qu'elle peut mettre au service de Dieu et de son Église afin de contribuer à l'œuvre de Dieu.",
    },
  ];

  const toggleValue = (index) => {
    setOpenValue(openValue === index ? null : index);
  };

  return (
    <section
      style={{
        background: C.bg,
        color: C.text,
      }}
      className="min-h-screen"
    >
      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Introduction */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <h1 className="text-3xl md:text-5xl font-bold">
            À propos de l'Église Glorieuse du Christ
          </h1>

          <div
            className="w-20 h-1 mx-auto rounded"
            style={{ background: C.accent }}
          />

          <p style={{ color: C.sub }} className="text-base md:text-lg">
            L'Église Glorieuse du Christ est une communauté chrétienne
            fondée sur la foi en Jésus-Christ, l'amour de Dieu et la
            transformation des vies par la puissance de l'Évangile.
          </p>
        </div>

        {/* Contenu */}
        <div className="grid md:grid-cols-2 gap-10 mt-14">

          <div
            className="rounded-xl p-6 border"
            style={{ borderColor: C.border }}
          >
            <h2 className="text-2xl font-semibold mb-4">
              Notre mission
            </h2>

            <p style={{ color: C.sub }} className="leading-relaxed">
              Notre mission est de conduire chaque personne à découvrir
              l'amour de Dieu, à grandir dans la foi et à vivre une relation
              profonde avec Jésus-Christ. Nous œuvrons pour apporter
              l'espérance, la paix et la restauration aux familles et aux
              communautés.
            </p>
          </div>

          <div
            className="rounded-xl p-6 border"
            style={{ borderColor: C.border }}
          >
            <h2 className="text-2xl font-semibold mb-4">
              Notre vision
            </h2>

            <p style={{ color: C.sub }} className="leading-relaxed">
              Nous croyons en une Église vivante, engagée et remplie de
              l'Esprit de Dieu, où chacun peut trouver sa place, développer
              ses dons et participer à l'œuvre de Dieu dans le monde.
            </p>
          </div>

        </div>

        {/* Valeurs */}
        <div className="mt-14 text-center">

          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Nos valeurs
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">

            {values.map((value, index) => {
              const isOpen = openValue === index;

              return (
                <div
                  key={index}
                  className={`
                    rounded-lg border overflow-hidden
                    transition-all duration-300
                    ${isOpen ? "shadow-lg" : ""}
                  `}
                  style={{
                    borderColor: C.border,
                    background: dark ? "#12233a" : "#ffffff",
                  }}
                >

                  {/* Bouton */}
                  <button
                    type="button"
                    onClick={() => toggleValue(index)}
                    aria-expanded={isOpen}
                    className="
                      w-full p-5
                      flex items-center justify-between
                      gap-3 text-left
                      cursor-pointer
                      transition-colors duration-200
                    "
                  >
                    <span
                      style={{ color: C.accent }}
                      className="font-semibold"
                    >
                      {value.title}
                    </span>

                    <span
                      className={`
                        text-xl flex-shrink-0
                        transition-transform duration-300
                        ${isOpen ? "rotate-180" : ""}
                      `}
                      style={{ color: C.accent }}
                    >
                      ↓
                    </span>
                  </button>

                  {/* Contenu dépliable */}
                  <div
                    className={`
                      grid transition-all duration-300 ease-in-out
                      ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
                    `}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="px-5 pb-5 text-sm leading-relaxed text-left"
                        style={{ color: C.sub }}
                      >
                        {value.content}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        {/* Localisation */}
        <div className="mt-14 text-center">
          <p style={{ color: C.sub }}>
            📍 Brazzaville, République du Congo
          </p>
        </div>

      </div>
    </section>
  );
}