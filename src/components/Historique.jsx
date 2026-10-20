import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import planLecture from "../plan_lecture.json";
import bible from "../bible_segond_21_fr.json";

// ============================================================
// CONFIGURATION
// ============================================================

const TOTAL_JOURS = 334;

// ============================================================
// OUTILS BIBLE
// ============================================================

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeBookName(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function getAllBooks() {
  const books = [];

  for (const testament of bible?.Testaments || []) {
    for (const book of testament?.Books || []) {
      books.push(book);
    }
  }

  return books;
}

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

const ALL_BOOKS = getAllBooks();

// ============================================================
// ALIAS
// ============================================================

const BOOK_ALIASES = {
  gen: "Genèse",
  ge: "Genèse",

  ex: "Exode",

  lv: "Lévitique",

  nb: "Nombres",

  dt: "Deutéronome",

  jos: "Josué",

  jg: "Juges",

  rt: "Ruth",

  "1s": "1 Samuel",
  "2s": "2 Samuel",

  "1r": "1 Rois",
  "2r": "2 Rois",

  "1ch": "1 Chroniques",
  "2ch": "2 Chroniques",

  esd: "Esdras",

  ne: "Néhémie",

  est: "Esther",

  job: "Job",

  ps: "Psaumes",
  psaume: "Psaumes",

  pr: "Proverbes",

  ec: "Ecclésiaste",

  ca: "Cantique des cantiques",

  es: "Ésaïe",

  esai: "Ésaïe",

  jr: "Jérémie",

  lm: "Lamentations",

  ez: "Ézéchiel",

  da: "Daniel",

  os: "Osée",

  jl: "Joël",

  am: "Amos",

  abd: "Abdias",

  jon: "Jonas",

  mi: "Michée",

  na: "Nahum",

  ha: "Habacuc",

  so: "Sophonie",

  ag: "Aggée",

  za: "Zacharie",

  ml: "Malachie",

  mt: "Matthieu",
  mat: "Matthieu",

  mc: "Marc",

  lc: "Luc",

  lu: "Luc",

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

  ja: "Jacques",
  jac: "Jacques",
  jaq: "Jacques",

  "1pi": "1 Pierre",
  "2pi": "2 Pierre",

  "1p": "1 Pierre",
  "2p": "2 Pierre",

  "1jn": "1 Jean",
  "2jn": "2 Jean",
  "3jn": "3 Jean",

  jd: "Jude",

  ap: "Apocalypse",
};

// ============================================================
// RECHERCHE DU LIVRE
// ============================================================

function findBookFromReading(reading) {
  const normalizedReading =
    normalizeBookName(reading);

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

  const directMatch = books.find((item) =>
    normalizedReading.startsWith(
      normalizeBookName(item.name)
    )
  );

  if (directMatch) {
    return directMatch;
  }

  const words = normalizeText(reading).split(/\s+/);

  for (
    let length = Math.min(3, words.length);
    length >= 1;
    length--
  ) {
    const firstPart = words
      .slice(0, length)
      .join("");

    const alias = BOOK_ALIASES[firstPart];

    if (!alias) {
      continue;
    }

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
// DERNIER VERSET
// ============================================================

function getLastVerseNumber(chapters, chapterNumber) {
  const chapter =
    chapters[chapterNumber - 1];

  const verses =
    chapter?.Verses || [];

  if (!verses.length) {
    return 0;
  }

  const lastVerse =
    verses[verses.length - 1];

  return (
    Number(lastVerse?.ID) ||
    verses.length
  );
}

// ============================================================
// EXTRAIRE DES CHAPITRES
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
      const verseId =
        Number.isFinite(Number(verse?.ID))
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
// EXTRAIRE DES VERSETS
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
    return [];
  }

  const verses =
    chapter?.Verses || [];

  const result = [];

  for (const verse of verses) {
    const verseId =
      Number.isFinite(Number(verse?.ID))
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
// PARSER DE RÉFÉRENCE BIBLIQUE
// ============================================================

function parseReading(reading) {
  if (!reading) {
    return [];
  }

  const cleanReading =
    String(reading).trim();

  if (!cleanReading) {
    return [];
  }

  // ----------------------------------------------------------
  // PLUSIEURS RÉFÉRENCES
  // ----------------------------------------------------------

  if (/\s+et\s+/i.test(cleanReading)) {
    const parts =
      cleanReading.split(
        /\s+et\s+/i
      );

    return parts.flatMap((part) =>
      parseReading(part.trim())
    );
  }

  // ----------------------------------------------------------
  // LIVRE
  // ----------------------------------------------------------

  const found =
    findBookFromReading(
      cleanReading
    );

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

  // ----------------------------------------------------------
  // RETIRER LE NOM DU LIVRE
  // ----------------------------------------------------------

  let remaining = "";

  const directBookName =
    normalizeBookName(bookName);

  const normalizedReading =
    normalizeBookName(cleanReading);

  if (
    normalizedReading.startsWith(
      directBookName
    )
  ) {
    remaining =
      cleanReading
        .slice(bookName.length)
        .trim();
  } else {
    const words =
      normalizeText(cleanReading)
        .split(/\s+/);

    let aliasFound = null;

    for (
      let length = Math.min(
        3,
        words.length
      );
      length >= 1;
      length--
    ) {
      const possibleAlias =
        words
          .slice(0, length)
          .join("");

      if (
        BOOK_ALIASES[
          possibleAlias
        ]
      ) {
        aliasFound =
          words
            .slice(0, length)
            .join(" ");

        break;
      }
    }

    if (aliasFound) {
      remaining =
        cleanReading
          .slice(
            aliasFound.length
          )
          .trim();
    } else {
      remaining =
        cleanReading
          .slice(bookName.length)
          .trim();
    }
  }

  // ----------------------------------------------------------
  // LIVRE COMPLET
  // ----------------------------------------------------------

  if (!remaining) {
    return extractChapters(
      book,
      bookName,
      1,
      chapters.length
    );
  }

  remaining = remaining
    .replace(/^:\s*/, "")
    .trim();

  // ----------------------------------------------------------
  // VERSETS VERBEUX
  // ----------------------------------------------------------

  const verboseRange =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (verboseRange) {
    const chapterNumber =
      Number(verboseRange[1]);

    const startVerse =
      Number(verboseRange[2]);

    const endValue =
      verboseRange[3];

    const endVerse =
      normalizeText(endValue) ===
      "la fin"
        ? getLastVerseNumber(
            chapters,
            chapterNumber
          )
        : Number(endValue);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      startVerse,
      endVerse
    );
  }

  // ----------------------------------------------------------
  // VERSET UNIQUE VERBEUX
  // ----------------------------------------------------------

  const verboseSingle =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)$/i
    );

  if (verboseSingle) {
    const chapterNumber =
      Number(verboseSingle[1]);

    const verseNumber =
      Number(verboseSingle[2]);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      verseNumber,
      verseNumber
    );
  }

  // ----------------------------------------------------------
  // CHAPITRE : VERSET - VERSET
  // ----------------------------------------------------------

  const colonRange =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (colonRange) {
    const chapterNumber =
      Number(colonRange[1]);

    const startVerse =
      Number(colonRange[2]);

    const endValue =
      colonRange[3];

    const endVerse =
      normalizeText(endValue) ===
      "la fin"
        ? getLastVerseNumber(
            chapters,
            chapterNumber
          )
        : Number(endValue);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      startVerse,
      endVerse
    );
  }

  // ----------------------------------------------------------
  // CHAPITRE : VERSET
  // ----------------------------------------------------------

  const colonSingle =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)$/
    );

  if (colonSingle) {
    const chapterNumber =
      Number(colonSingle[1]);

    const verseNumber =
      Number(colonSingle[2]);

    return extractVerses(
      book,
      bookName,
      chapterNumber,
      verseNumber,
      verseNumber
    );
  }

  // ----------------------------------------------------------
  // CHAPITRE OU PLAGE DE CHAPITRES
  // ----------------------------------------------------------

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

  console.warn(
    "Référence biblique non reconnue :",
    cleanReading
  );

  return [];
}

// ============================================================
// COMPOSANT HISTORIQUE
// ============================================================

function Historique({ dark }) {
  const navigate = useNavigate();

  const [historique, setHistorique] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [jourSelectionne, setJourSelectionne] =
    useState(null);

  const [lectureOuverte, setLectureOuverte] =
    useState(null);

  const [versets, setVersets] =
    useState([]);

  const [reinitialisationEnCours, setReinitialisationEnCours] =
    useState(false);

  // ==========================================================
  // CHARGER HISTORIQUE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function charger() {
      let sqliteHistorique = null;

      // ------------------------------------------------------
      // SQLITE
      // ------------------------------------------------------

      try {
        const databaseModule =
          await import(
            "../services/database.js"
          );

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

      // ------------------------------------------------------
      // SQLITE
      // ------------------------------------------------------

      if (
        Array.isArray(
          sqliteHistorique
        )
      ) {
        setHistorique(
          sqliteHistorique
        );

        setLoading(false);

        return;
      }

      // ------------------------------------------------------
      // LOCAL STORAGE
      // ------------------------------------------------------

      try {
        const saved =
          localStorage.getItem(
            "plan_lecture_historique"
          );

        if (saved) {
          const data =
            JSON.parse(saved);

          if (Array.isArray(data)) {
            setHistorique(data);
          }
        }
      } catch (error) {
        console.warn(
          "Historique local invalide :",
          error
        );
      }

      setLoading(false);
    }

    charger();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // JOURS DÉJÀ LUS
  // ==========================================================

  const joursLus = useMemo(() => {
    const ids = new Set();

    for (const item of historique) {
      const jour =
        Number(item?.jour);

      if (
        Number.isFinite(jour) &&
        jour >= 1 &&
        jour <= TOTAL_JOURS
      ) {
        ids.add(jour);
      }
    }

    // IMPORTANT :
    // ordre croissant : 1, 2, 3, ... 334
    return Array.from(ids).sort(
      (a, b) => a - b
    );
  }, [historique]);

  // ==========================================================
  // PROGRESSION
  // ==========================================================
const nombreJoursTermines =
  joursLus.length;

const programmeTermine =
  nombreJoursTermines >= TOTAL_JOURS;
  // ==========================================================
  // OUVRIR UN JOUR
  // ==========================================================

  function ouvrirJour(numeroJour) {
    const jour =
      planLecture.find(
        (item) =>
          Number(item?.id_jour) ===
          Number(numeroJour)
      );

    if (!jour) {
      console.warn(
        "Jour introuvable dans planLecture :",
        numeroJour
      );

      return;
    }

    setJourSelectionne(jour);
  }

  // ==========================================================
  // OUVRIR MATIN OU SOIR
  // ==========================================================

  function ouvrirLecture(type) {
    if (!jourSelectionne) {
      return;
    }

    const reference =
      type === "matin"
        ? jourSelectionne.matin
        : jourSelectionne.soir;

    if (!reference) {
      setVersets([]);
      setLectureOuverte(type);
      return;
    }

    const result =
      parseReading(reference);

    console.log(
      "Historique - référence :",
      reference
    );

    console.log(
      "Historique - versets trouvés :",
      result.length
    );

    setVersets(result);
    setLectureOuverte(type);
  }

  // ==========================================================
  // FERMER LES VERSETS
  // ==========================================================

  function fermerLecture() {
    setLectureOuverte(null);
    setVersets([]);
  }

  // ==========================================================
  // RETOUR AUX JOURS
  // ==========================================================

  function retourAuxJours() {
    setJourSelectionne(null);
    setLectureOuverte(null);
    setVersets([]);
  }

  // ==========================================================
  // REPRENDRE LA LECTURE
  // ==========================================================

  async function reprendreLecture() {
    if (reinitialisationEnCours) {
      return;
    }

    const confirmation =
      window.confirm(
        "Félicitations ! Tu as terminé les 334 jours.\n\n" +
        "Veux-tu recommencer la lecture biblique depuis le Jour 1 ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      setReinitialisationEnCours(true);

      // ------------------------------------------------------
      // resetTout :
      // - supprime l'historique
      // - remet la progression au jour 1
      // ------------------------------------------------------

      const databaseModule =
        await import(
          "../services/database.js"
        );

      if (
        typeof databaseModule?.resetTout !==
        "function"
      ) {
        throw new Error(
          "La fonction resetTout() est introuvable."
        );
      }

      const resultat =
        await databaseModule.resetTout();

      if (resultat === false) {
        throw new Error(
          "La réinitialisation n'a pas pu être effectuée."
        );
      }

      // ------------------------------------------------------
      // NETTOYAGE DE L'ÉTAT LOCAL
      // ------------------------------------------------------

      setHistorique([]);
      setJourSelectionne(null);
      setLectureOuverte(null);
      setVersets([]);

      // ------------------------------------------------------
      // RETOUR AU PLAN DE LECTURE
      // ------------------------------------------------------

      navigate("/Plandelecture");
    } catch (error) {
      console.error(
        "Erreur lors de la reprise de la lecture :",
        error
      );

      alert(
        "Impossible de réinitialiser la lecture biblique. Vérifie la connexion à la base de données."
      );
    } finally {
      setReinitialisationEnCours(false);
    }
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
  // PAGE FÉLICITATIONS
  // ==========================================================

  if (programmeTermine) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "35px 20px",
          background: dark
            ? "#101c2e"
            : "#ffffff",
          color: dark
            ? "#f0e6c8"
            : "#173b70",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 650,
            margin: "0 auto",
          }}
        >
          {/* RETOUR */}

          <Link
            to="/Plandelecture"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#c9a84c",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 25,
            }}
          >
            <ArrowLeft size={19} />
            Retour au plan de lecture
          </Link>

          {/* CARTE FÉLICITATIONS */}

          <div
            style={{
              padding: "45px 28px",
              borderRadius: 24,
              background: dark
                ? "#16243a"
                : "#ffffff",
              border: dark
                ? "1px solid #c9a84c"
                : "1px solid #e1e7f0",
              boxShadow: dark
                ? "0 10px 35px rgba(0,0,0,0.30)"
                : "0 10px 35px rgba(26,39,68,0.10)",
              textAlign: "center",
            }}
          >
            {/* ICÔNE */}

            <div
              style={{
                width: 82,
                height: 82,
                margin: "0 auto 20px",
                borderRadius: "50%",
                background: dark
                  ? "#2c2c2e"
                  : "#f0f4fb",
                border: "2px solid #c9a84c",
                color: "#c9a84c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={42} />
            </div>

            {/* TITRE */}

            <div
              style={{
                color: "#c9a84c",
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Programme terminé
            </div>

            <h1
              style={{
                margin: "0 0 15px",
                fontSize: 30,
                lineHeight: 1.2,
                color: dark
                  ? "#f0e6c8"
                  : "#173b70",
              }}
            >
              Félicitations !
            </h1>

            <p
              style={{
                margin: "0 auto 12px",
                maxWidth: 500,
                fontSize: 17,
                lineHeight: 1.7,
              }}
            >
              Tu as terminé les{" "}
              <strong>
                {TOTAL_JOURS} jours
              </strong>{" "}
              de ton plan de lecture biblique.
            </p>

            <p
              style={{
                margin: "0 auto 30px",
                maxWidth: 500,
                color: dark
                  ? "#a1a1a6"
                  : "#6e6e73",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Que cette lecture ait fortifié
              ta foi et t'accompagne dans ta
              marche avec Dieu.
            </p>

            

            {/* BOUTON RECOMMENCER */}

            <button
              onClick={
                reprendreLecture
              }
              disabled={
                reinitialisationEnCours
              }
              style={{
                width: "100%",
                border: "none",
                borderRadius: 14,
                padding: "16px 20px",
                background:
                  reinitialisationEnCours
                    ? "#8f7b43"
                    : "#c9a84c",
                color: "#101c2e",
                cursor:
                  reinitialisationEnCours
                    ? "not-allowed"
                    : "pointer",
                fontSize: 16,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow:
                  "0 6px 18px rgba(201,168,76,0.25)",
              }}
            >
              <RotateCcw size={20} />

              {reinitialisationEnCours
                ? "Réinitialisation..."
                : "Reprendre la lecture biblique"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE VERSETS
  // ==========================================================

  if (
    jourSelectionne &&
    lectureOuverte
  ) {
    const reference =
      lectureOuverte === "matin"
        ? jourSelectionne.matin
        : jourSelectionne.soir;

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
          {/* RETOUR */}

          <button
            onClick={fermerLecture}
            style={{
              border: "none",
              background: "transparent",
              color: "#c9a84c",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
              marginBottom: 20,
            }}
          >
            <ChevronLeft size={20} />
            Retour
          </button>

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
            <div
              style={{
                color: "#c9a84c",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Jour{" "}
              {jourSelectionne.id_jour}
              {" — "}
              {lectureOuverte ===
              "matin"
                ? "Lecture du matin"
                : "Lecture du soir"}
            </div>

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

            {versets.length === 0 ? (
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
                Aucun verset trouvé
                pour cette référence.

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
                          color: "#c9a84c",
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
  // PAGE MATIN / SOIR
  // ==========================================================

  if (jourSelectionne) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "35px 20px",
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
          <button
            onClick={retourAuxJours}
            style={{
              border: "none",
              background: "transparent",
              color: "#c9a84c",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
              marginBottom: 25,
            }}
          >
            <ChevronLeft size={20} />
            Historique
          </button>

          <div
            style={{
              textAlign: "center",
              marginBottom: 25,
            }}
          >
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
              Historique
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 25,
              }}
            >
              Jour{" "}
              {jourSelectionne.id_jour}
            </h1>
          </div>

          {/* MATIN */}

          {jourSelectionne.matin && (
            <button
              onClick={() =>
                ouvrirLecture("matin")
              }
              style={{
                width: "100%",
                textAlign: "left",
                padding: 20,
                borderRadius: 16,
                marginBottom: 12,
                border: dark
                  ? "1px solid #2c3e6b"
                  : "1px solid #e1e7f0",
                background: dark
                  ? "#16243a"
                  : "#ffffff",
                color: dark
                  ? "#f0e6c8"
                  : "#173b70",
                cursor: "pointer",
                boxShadow: dark
                  ? "0 5px 20px rgba(0,0,0,0.2)"
                  : "0 5px 20px rgba(26,39,68,0.06)",
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
                      fontSize: 17,
                      fontWeight: 600,
                    }}
                  >
                    {jourSelectionne.matin}
                  </div>
                </div>

                <ChevronRight
                  size={22}
                  color="#c9a84c"
                />
              </div>
            </button>
          )}

          {/* SOIR */}

          {jourSelectionne.soir && (
            <button
              onClick={() =>
                ouvrirLecture("soir")
              }
              style={{
                width: "100%",
                textAlign: "left",
                padding: 20,
                borderRadius: 16,
                border: dark
                  ? "1px solid #2c3e6b"
                  : "1px solid #e1e7f0",
                background: dark
                  ? "#16243a"
                  : "#ffffff",
                color: dark
                  ? "#f0e6c8"
                  : "#173b70",
                cursor: "pointer",
                boxShadow: dark
                  ? "0 5px 20px rgba(0,0,0,0.2)"
                  : "0 5px 20px rgba(26,39,68,0.06)",
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
                      fontSize: 17,
                      fontWeight: 600,
                    }}
                  >
                    {jourSelectionne.soir}
                  </div>
                </div>

                <ChevronRight
                  size={22}
                  color="#c9a84c"
                />
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE PRINCIPALE HISTORIQUE
  // ==========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "35px 20px",
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
       
        {/* ==================================================
            AUCUN JOUR
        ================================================== */}

        {joursLus.length === 0 ? (
          <div
            style={{
              padding: 30,
              borderRadius: 18,
              background: dark
                ? "#16243a"
                : "#ffffff",
              border: dark
                ? "1px solid #2c3e6b"
                : "1px solid #e1e7f0",
              textAlign: "center",
            }}
          >
            <CheckCircle2
              size={40}
              color="#c9a84c"
              style={{
                marginBottom: 12,
              }}
            />

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 19,
              }}
            >
              Aucun jour terminé
            </h2>

            <p
              style={{
                margin: 0,
                color: dark
                  ? "#a1a1a6"
                  : "#6e6e73",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Les jours terminés dans
              ton plan de lecture
              apparaîtront ici.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {joursLus.map(
              (numeroJour) => {
                const jour =
                  planLecture.find(
                    (item) =>
                      Number(
                        item?.id_jour
                      ) ===
                      Number(
                        numeroJour
                      )
                  );

                if (!jour) {
                  return null;
                }

                return (
                  <button
                    key={numeroJour}
                    onClick={() =>
                      ouvrirJour(
                        numeroJour
                      )
                    }
                    style={{
                      width: "100%",
                      padding: 18,
                      borderRadius: 16,
                      border: dark
                        ? "1px solid #2c3e6b"
                        : "1px solid #e1e7f0",
                      background: dark
                        ? "#16243a"
                        : "#ffffff",
                      color: dark
                        ? "#f0e6c8"
                        : "#173b70",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: dark
                        ? "0 5px 20px rgba(0,0,0,0.2)"
                        : "0 5px 20px rgba(26,39,68,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: 15,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            flexShrink: 0,
                            borderRadius: 13,
                            background:
                              dark
                                ? "#2c2c2e"
                                : "#f0f4fb",
                            border:
                              "1px solid #c9a84c",
                            color:
                              "#c9a84c",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {numeroJour}
                        </div>

                        <div>
                          <div
                            style={{
                              color:
                                "#c9a84c",
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform:
                                "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Lecture terminée
                          </div>

                          <div
                            style={{
                              fontSize: 17,
                              fontWeight: 700,
                            }}
                          >
                            Jour{" "}
                            {numeroJour}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          color:
                            "#c9a84c",
                        }}
                      >
                        <CheckCircle2
                          size={20}
                        />

                        <ChevronRight
                          size={20}
                        />
                      </div>
                    </div>

                    {/* APERÇU */}

                    <div
                      style={{
                        marginTop: 15,
                        paddingTop: 14,
                        borderTop: dark
                          ? "1px solid #2c3e6b"
                          : "1px solid #e1e7f0",
                        display: "grid",
                        gap: 6,
                        fontSize: 12,
                        color: dark
                          ? "#a1a1a6"
                          : "#6e6e73",
                      }}
                    >
                      {jour.matin && (
                        <div>
                          <strong
                            style={{
                              color:
                                "#c9a84c",
                            }}
                          >
                            Matin :
                          </strong>{" "}
                          {jour.matin}
                        </div>
                      )}

                      {jour.soir && (
                        <div>
                          <strong
                            style={{
                              color:
                                "#c9a84c",
                            }}
                          >
                            Soir :
                          </strong>{" "}
                          {jour.soir}
                        </div>
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Historique;