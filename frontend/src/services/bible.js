import bible from "../bible_segond_21_fr.json";

// ============================================================
// CACHE
// ============================================================

let allBooks = null;

// ============================================================
// NORMALISATION
// ============================================================

export function normalizeText(value = "") {
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

// ============================================================
// CHARGEMENT DES LIVRES
// ============================================================

export function getAllBooks() {
  if (allBooks) {
    return allBooks;
  }

  allBooks = [];

  for (const testament of bible?.Testaments || []) {
    for (const book of testament?.Books || []) {
      allBooks.push(book);
    }
  }

  return allBooks;
}

// ============================================================
// NOM DU LIVRE
// ============================================================

export function getBookName(book) {
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

// ============================================================
// ALIAS DES LIVRES
// ============================================================

const BOOK_ALIASES = {
  ps: "Psaumes",
  psaume: "Psaumes",
  psaumes: "Psaumes",

  mt: "Matthieu",
  mat: "Matthieu",
  matthieu: "Matthieu",

  mc: "Marc",
  marc: "Marc",

  lc: "Luc",
  luc: "Luc",

  jn: "Jean",
  jean: "Jean",

  ac: "Actes",
  actes: "Actes",

  rm: "Romains",
  ro: "Romains",
  romains: "Romains",

  "1co": "1 Corinthiens",
  "2co": "2 Corinthiens",

  "1cor": "1 Corinthiens",
  "2cor": "2 Corinthiens",

  ga: "Galates",
  galates: "Galates",

  ep: "Éphésiens",
  ephesiens: "Éphésiens",

  ph: "Philippiens",
  philippiens: "Philippiens",

  col: "Colossiens",
  colossiens: "Colossiens",

  "1th": "1 Thessaloniciens",
  "2th": "2 Thessaloniciens",

  "1ti": "1 Timothée",
  "2ti": "2 Timothée",

  tt: "Tite",
  tite: "Tite",

  phm: "Philémon",
  philemon: "Philémon",

  he: "Hébreux",
  hebreux: "Hébreux",

  jaq: "Jacques",
  jac: "Jacques",
  jacques: "Jacques",

  "1pi": "1 Pierre",
  "2pi": "2 Pierre",

  "1jn": "1 Jean",
  "2jn": "2 Jean",
  "3jn": "3 Jean",

  jd: "Jude",
  jude: "Jude",

  ap: "Apocalypse",
  apocalypse: "Apocalypse",
};

// ============================================================
// RECHERCHE DU LIVRE
// ============================================================

export function findBook(bookName) {
  const normalizedName = normalizeBookName(bookName);

  if (!normalizedName) {
    return null;
  }

  const books = getAllBooks();

  // Recherche exacte
  const directMatch = books.find((book) => {
    return (
      normalizeBookName(getBookName(book)) ===
      normalizedName
    );
  });

  if (directMatch) {
    return directMatch;
  }

  // Recherche par alias
  const alias = BOOK_ALIASES[normalizedName];

  if (alias) {
    const normalizedAlias =
      normalizeBookName(alias);

    return (
      books.find((book) => {
        return (
          normalizeBookName(
            getBookName(book)
          ) === normalizedAlias
        );
      }) || null
    );
  }

  return null;
}

// ============================================================
// RECHERCHE FLEXIBLE DU LIVRE
// ============================================================

function findBookFromReference(reference) {
  const normalizedReference =
    normalizeBookName(reference);

  const books = getAllBooks()
    .map((book) => ({
      book,
      name: getBookName(book),
      normalizedName: normalizeBookName(
        getBookName(book)
      ),
    }))
    .filter((item) => item.normalizedName)
    .sort(
      (a, b) =>
        b.normalizedName.length -
        a.normalizedName.length
    );

  // ----------------------------------------------------------
  // NOM COMPLET
  // ----------------------------------------------------------

  const directMatch = books.find((item) =>
    normalizedReference.startsWith(
      item.normalizedName
    )
  );

  if (directMatch) {
    return directMatch;
  }

  // ----------------------------------------------------------
  // ALIAS
  // ----------------------------------------------------------

  const firstPart = normalizeText(reference)
    .split(/\s+/)
    .slice(0, 2)
    .join("");

  const alias = BOOK_ALIASES[firstPart];

  if (alias) {
    const normalizedAlias =
      normalizeBookName(alias);

    const aliasMatch = books.find(
      (item) =>
        item.normalizedName ===
        normalizedAlias
    );

    if (aliasMatch) {
      return aliasMatch;
    }
  }

  return null;
}

// ============================================================
// PARSE D'UNE RÉFÉRENCE
// ============================================================

/*
Formats supportés :

Genèse
Genèse 1
Genèse 1-3

Genèse 1:1
Genèse 1:1-10
Genèse 1:1 à 10

Psaumes 119 verset 1-57
Psaumes 119 versets 1-57
Psaumes 119 verset 117 à la fin

1 Jean 5:10

Jude
Philémon
*/

export function parseReference(reference) {
  if (!reference) {
    return null;
  }

  const cleanReference =
    String(reference).trim();

  if (!cleanReference) {
    return null;
  }

  // ----------------------------------------------------------
  // LIVRE
  // ----------------------------------------------------------

  const found =
    findBookFromReference(
      cleanReference
    );

  if (!found) {
    return null;
  }

  const book = found.book;
  const bookName = found.name;

  // ----------------------------------------------------------
  // RESTE DE LA RÉFÉRENCE
  // ----------------------------------------------------------

  let remaining =
    cleanReference
      .slice(
        cleanReference
          .toLowerCase()
          .indexOf(
            bookName.toLowerCase()
          ) +
          bookName.length
      )
      .trim();

  // ----------------------------------------------------------
  // LIVRE SEUL
  // ----------------------------------------------------------

  if (!remaining) {
    return {
      book: bookName,
      startChapter: 1,
      endChapter:
        book?.Chapters?.length || 1,
      startVerse: null,
      endVerse: null,
    };
  }

  // ----------------------------------------------------------
  // NETTOYAGE
  // ----------------------------------------------------------

  remaining = remaining
    .replace(/^:\s*/, "")
    .trim();

  // ----------------------------------------------------------
  // FORMAT :
  //
  // Psaumes 119 verset 1-57
  // Psaumes 119 versets 1-57
  // ----------------------------------------------------------

  const verboseRange =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (verboseRange) {
    const chapter =
      Number(verboseRange[1]);

    const startVerse =
      Number(verboseRange[2]);

    const endValue =
      verboseRange[3];

    const endVerse =
      normalizeText(endValue) ===
      "la fin"
        ? null
        : Number(endValue);

    return {
      book: bookName,
      startChapter: chapter,
      endChapter: chapter,
      startVerse,
      endVerse,
    };
  }

  // ----------------------------------------------------------
  // FORMAT :
  //
  // Psaumes 119 verset 1
  // ----------------------------------------------------------

  const verboseSingle =
    remaining.match(
      /^(\d+)\s+versets?\s+(\d+)$/i
    );

  if (verboseSingle) {
    const chapter =
      Number(verboseSingle[1]);

    const verse =
      Number(verboseSingle[2]);

    return {
      book: bookName,
      startChapter: chapter,
      endChapter: chapter,
      startVerse: verse,
      endVerse: verse,
    };
  }

  // ----------------------------------------------------------
  // FORMAT :
  //
  // Genèse 1:1-10
  // Genèse 1:1 à 10
  // Genèse 1:1 à la fin
  // ----------------------------------------------------------

  const colonRange =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)\s*(?:-|à)\s*(\d+|la\s+fin)$/i
    );

  if (colonRange) {
    const chapter =
      Number(colonRange[1]);

    const startVerse =
      Number(colonRange[2]);

    const endValue =
      colonRange[3];

    const endVerse =
      normalizeText(endValue) ===
      "la fin"
        ? null
        : Number(endValue);

    return {
      book: bookName,
      startChapter: chapter,
      endChapter: chapter,
      startVerse,
      endVerse,
    };
  }

  // ----------------------------------------------------------
  // FORMAT :
  //
  // Genèse 1:1
  // ----------------------------------------------------------

  const colonSingle =
    remaining.match(
      /^(\d+)\s*:\s*(\d+)$/
    );

  if (colonSingle) {
    const chapter =
      Number(colonSingle[1]);

    const verse =
      Number(colonSingle[2]);

    return {
      book: bookName,
      startChapter: chapter,
      endChapter: chapter,
      startVerse: verse,
      endVerse: verse,
    };
  }

  // ----------------------------------------------------------
  // FORMAT :
  //
  // Genèse 1
  // Genèse 1-3
  // ----------------------------------------------------------

  const chapterRange =
    remaining.match(
      /^(\d+)(?:\s*-\s*(\d+))?$/
    );

  if (chapterRange) {
    const startChapter =
      Number(chapterRange[1]);

    const endChapter =
      chapterRange[2]
        ? Number(chapterRange[2])
        : startChapter;

    return {
      book: bookName,
      startChapter,
      endChapter,
      startVerse: null,
      endVerse: null,
    };
  }

  return null;
}

// ============================================================
// EXTRACTION DU PASSAGE
// ============================================================

export function getPassage(reference) {
  const parsed =
    parseReference(reference);

  if (!parsed) {
    console.warn(
      "Référence biblique invalide :",
      reference
    );

    return [];
  }

  const book =
    findBook(parsed.book);

  if (!book) {
    console.warn(
      "Livre biblique introuvable :",
      parsed.book
    );

    return [];
  }

  const chapters =
    book.Chapters || [];

  const result = [];

  for (
    let chapterNumber =
      parsed.startChapter;

    chapterNumber <=
    parsed.endChapter;

    chapterNumber++
  ) {
    const chapter =
      chapters[
        chapterNumber - 1
      ];

    if (!chapter) {
      continue;
    }

    const verses =
      chapter.Verses || [];

    for (const verse of verses) {
      const verseId =
        Number(verse?.ID);

      if (!Number.isInteger(verseId)) {
        continue;
      }

      // ------------------------------------------------------
      // FILTRE DES VERSETS
      // ------------------------------------------------------

      if (
        parsed.startVerse !== null
      ) {
        const endVerse =
          parsed.endVerse ??
          verseId;

        if (
          verseId <
            parsed.startVerse ||
          verseId >
            endVerse
        ) {
          continue;
        }
      }

      result.push({
        book: parsed.book,
        chapter: chapterNumber,
        verse: verseId,
        text: verse?.Text || "",
      });
    }
  }

  return result;
}

// ============================================================
// EXTRACTION SOUS FORME DE TEXTE
// ============================================================

export function getPassageText(reference) {
  const verses =
    getPassage(reference);

  if (!verses.length) {
    return "";
  }

  return verses
    .map(
      (verse) =>
        `${verse.chapter}:${verse.verse} ${verse.text}`
    )
    .join("\n");
}

// ============================================================
// OBTENIR UNE LECTURE
// ============================================================

/**
 * Retourne les informations complètes
 * d'une lecture du matin ou du soir.
 *
 * Exemple :
 *
 * getReading("Genèse 1", "matin")
 *
 * retourne :
 *
 * {
 *   type: "matin",
 *   reference: "Genèse 1",
 *   verses: [...]
 * }
 */

export function getReading(
  reference,
  type = null
) {
  if (!reference) {
    return {
      type,
      reference: "",
      verses: [],
    };
  }

  return {
    type,
    reference,
    verses: getPassage(reference),
  };
}

// ============================================================
// COMPARAISON DE RÉFÉRENCES
// ============================================================

export function sameReference(
  referenceA,
  referenceB
) {
  if (
    !referenceA ||
    !referenceB
  ) {
    return false;
  }

  return (
    normalizeText(referenceA) ===
    normalizeText(referenceB)
  );
}

// ============================================================
// CLÉ UNIQUE D'UNE LECTURE
// ============================================================

/**
 * Permet d'identifier précisément une lecture.
 *
 * Exemple :
 *
 * jour 12 + matin
 * -> "12-matin"
 *
 * jour 12 + soir
 * -> "12-soir"
 */

export function getReadingKey(
  jour,
  type
) {
  if (
    jour === undefined ||
    jour === null ||
    !type
  ) {
    return null;
  }

  return `${Number(jour)}-${String(
    type
  ).toLowerCase()}`;
}

// ============================================================
// VÉRIFIER SI UNE LECTURE EST DANS L'HISTORIQUE
// ============================================================

/**
 * Vérifie si le matin ou le soir
 * d'un jour donné a déjà été lu.
 */

export function isReadingCompleted(
  historique = [],
  jour,
  type
) {
  if (!Array.isArray(historique)) {
    return false;
  }

  const item =
    historique.find(
      (entry) =>
        Number(entry?.jour) ===
        Number(jour)
    );

  if (!item) {
    return false;
  }

  if (type === "matin") {
    return Boolean(
      item?.matin_lu
    );
  }

  if (type === "soir") {
    return Boolean(
      item?.soir_lu
    );
  }

  return false;
}

// ============================================================
// RÉCUPÉRER LES LECTURES TERMINÉES
// ============================================================

/**
 * Transforme l'historique SQLite
 * en liste de lectures individuelles.
 *
 * Exemple :
 *
 * historique :
 *
 * [
 *   {
 *     jour: 1,
 *     matin_lu: 1,
 *     soir_lu: 1
 *   }
 * ]
 *
 * devient :
 *
 * [
 *   {
 *     jour: 1,
 *     type: "matin"
 *   },
 *   {
 *     jour: 1,
 *     type: "soir"
 *   }
 * ]
 */

export function getCompletedReadings(
  historique = []
) {
  if (!Array.isArray(historique)) {
    return [];
  }

  const result = [];

  for (const item of historique) {
    const jour =
      Number(item?.jour);

    if (!Number.isInteger(jour)) {
      continue;
    }

    if (item?.matin_lu) {
      result.push({
        jour,
        type: "matin",
        key: getReadingKey(
          jour,
          "matin"
        ),
        date_completion:
          item?.date_completion ||
          null,
      });
    }

    if (item?.soir_lu) {
      result.push({
        jour,
        type: "soir",
        key: getReadingKey(
          jour,
          "soir"
        ),
        date_completion:
          item?.date_completion ||
          null,
      });
    }
  }

  return result;
}

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default {
  getAllBooks,
  getBookName,
  findBook,
  parseReference,
  getPassage,
  getPassageText,
  getReading,
  sameReference,
  getReadingKey,
  isReadingCompleted,
  getCompletedReadings,
};