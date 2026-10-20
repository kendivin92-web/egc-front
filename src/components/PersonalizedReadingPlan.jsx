import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import bible from "../bible_segond_21_fr.json";

const THEMES = [
  {
    id: "amour",
    label: "Amour",
    description: "Découvrir l’amour de Dieu et apprendre à aimer les autres.",
    verses: [
      ["Jean", 15, 12],
      ["1 Corinthiens", 13, 4],
      ["Romains", 5, 8],
    ],
  },
  {
    id: "guerison",
    label: "Guérison",
    description: "Prier et trouver du réconfort dans les moments de fragilité.",
    verses: [
      ["Psaumes", 103, 3],
      ["Jacques", 5, 14],
      ["Esaïe", 53, 5],
    ],
  },
  {
    id: "espoir",
    label: "Espoir",
    description: "Garder confiance en l’avenir et dans les promesses de Dieu.",
    verses: [
      ["Romains", 15, 13],
      ["Jérémie", 29, 11],
      ["Esaïe", 40, 31],
    ],
  },
  {
    id: "peur",
    label: "Peur",
    description: "Se rappeler que Dieu accompagne et fortifie.",
    verses: [
      ["Esaïe", 41, 10],
      ["Psaumes", 23, 4],
      ["2 Timothée", 1, 7],
    ],
  },
  {
    id: "stress",
    label: "Stress",
    description: "Déposer ses préoccupations et retrouver du repos.",
    verses: [
      ["Matthieu", 11, 28],
      ["Philippiens", 4, 6],
      ["Psaumes", 55, 22],
    ],
  },
  {
    id: "perte",
    label: "Perte",
    description: "Trouver une consolation dans le deuil et les séparations.",
    verses: [
      ["Psaumes", 34, 18],
      ["Jean", 11, 25],
      ["Apocalypse", 21, 4],
    ],
  },
  {
    id: "joie",
    label: "Joie",
    description: "Nourrir la reconnaissance et la joie en Dieu.",
    verses: [
      ["Psaumes", 16, 11],
      ["Jean", 16, 22],
      ["Néhémie", 8, 10],
    ],
  },
  {
    id: "orgueil",
    label: "Orgueil",
    description: "Choisir l’humilité et rechercher la sagesse.",
    verses: [
      ["Proverbes", 16, 18],
      ["Jacques", 4, 6],
      ["Michée", 6, 8],
    ],
  },
  {
    id: "anxiete",
    label: "Anxiété",
    description: "Confier ses inquiétudes à Dieu, un jour à la fois.",
    verses: [
      ["Philippiens", 4, 6],
      ["1 Pierre", 5, 7],
      ["Matthieu", 6, 34],
    ],
  },
  {
    id: "colere",
    label: "Colère",
    description: "Faire place à la patience, à l’écoute et à la douceur.",
    verses: [
      ["Jacques", 1, 19],
      ["Ephésiens", 4, 26],
      ["Proverbes", 15, 1],
    ],
  },
  {
    id: "depression",
    label: "Dépression",
    description: "Lire des paroles de compassion et de consolation.",
    verses: [
      ["Psaumes", 42, 11],
      ["2 Corinthiens", 1, 3],
      ["Lamentations", 3, 22],
    ],
  },
  {
    id: "paix",
    label: "Paix",
    description: "S’ancrer dans la paix que Dieu donne.",
    verses: [
      ["Jean", 14, 27],
      ["Philippiens", 4, 7],
      ["Esaïe", 26, 3],
    ],
  },
  {
    id: "patience",
    label: "Patience",
    description: "Grandir dans la persévérance et la patience.",
    verses: [
      ["Romains", 12, 12],
      ["Galates", 5, 22],
      ["Jacques", 5, 7],
    ],
  },
  {
    id: "jalousie",
    label: "Jalousie",
    description: "Cultiver la paix intérieure et se réjouir du bien d’autrui.",
    verses: [
      ["Proverbes", 14, 30],
      ["1 Corinthiens", 13, 4],
      ["Galates", 5, 26],
    ],
  },
  {
    id: "tentation",
    label: "Tentation",
    description: "Chercher la force de résister et de choisir le bien.",
    verses: [
      ["1 Corinthiens", 10, 13],
      ["Jacques", 1, 12],
      ["Matthieu", 26, 41],
    ],
  },
  {
    id: "doute",
    label: "Doute",
    description: "Avancer avec ses questions et demander la sagesse.",
    verses: [
      ["Jacques", 1, 5],
      ["Marc", 9, 24],
      ["Jean", 20, 27],
    ],
  },
];

const BOOKS = bible.Testaments.flatMap((testament) => testament.Books);
const STORAGE_KEY = "egc_personalized_reading_progress";
const SELECTED_THEME_KEY = "egc_personalized_reading_theme";

function readCompletedVerses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => typeof item === "string") : [];
  } catch (error) {
    console.error("Impossible de lire la progression du plan personnalisé :", error);
    return [];
  }
}

function readSelectedTheme() {
  try {
    const saved = localStorage.getItem(SELECTED_THEME_KEY);
    return THEMES.some((theme) => theme.id === saved) ? saved : THEMES[0].id;
  } catch (error) {
    console.error("Impossible de lire le thème du plan personnalisé :", error);
    return THEMES[0].id;
  }
}

export default function PersonalizedReadingPlan({ dark }) {
  const [selectedThemeId, setSelectedThemeId] = useState(readSelectedTheme);
  const [completedVerses, setCompletedVerses] = useState(readCompletedVerses);
  const theme = THEMES.find((item) => item.id === selectedThemeId) || THEMES[0];

  const readings = useMemo(
    () =>
      theme.verses.map(([bookName, chapterNumber, verseNumber]) => {
        const book = BOOKS.find((item) => item.Text === bookName);
        const verse = book?.Chapters[chapterNumber - 1]?.Verses[verseNumber - 1];

        return {
          id: `${bookName} ${chapterNumber}:${verseNumber}`,
          text: verse?.Text || "",
        };
      }),
    [theme],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_THEME_KEY, selectedThemeId);
    } catch (error) {
      console.error("Impossible d’enregistrer le thème du plan personnalisé :", error);
    }
  }, [selectedThemeId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedVerses));
    } catch (error) {
      console.error("Impossible d’enregistrer la progression du plan personnalisé :", error);
    }
  }, [completedVerses]);

  const completedCount = readings.filter((reading) =>
    completedVerses.includes(reading.id),
  ).length;

  const toggleCompleted = (readingId) => {
    setCompletedVerses((current) =>
      current.includes(readingId)
        ? current.filter((item) => item !== readingId)
        : [...current, readingId],
    );
  };

  return (
    <main className={`personalized-plan${dark ? " is-dark" : ""}`}>
      <header className="personalized-plan-hero">
        <span className="personalized-plan-eyebrow">LECTURE GUIDÉE PAR THÈME</span>
        <h1>Votre plan de lecture personnalisé</h1>
        <p>
          Choisissez ce que vous traversez ou souhaitez approfondir. Chaque
          thème vous propose trois passages à lire à votre rythme.
        </p>
      </header>

      <Link className="personalized-plan-back" to="/bible">
        ← Retour à la rubrique Bible
      </Link>

      <section aria-labelledby="personalized-plan-themes">
        <div className="personalized-plan-section-heading">
          <div>
            <span className="personalized-plan-eyebrow">16 THÈMES</span>
            <h2 id="personalized-plan-themes">Que souhaitez-vous explorer ?</h2>
          </div>
        </div>
        <div className="personalized-plan-themes">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`personalized-plan-theme${item.id === selectedThemeId ? " is-selected" : ""}`}
              aria-pressed={item.id === selectedThemeId}
              onClick={() => setSelectedThemeId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="personalized-plan-readings" aria-live="polite">
        <div className="personalized-plan-section-heading">
          <div>
            <span className="personalized-plan-eyebrow">PARCOURS THÉMATIQUE</span>
            <h2>{theme.label}</h2>
            <p>{theme.description}</p>
          </div>
          <span className="personalized-plan-progress">
            {completedCount}/{readings.length} lus
          </span>
        </div>

        {readings.map((reading, index) => (
          <article
            key={reading.id}
            className={`personalized-plan-verse${completedVerses.includes(reading.id) ? " is-completed" : ""}`}
          >
            <div className="personalized-plan-verse-heading">
              <span>LECTURE {String(index + 1).padStart(2, "0")}</span>
              <strong>{reading.id}</strong>
            </div>
            <p>
              {reading.text || "Ce passage n’est pas disponible dans la Bible locale."}
            </p>
            <label className="personalized-plan-check">
              <input
                type="checkbox"
                checked={completedVerses.includes(reading.id)}
                onChange={() => toggleCompleted(reading.id)}
              />
              <span>Marquer comme lu</span>
            </label>
          </article>
        ))}
      </section>
    </main>
  );
}
