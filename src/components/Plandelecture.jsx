import { useEffect, useMemo, useState } from "react";
import {
  History,
  Bell,
  Check,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import planLecture from "../plan_lecture.json";
import bible from "../bible_segond_21_fr.json";

// ============================================================
// OUTILS BIBLE
// ============================================================

/**
 * Normalise un texte pour faciliter les comparaisons.
 *
 * Exemple :
 * "Genèse"     -> "genese"
 * "GENÈSE"     -> "genese"
 * "  Psaumes "  -> "psaumes"
 */
function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Supprime les espaces et accents.
 *
 * Utile pour comparer les noms de livres.
 */
function normalizeBookName(value = "") {
  return normalizeText(value)
    .replace(/\s+/g, "");
}

/**
 * Récupère tous les livres de la Bible.
 *
 * Structure attendue :
 *
 * {
 *   Testaments: [
 *     {
 *       Books: [
 *         {
 *           Text: "Genèse",
 *           Chapters: [...]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
function getAllBooks() {
  const books = [];

  for (const testament of bible?.Testaments || []) {
    for (const book of testament?.Books || []) {
      books.push(book);
    }
  }

  return books;
}

/**
 * Récupère le nom réel du livre.
 *
 * IMPORTANT :
 * Le code Dart fourni utilise :
 *
 * book['Text']
 *
 * On donne donc priorité à Text.
 */
function getBookName(book) {
  return (
    book?.Text ||
    book?.Name ||
    book?.name ||
    book?.Title ||
    book?.title ||
    book?.Abbreviation ||
    book?.abbreviation ||
    ""
  );
}

// Cache des livres.
// Cela évite de reconstruire la liste à chaque recherche.
const ALL_BOOKS = getAllBooks();

// ============================================================
// ALIAS DE LIVRES
// ============================================================

/**
 * Quelques alias pratiques.
 *
 * Le Dart original précise lui-même qu'un système d'alias
 * serait nécessaire pour gérer des références comme "Ps".
 */
const BOOK_ALIASES = {
  ps: "Psaumes",
  psaume: "Psaumes",

  mt: "Matthieu",
  mat: "Matthieu",

  mc: "Marc",

  lc: "Luc",

  jn: "Jean",
  jean: "Jean",

  ac: "Actes",

  rm: "Romains",
  ro: "Romains",

  "1co": "1 Corinthiens",
  "2co": "2 Corinthiens",

  "1cor": "1 Corinthiens",
  "2cor": "2 Corinthiens",

  ga: "Galates",

  ep: "Éphésiens",

  ph: "Philippiens",

  col: "Colossiens",

  "1th": "1 Thessaloniciens",
  "2th": "2 Thessaloniciens",

  "1ti": "1 Timothée",
  "2ti": "2 Timothée",

  tt: "Tite",

  phm: "Philémon",

  he: "Hébreux",

  jaq: "Jacques",
  jac: "Jacques",

  "1pi": "1 Pierre",
  "2pi": "2 Pierre",

  "1jn": "1 Jean",
  "2jn": "2 Jean",
  "3jn": "3 Jean",

  jd: "Jude",

  ap: "Apocalypse",
};

// ============================================================
// RECHERCHE DU LIVRE
// ============================================================

/**
 * Trouve le livre correspondant au début d'une référence.
 *
 * Exemple :
 *
 * "Genèse 1-3"
 *
 * retourne le livre "Genèse".
 *
 * On trie les livres du plus long au plus court pour éviter
 * qu'un nom court soit trouvé avant un nom plus précis.
 */
function findBookFromReading(reading) {
  const normalizedReading = normalizeBookName(reading);

  const books = ALL_BOOKS
    .map((book) => ({
      book,
      name: getBookName(book),
    }))
    .filter((item) => item.name)
    .sort(
      (a, b) =>
        normalizeBookName(b.name).length -
        normalizeBookName(a.name).length
    );

  // ----------------------------------------------------------
  // RECHERCHE NORMALE
  // ----------------------------------------------------------

  const directMatch = books.find((item) =>
    normalizedReading.startsWith(
      normalizeBookName(item.name)
    )
  );

  if (directMatch) {
    return directMatch;
  }

  // ----------------------------------------------------------
  // RECHERCHE PAR ALIAS
  // ----------------------------------------------------------

  const firstPart = normalizeText(reading)
    .split(/\s+/)
    .slice(0, 2)
    .join("");

  const alias = BOOK_ALIASES[firstPart];

  if (alias) {
    const normalizedAlias =
      normalizeBookName(alias);

    const aliasMatch = books.find(
      (item) =>
        normalizeBookName(item.name) ===
        normalizedAlias
    );

    if (aliasMatch) {
      return aliasMatch;
    }
  }

  return null;
}

// ============================================================
// PARSING D'UNE RÉFÉRENCE
// ============================================================

/**
 * Parse une référence biblique.
 *
 * Formats supportés :
 *
 * Genèse
 * Genèse 1
 * Genèse 1-3
 *
 * Genèse 1:1
 * Genèse 1:1-10
 *
 * Psaumes 119 verset 1-57
 * Psaumes 119 verset 117 à la fin
 *
 * 1 Jean 5:10
 *
 * 2 Jean et 3 Jean
 */
function parseReading(reading) {
  if (!reading) {
    return [];
  }

  const cleanReading = String(reading).trim();

  if (!cleanReading) {
    return [];
  }

  // ==========================================================
  // PLUSIEURS RÉFÉRENCES AVEC "ET"
  // ==========================================================

  if (/\s+et\s+/i.test(cleanReading)) {
    const parts = cleanReading.split(
      /\s+et\s+/i
    );

    return parts.flatMap((part) =>
      parseReading(part.trim())
    );
  }

  // ==========================================================
  // RECHERCHE DU LIVRE
  // ==========================================================

  const found =
    findBookFromReading(cleanReading);

  if (!found) {
    console.warn(
      "Livre biblique introuvable :",
      cleanReading
    );

    return [];
  }

  const book = found.book;
  const bookName = found.name;

  const chapters =
    book?.Chapters || [];

  // ==========================================================
  // RETIRE LE NOM DU LIVRE
  // ==========================================================

  /**
   * On retire uniquement le nom réel du livre.
   *
   * Exemple :
   *
   * Genèse 1-3
   *
   * devient :
   *
   * 1-3
   */
  let remaining =
    cleanReading
      .slice(bookName.length)
      .trim();

  // ==========================================================
  // SI LE LIVRE EST SEUL
  // ==========================================================

  /**
   * Jude
   * Philémon
   *
   * Dans ce cas, on lit tout le livre.
   */
  if (!remaining) {
    return extractChapters(
      book,
      bookName,
      1,
      chapters.length
    );
  }

  // ==========================================================
  // NETTOYAGE
  // ==========================================================

  remaining = remaining
    .replace(/^:\s*/, "")
    .trim();

  // ==========================================================
  // FORMAT :
  //
  // Psaumes 119 verset 1-57
  // Psaumes 119 versets 1-57
  // ==========================================================

  const verboseVerseMatch =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (verboseVerseMatch) {
    const chapterNumber =
      Number(verboseVerseMatch[1]);

    const startVerse =
      Number(verboseVerseMatch[2]);

    const endValue =
      verboseVerseMatch[3];

    let endVerse;

    if (
      normalizeText(endValue) ===
      "la fin"
    ) {
      endVerse = getLastVerseNumber(
        chapters,
        chapterNumber
      );
    } else {
      endVerse = Number(endValue);
    }

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      startVerse,
      endVerse
    );
  }

  // ==========================================================
  // FORMAT :
  //
  // Psaumes 119 verset 1
  // ==========================================================

  const singleVerboseVerseMatch =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)$/i
    );

  if (singleVerboseVerseMatch) {
    const chapterNumber =
      Number(singleVerboseVerseMatch[1]);

    const verseNumber =
      Number(singleVerboseVerseMatch[2]);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      verseNumber,
      verseNumber
    );
  }

  // ==========================================================
  // FORMAT BIBLIQUE STANDARD :
  //
  // Genèse 1:1
  // Genèse 1:1-10
  // Genèse 1:1 à 10
  // ==========================================================

  const colonMatch =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (colonMatch) {
    const chapterNumber =
      Number(colonMatch[1]);

    const startVerse =
      Number(colonMatch[2]);

    const endValue =
      colonMatch[3];

    let endVerse;

    if (
      normalizeText(endValue) ===
      "la fin"
    ) {
      endVerse = getLastVerseNumber(
        chapters,
        chapterNumber
      );
    } else {
      endVerse = Number(endValue);
    }

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      startVerse,
      endVerse
    );
  }

  // ==========================================================
  // FORMAT :
  //
  // Genèse 1:1
  // ==========================================================

  const singleColonMatch =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)$/
    );

  if (singleColonMatch) {
    const chapterNumber =
      Number(singleColonMatch[1]);

    const verseNumber =
      Number(singleColonMatch[2]);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      verseNumber,
      verseNumber
    );
  }

  // ==========================================================
  // FORMAT :
  //
  // Genèse 1-3
  // Genèse 1
  // ==========================================================

  const chapterMatch =
    remaining.match(
      /^(\d+)(?:\s*-\s*(\d+))?$/
    );

  if (chapterMatch) {
    const startChapter =
      Number(chapterMatch[1]);

    const endChapter =
      chapterMatch[2]
        ? Number(chapterMatch[2])
        : startChapter;

    return extractChapters(
      book,
      bookName,
      startChapter,
      endChapter
    );
  }

  // ==========================================================
  // CAS PARTICULIER :
  //
  // "Jude 1"
  // ==========================================================

  console.warn(
    "Référence biblique non reconnue :",
    cleanReading
  );

  return [];
}

// ============================================================
// EXTRACTION DES CHAPITRES
// ============================================================

function extractChapters(
  book,
  bookName,
  startChapter,
  endChapter
) {
  const result = [];

  const chapters =
    book?.Chapters || [];

  // Protection contre les valeurs invalides.
  if (
    startChapter < 1 ||
    endChapter < startChapter
  ) {
    return [];
  }

  for (
    let chapterNumber = startChapter;
    chapterNumber <= endChapter;
    chapterNumber++
  ) {
    const chapter =
      chapters[chapterNumber - 1];

    if (!chapter) {
      continue;
    }

    const verses =
      chapter?.Verses || [];

    for (const verse of verses) {
      /**
       * IMPORTANT :
       *
       * Le Dart utilise :
       *
       * final int verseId =
       *   (verse['ID'] as int?) ?? 1;
       *
       * On reprend donc exactement cette logique.
       */
      const verseId =
        Number.isFinite(
          Number(verse?.ID)
        )
          ? Number(verse.ID)
          : 1;

      result.push({
        book: bookName,
        chapter: chapterNumber,
        verse: verseId,
        text: verse?.Text || "",
      });
    }
  }

  return result;
}

// ============================================================
// EXTRACTION DE VERSETS
// ============================================================

function extractVerses(
  book,
  bookName,
  chapterNumber,
  startVerse,
  endVerse
) {
  const chapters =
    book?.Chapters || [];

  const chapter =
    chapters[chapterNumber - 1];

  if (!chapter) {
    console.warn(
      "Chapitre introuvable :",
      chapterNumber
    );

    return [];
  }

  const verses =
    chapter?.Verses || [];

  if (!verses.length) {
    return [];
  }

  const result = [];

  for (const verse of verses) {
    const verseId =
      Number.isFinite(
        Number(verse?.ID)
      )
        ? Number(verse.ID)
        : 1;

    if (
      verseId >= startVerse &&
      verseId <= endVerse
    ) {
      result.push({
        book: bookName,
        chapter: chapterNumber,
        verse: verseId,
        text: verse?.Text || "",
      });
    }
  }

  return result;
}

// ============================================================
// DERNIER NUMÉRO DE VERSET
// ============================================================

function getLastVerseNumber(
  chapters,
  chapterNumber
) {
  const chapter =
    chapters[chapterNumber - 1];

  const verses =
    chapter?.Verses || [];

  if (!verses.length) {
    return 0;
  }

  const lastVerse =
    verses[verses.length - 1];

  return Number(lastVerse?.ID) ||
    verses.length;
}

// ============================================================
// COMPOSANT
// ============================================================

function Plandelecture({ dark }) {
  const total =
    planLecture?.length || 0;

  const [jourActuel, setJourActuel] =
    useState(1);

  const [matinLu, setMatinLu] =
    useState(false);

  const [soirLu, setSoirLu] =
    useState(false);

  const [lectureOuverte, setLectureOuverte] =
    useState(null);

  const [versets, setVersets] =
    useState([]);

  const [historique, setHistorique] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

useEffect(() => {
  function handlePopState() {
    setLectureOuverte(null);
    setVersets([]);
  }

  window.addEventListener(
    "popstate",
    handlePopState
  );

  return () => {
    window.removeEventListener(
      "popstate",
      handlePopState
    );
  };
}, []);

  // ==========================================================
  // JOUR ACTUEL
  // ==========================================================

  const jour = useMemo(() => {
    return (
      planLecture.find(
        (item) =>
          Number(item?.id_jour) ===
          Number(jourActuel)
      ) || {
        id_jour: jourActuel,
        matin: "",
        soir: "",
      }
    );
  }, [jourActuel]);

  // ==========================================================
  // POURCENTAGE
  // ==========================================================

  const pourcentage =
    total > 0
      ? Math.min(
          100,
          ((jourActuel - 1) /
            total) *
            100
        ).toFixed(1)
      : "0.0";

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      let sqliteProgression = null;
      let sqliteHistorique = null;

      // ======================================================
      // TENTATIVE SQLITE
      // ======================================================

      try {
        const databaseModule =
          await import(
            "../services/database.js"
          );

        // ----------------------------------------------------
        // PROGRESSION
        // ----------------------------------------------------

        if (
          typeof databaseModule?.getProgression ===
          "function"
        ) {
          try {
            sqliteProgression =
              await databaseModule.getProgression();
          } catch (error) {
            console.warn(
              "Lecture progression SQLite impossible :",
              error
            );
          }
        }

        // ----------------------------------------------------
        // HISTORIQUE
        // ----------------------------------------------------

        if (
          typeof databaseModule?.getHistorique ===
          "function"
        ) {
          try {
            sqliteHistorique =
              await databaseModule.getHistorique();
          } catch (error) {
            console.warn(
              "Lecture historique SQLite impossible :",
              error
            );
          }
        }
      } catch (error) {
        console.warn(
          "Service database indisponible :",
          error
        );
      }

      if (!mounted) {
        return;
      }

      // ======================================================
      // PROGRESSION
      // ======================================================

      if (sqliteProgression) {
        setJourActuel(
          Number(
            sqliteProgression.jour_actuel
          ) || 1
        );

        setMatinLu(
          Boolean(
            sqliteProgression.matin_lu
          )
        );

        setSoirLu(
          Boolean(
            sqliteProgression.soir_lu
          )
        );
      } else {
        // ----------------------------------------------------
        // FALLBACK LOCALSTORAGE
        // ----------------------------------------------------

        try {
          const saved =
            localStorage.getItem(
              "plan_lecture_progression"
            );

          if (saved) {
            const data =
              JSON.parse(saved);

            setJourActuel(
              Number(
                data?.jourActuel
              ) || 1
            );

            setMatinLu(
              Boolean(
                data?.matinLu
              )
            );

            setSoirLu(
              Boolean(
                data?.soirLu
              )
            );
          }
        } catch (error) {
          console.warn(
            "Progression locale invalide :",
            error
          );
        }
      }

      // ======================================================
      // HISTORIQUE
      // ======================================================

      if (
        Array.isArray(
          sqliteHistorique
        )
      ) {
        setHistorique(
          sqliteHistorique
        );
      } else {
        try {
          const savedHistory =
            localStorage.getItem(
              "plan_lecture_historique"
            );

          if (savedHistory) {
            const localHistory =
              JSON.parse(
                savedHistory
              );

            if (
              Array.isArray(
                localHistory
              )
            ) {
              setHistorique(
                localHistory
              );
            }
          }
        } catch (error) {
          console.warn(
            "Historique local invalide :",
            error
          );
        }
      }

      setLoading(false);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // SAUVEGARDER PROGRESSION
  // ==========================================================

  async function sauvegarderProgression(
    nouveauJour,
    nouveauMatin,
    nouveauSoir
  ) {
    const data = {
      jourActuel:
        nouveauJour,

      matinLu:
        nouveauMatin,

      soirLu:
        nouveauSoir,
    };

    // --------------------------------------------------------
    // LOCALSTORAGE
    // --------------------------------------------------------

    try {
      localStorage.setItem(
        "plan_lecture_progression",
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn(
        "Impossible de sauvegarder localement :",
        error
      );
    }

    // --------------------------------------------------------
    // SQLITE
    // --------------------------------------------------------

    try {
      const databaseModule =
        await import(
          "../services/database.js"
        );

      if (
        typeof databaseModule?.saveProgression ===
        "function"
      ) {
        await databaseModule.saveProgression(
          nouveauJour,
          nouveauMatin,
          nouveauSoir
        );
      }
    } catch (error) {
      console.warn(
        "SQLite sauvegarde progression indisponible :",
        error
      );
    }
  }

  // ==========================================================
  // MATIN
  // ==========================================================

  async function changerMatin(value) {
    setMatinLu(value);

    await sauvegarderProgression(
      jourActuel,
      value,
      soirLu
    );
  }

  // ==========================================================
  // SOIR
  // ==========================================================

  async function changerSoir(value) {
    setSoirLu(value);

    await sauvegarderProgression(
      jourActuel,
      matinLu,
      value
    );
  }

  // ==========================================================
  // OUVRIR UNE LECTURE
  // ==========================================================
function ouvrirLecture(type) {
  const reference =
    type === "matin"
      ? jour?.matin
      : jour?.soir;

  console.log(
    "Ouverture lecture :",
    reference
  );

  // Ajouter une nouvelle entrée dans l'historique
  window.history.pushState(
    {
      page: "lecture",
      type,
    },
    "",
    window.location.href
  );

  if (!reference) {
    setVersets([]);
    setLectureOuverte(type);
    return;
  }

  const result = parseReading(reference);

  console.log(
    "Référence :",
    reference
  );

  console.log(
    "Versets trouvés :",
    result.length
  );

  if (result.length > 0) {
    console.log(
      "Premier verset :",
      result[0]
    );
  }

  setVersets(result);
  setLectureOuverte(type);
}

  
  // ==========================================================
  // TERMINER LE JOUR
  // ==========================================================

  async function terminerJour() {
    if (
      !matinLu ||
      !soirLu
    ) {
      return;
    }

    const dateCompletion =
      new Date().toISOString();

    const historiqueItem = {
      jour: jourActuel,
      matin_lu: 1,
      soir_lu: 1,
      date_completion:
        dateCompletion,
    };

    // --------------------------------------------------------
    // HISTORIQUE LOCAL
    // --------------------------------------------------------

    const nouveauHistorique = [
      ...historique.filter(
        (item) =>
          Number(item?.jour) !==
          Number(jourActuel)
      ),
      historiqueItem,
    ].sort(
      (a, b) =>
        Number(a?.jour || 0) -
        Number(b?.jour || 0)
    );

    setHistorique(
      nouveauHistorique
    );

    try {
      localStorage.setItem(
        "plan_lecture_historique",
        JSON.stringify(
          nouveauHistorique
        )
      );
    } catch (error) {
      console.warn(
        "Impossible de sauvegarder l'historique local :",
        error
      );
    }

    // --------------------------------------------------------
    // SQLITE
    // --------------------------------------------------------

    try {
      const databaseModule =
        await import(
          "../services/database.js"
        );

      if (
        typeof databaseModule?.saveHistorique ===
        "function"
      ) {
        await databaseModule.saveHistorique(
          jourActuel,
          1,
          1,
          dateCompletion
        );
      }
    } catch (error) {
      console.warn(
        "SQLite historique indisponible :",
        error
      );
    }

    // --------------------------------------------------------
    // DERNIER JOUR
    // --------------------------------------------------------

    if (
      jourActuel >= total
    ) {
      await sauvegarderProgression(
        total,
        true,
        true
      );

      return;
    }

    // --------------------------------------------------------
    // JOUR SUIVANT
    // --------------------------------------------------------

    const nouveauJour =
      jourActuel + 1;

    setJourActuel(
      nouveauJour
    );

    setMatinLu(false);
    setSoirLu(false);

    await sauvegarderProgression(
      nouveauJour,
      false,
      false
    );
  }

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark
            ? "#101c2e"
            : "#ffffff",
          color: dark
            ? "#f0e6c8"
            : "#173b70",
        }}
      >
        Chargement...
      </div>
    );
  }

  // ==========================================================
  // PAGE DE LECTURE
  // ==========================================================

  if (lectureOuverte) {
    const reference =
      lectureOuverte === "matin"
        ? jour?.matin
        : jour?.soir;

    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "30px 20px",
          background: dark
            ? "#101c2e"
            : "#ffffff",
          color: dark
            ? "#f0e6c8"
            : "#173b70",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
          }}
        >

          {/* CARTE */}

          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: dark
                ? "#16243a"
                : "#ffffff",
              border: dark
                ? "1px solid #2c3e6b"
                : "1px solid #e1e7f0",
              boxShadow: dark
                ? "0 5px 20px rgba(0,0,0,0.25)"
                : "0 5px 20px rgba(26,39,68,0.08)",
            }}
          >
            {/* TYPE */}

            <div
              style={{
                color: "#c9a84c",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {lectureOuverte ===
              "matin"
                ? "Lecture du matin"
                : "Lecture du soir"}
            </div>

            {/* RÉFÉRENCE */}

            <h2
              style={{
                margin: "0 0 25px",
                fontSize: 23,
                color: dark
                  ? "#f0e6c8"
                  : "#173b70",
              }}
            >
              {reference}
            </h2>

            {/* AUCUN VERSET */}

            {versets.length ===
            0 ? (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: dark
                    ? "#2c2c2e"
                    : "#f0f4fb",
                  color: dark
                    ? "#a1a1a6"
                    : "#6e6e73",
                }}
              >
                Aucun verset
                trouvé pour cette
                référence.

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                  }}
                >
                  Référence analysée :
                  <br />
                  <strong>
                    {reference}
                  </strong>

                  <br />
                  <br />

                  Vérifie que le nom
                  du livre correspond
                  bien au champ{" "}
                  <strong>
                    Text
                  </strong>{" "}
                  de ton fichier
                  bible_segond_21_fr.json.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {versets.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.book}-${item.chapter}-${item.verse}-${index}`}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      {/* NUMÉRO */}

                      <span
                        style={{
                          flexShrink: 0,
                          minWidth: 32,
                          height: 32,
                          borderRadius: 8,
                          background:
                            dark
                              ? "#2c2c2e"
                              : "#f0f4fb",
                          color:
                            "#c9a84c",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {item.verse}
                      </span>

                      {/* TEXTE */}

                      <p
                        style={{
                          margin: 0,
                          color: dark
                            ? "#f0e6c8"
                            : "#173b70",
                          fontSize: 16,
                          lineHeight: 1.75,
                        }}
                      >
                        {item.text}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // INTERFACE PRINCIPALE
  // ==========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: dark
          ? "#101c2e"
          : "#ffffff",
        color: dark
          ? "#f0e6c8"
          : "#173b70",
        transition:
          "all 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            TITRE
        ================================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 22,
          }}
        >
          <h1
            style={{
              margin: 0,
              color: dark
                ? "#f0e6c8"
                : "#173b70",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Psaumes 119:105
          </h1>

          <p
            style={{
              margin: "6px auto 0",
              color: dark
                ? "#a1a1a6"
                : "#6e6e73",
              fontSize: 12.5,
              lineHeight: 1.5,
              maxWidth: 500,
            }}
          >
            « Ta parole est une
            lampe à mes pieds,
            et une lumière sur
            mon sentier. »
          </p>
        </div>

        {/* ==================================================
            PROGRESSION
        ================================================== */}

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: dark
              ? "#2c2c2e"
              : "#f0f4fb",
            border: dark
              ? "1px solid #2c3e6b"
              : "1px solid #e1e7f0",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                color: dark
                  ? "#a1a1a6"
                  : "#6e6e73",
                fontSize: 14,
              }}
            >
              Progression
            </span>

            <strong
              style={{
                color: dark
                  ? "#f0e6c8"
                  : "#173b70",
              }}
            >
              {jourActuel} /{" "}
              {total}
            </strong>
          </div>

          <div
            style={{
              width: "100%",
              height: 10,
              background: dark
                ? "#31425d"
                : "#dce4f0",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pourcentage}%`,
                height: "100%",
                background:
                  "#c9a84c",
                borderRadius: 20,
                transition:
                  "width 0.4s ease",
              }}
            />
          </div>

          <p
            style={{
              margin: "10px 0 0",
              color: dark
                ? "#a1a1a6"
                : "#6e6e73",
              fontSize: 13,
            }}
          >
            {pourcentage}% du plan
            terminé
          </p>
        </div>

        {/* ==================================================
            JOUR
        ================================================== */}

        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background: dark
              ? "#16243a"
              : "#ffffff",
            border: dark
              ? "1px solid #2c3e6b"
              : "1px solid #e1e7f0",
            boxShadow: dark
              ? "0 5px 20px rgba(0,0,0,0.25)"
              : "0 5px 20px rgba(26,39,68,0.08)",
            marginBottom: 20,
          }}
        >
          {/* HEADER */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              marginBottom: 25,
            }}
          >
            <div>
              <div
                style={{
                  color: "#c9a84c",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  marginBottom: 5,
                }}
              >
                Plan de lecture
              </div>

              <h2
                style={{
                  margin: 0,
                  color: dark
                    ? "#f0e6c8"
                    : "#173b70",
                  fontSize: 24,
                }}
              >
                Jour{" "}
                {jourActuel}
              </h2>
            </div>

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: dark
                  ? "#2c2c2e"
                  : "#f0f4fb",
                border:
                  "1px solid #c9a84c",
                color: "#c9a84c",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontWeight: 700,
              }}
            >
              {jourActuel}
            </div>
          </div>

          {/* ==================================================
              MATIN
          ================================================== */}

          {jour.matin && (
            <div
              onClick={() =>
                ouvrirLecture("matin")
              }
              style={{
                padding: 17,
                borderRadius: 14,
                marginBottom: 12,
                border: dark
                  ? "1px solid #2c3e6b"
                  : "1px solid #e1e7f0",
                background: dark
                  ? "#2c2c2e"
                  : "#f5f5f7",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#c9a84c",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    MATIN
                  </div>

                  <div
                    style={{
                      color: dark
                        ? "#f0e6c8"
                        : "#173b70",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {jour.matin}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={matinLu}
                  onChange={(e) =>
                    changerMatin(
                      e.target.checked
                    )
                  }
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  style={{
                    width: 20,
                    height: 20,
                    accentColor:
                      "#c9a84c",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          )}

          {/* ==================================================
              SOIR
          ================================================== */}

          {jour.soir && (
            <div
              onClick={() =>
                ouvrirLecture("soir")
              }
              style={{
                padding: 17,
                borderRadius: 14,
                marginBottom: 25,
                border: dark
                  ? "1px solid #2c3e6b"
                  : "1px solid #e1e7f0",
                background: dark
                  ? "#2c2c2e"
                  : "#f5f5f7",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#c9a84c",
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    SOIR
                  </div>

                  <div
                    style={{
                      color: dark
                        ? "#f0e6c8"
                        : "#173b70",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {jour.soir}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={soirLu}
                  onChange={(e) =>
                    changerSoir(
                      e.target.checked
                    )
                  }
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  style={{
                    width: 20,
                    height: 20,
                    accentColor:
                      "#c9a84c",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          )}

          {/* ==================================================
              TERMINER
          ================================================== */}

          <button
            onClick={terminerJour}
            disabled={
              !matinLu ||
              !soirLu
            }
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "none",
              background:
                matinLu && soirLu
                  ? "#c9a84c"
                  : dark
                  ? "#2c3e6b"
                  : "#173b70",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor:
                matinLu && soirLu
                  ? "pointer"
                  : "not-allowed",
              opacity:
                matinLu && soirLu
                  ? 1
                  : 0.75,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: 8,
            }}
          >
            {matinLu && soirLu ? (
              <>

                {jourActuel >=
                total
                  ? "Plan terminé"
                  : "Marquer comme terminé"}

              </>
            ) : (
              "Marquer comme terminé"
            )}
          </button>
        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 12,
          }}
        >
          <Link
            to="/Historique"
            style={{
              padding: 15,
              borderRadius: 12,
              border: dark
                ? "1px solid #2c3e6b"
                : "1px solid #dce4f0",
              background: dark
                ? "#16243a"
                : "#ffffff",
              color: dark
                ? "#f0e6c8"
                : "#173b70",
              fontWeight: 600,
              display: "flex",
              justifyContent:
                "center",
              alignItems: "center",
              gap: 8,
              textDecoration:
                "none",
            }}
          >
            <History size={18} />
            Historique
          </Link>

          <Link
            to="/Rappel"
            style={{
              padding: 15,
              borderRadius: 12,
              border: dark
                ? "1px solid #2c3e6b"
                : "1px solid #dce4f0",
              background: dark
                ? "#16243a"
                : "#ffffff",
              color: dark
                ? "#f0e6c8"
                : "#173b70",
              fontWeight: 600,
              display: "flex",
              justifyContent:
                "center",
              alignItems: "center",
              gap: 8,
              textDecoration:
                "none",
            }}
          >
            <Bell size={18} />
            Rappel
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Plandelecture;