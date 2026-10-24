import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
} from "@capacitor-community/sqlite";

// ============================================================
// CONFIGURATION
// ============================================================

const sqlite = new SQLiteConnection(CapacitorSQLite);

const DB_NAME = "plan_lecture_bible";
const DB_VERSION = 1;

// ============================================================
// CLÉS LOCALSTORAGE
// ============================================================

const STORAGE_KEYS = {
  progression: "plan_lecture_progression",
  historique: "plan_lecture_historique",
};

// ============================================================
// UTILITAIRES
// ============================================================

function isWeb() {
  return Capacitor.getPlatform() === "web";
}

// ============================================================
// STRUCTURE SQLITE
// ============================================================

const DB_SCHEMA = `
  CREATE TABLE IF NOT EXISTS progression (
    id INTEGER PRIMARY KEY,
    jour_actuel INTEGER NOT NULL,
    matin_lu INTEGER NOT NULL DEFAULT 0,
    soir_lu INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS historique (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jour INTEGER NOT NULL UNIQUE,
    matin_lu INTEGER NOT NULL DEFAULT 0,
    soir_lu INTEGER NOT NULL DEFAULT 0,
    date_completion TEXT
  );
`;

// ============================================================
// OBTENIR LA CONNEXION SQLITE
// ============================================================

async function getDatabase() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    return null;
  }

  // ==========================================================
  // SQLITE NATIVE
  // ==========================================================

  try {
    const consistency =
      await sqlite.checkConnectionsConsistency();

    if (!consistency.result) {
      try {
        await sqlite.closeConnection(
          DB_NAME,
          false
        );
      } catch {
        // Rien à fermer
      }
    }

    const hasConnection =
      await sqlite.isConnection(
        DB_NAME,
        false
      );

    let db;

    if (hasConnection.result) {
      db =
        await sqlite.retrieveConnection(
          DB_NAME,
          false
        );
    } else {
      db =
        await sqlite.createConnection(
          DB_NAME,
          false,
          "no-encryption",
          DB_VERSION,
          false
        );
    }

    await db.open();

    // Création des tables
    await db.execute(DB_SCHEMA);

    // ========================================================
    // CRÉER LA PROGRESSION INITIALE
    // ========================================================

    const progression =
      await db.query(
        `
          SELECT *
          FROM progression
          WHERE id = 1
        `
      );

    if (!progression.values?.length) {
      await db.run(
        `
          INSERT INTO progression
          (
            id,
            jour_actuel,
            matin_lu,
            soir_lu
          )
          VALUES (?, ?, ?, ?)
        `,
        [1, 1, 0, 0]
      );
    }

    return db;
  } catch (error) {
    console.error(
      "Erreur ouverture SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// LOCALSTORAGE - PROGRESSION
// ============================================================

function getLocalProgression() {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.progression
      );

    if (!saved) {
      return {
        id: 1,
        jour_actuel: 1,
        matin_lu: 0,
        soir_lu: 0,
      };
    }

    const data = JSON.parse(saved);

    return {
      id: 1,

      jour_actuel:
        Number(
          data?.jour_actuel ??
          data?.jourActuel
        ) || 1,

      matin_lu:
        Number(
          data?.matin_lu ??
          data?.matinLu
        )
          ? 1
          : 0,

      soir_lu:
        Number(
          data?.soir_lu ??
          data?.soirLu
        )
          ? 1
          : 0,
    };
  } catch (error) {
    console.warn(
      "Progression localStorage invalide :",
      error
    );

    return {
      id: 1,
      jour_actuel: 1,
      matin_lu: 0,
      soir_lu: 0,
    };
  }
}

// ============================================================
// LOCALSTORAGE - HISTORIQUE
// ============================================================

function getLocalHistorique() {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.historique
      );

    if (!saved) {
      return [];
    }

    const data = JSON.parse(saved);

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item) => ({
        id:
          item?.id ??
          null,

        jour:
          Number(item?.jour) || 0,

        matin_lu:
          Number(
            item?.matin_lu ??
            item?.matinLu
          )
            ? 1
            : 0,

        soir_lu:
          Number(
            item?.soir_lu ??
            item?.soirLu
          )
            ? 1
            : 0,

        date_completion:
          item?.date_completion ||
          item?.dateCompletion ||
          null,
      }))
      .filter(
        (item) =>
          item.jour > 0
      )
      .sort(
        (a, b) =>
          a.jour - b.jour
      );
  } catch (error) {
    console.warn(
      "Historique localStorage invalide :",
      error
    );

    return [];
  }
}

function saveLocalHistorique(
  historique
) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.historique,
      JSON.stringify(historique)
    );

    return true;
  } catch (error) {
    console.error(
      "Impossible de sauvegarder l'historique local :",
      error
    );

    return false;
  }
}

// ============================================================
// PROGRESSION
// ============================================================

/**
 * Récupère la progression actuelle.
 *
 * Retour :
 *
 * {
 *   id: 1,
 *   jour_actuel: 1,
 *   matin_lu: 0,
 *   soir_lu: 0
 * }
 *
 * WEB :
 * localStorage
 *
 * MOBILE :
 * SQLite
 */
export async function getProgression() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    return getLocalProgression();
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    const result =
      await db.query(
        `
          SELECT
            id,
            jour_actuel,
            matin_lu,
            soir_lu
          FROM progression
          WHERE id = 1
        `
      );

    return (
      result.values?.[0] ||
      {
        id: 1,
        jour_actuel: 1,
        matin_lu: 0,
        soir_lu: 0,
      }
    );
  } catch (error) {
    console.error(
      "Erreur récupération progression :",
      error
    );

    throw error;
  }
}

/**
 * Sauvegarde la progression actuelle.
 *
 * @param {number} jourActuel
 * @param {boolean} matinLu
 * @param {boolean} soirLu
 */
export async function saveProgression(
  jourActuel,
  matinLu,
  soirLu
) {
  const data = {
    id: 1,

    jour_actuel:
      Number(jourActuel) || 1,

    matin_lu:
      matinLu ? 1 : 0,

    soir_lu:
      soirLu ? 1 : 0,
  };

  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    try {
      localStorage.setItem(
        STORAGE_KEYS.progression,
        JSON.stringify(data)
      );

      return true;
    } catch (error) {
      console.error(
        "Erreur sauvegarde progression localStorage :",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    await db.run(
      `
        UPDATE progression
        SET
          jour_actuel = ?,
          matin_lu = ?,
          soir_lu = ?
        WHERE id = 1
      `,
      [
        data.jour_actuel,
        data.matin_lu,
        data.soir_lu,
      ]
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur sauvegarde progression SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// HISTORIQUE
// ============================================================

/**
 * Récupère tout l'historique des jours terminés.
 *
 * WEB :
 * localStorage
 *
 * MOBILE :
 * SQLite
 */
export async function getHistorique() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    return getLocalHistorique();
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    const result =
      await db.query(
        `
          SELECT
            id,
            jour,
            matin_lu,
            soir_lu,
            date_completion
          FROM historique
          ORDER BY jour ASC
        `
      );

    return result.values || [];
  } catch (error) {
    console.error(
      "Erreur récupération historique SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// ENREGISTRER UN JOUR DANS L'HISTORIQUE
// ============================================================

/**
 * Enregistre un jour terminé.
 *
 * Exemple :
 *
 * saveHistorique(
 *   5,
 *   1,
 *   1,
 *   "2026-08-21T17:20:00.000Z"
 * );
 */
export async function saveHistorique(
  jour,
  matinLu = 1,
  soirLu = 1,
  dateCompletion =
    new Date().toISOString()
) {
  const jourNumber =
    Number(jour);

  if (
    !Number.isFinite(
      jourNumber
    ) ||
    jourNumber < 1
  ) {
    console.warn(
      "Jour historique invalide :",
      jour
    );

    return false;
  }

  const historiqueItem = {
    jour: jourNumber,

    matin_lu:
      matinLu ? 1 : 0,

    soir_lu:
      soirLu ? 1 : 0,

    date_completion:
      dateCompletion,
  };

  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    const historique =
      getLocalHistorique();

    // On supprime l'ancienne entrée
    // du même jour.
    const nouveauHistorique =
      historique.filter(
        (item) =>
          Number(item?.jour) !==
          jourNumber
      );

    nouveauHistorique.push(
      historiqueItem
    );

    nouveauHistorique.sort(
      (a, b) =>
        Number(a.jour) -
        Number(b.jour)
    );

    return saveLocalHistorique(
      nouveauHistorique
    );
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    await db.run(
      `
        INSERT OR REPLACE INTO historique
        (
          jour,
          matin_lu,
          soir_lu,
          date_completion
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        jourNumber,
        historiqueItem.matin_lu,
        historiqueItem.soir_lu,
        historiqueItem.date_completion,
      ]
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur sauvegarde historique SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// RÉCUPÉRER UN JOUR PRÉCIS DE L'HISTORIQUE
// ============================================================

/**
 * Permet à Historique.jsx de récupérer
 * un jour précis.
 *
 * Exemple :
 *
 * const jour =
 *   await getHistoriqueJour(5);
 */
export async function getHistoriqueJour(
  jour
) {
  const jourNumber =
    Number(jour);

  if (
    !Number.isFinite(
      jourNumber
    )
  ) {
    return null;
  }

  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    const historique =
      getLocalHistorique();

    return (
      historique.find(
        (item) =>
          Number(item?.jour) ===
          jourNumber
      ) || null
    );
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    const result =
      await db.query(
        `
          SELECT
            id,
            jour,
            matin_lu,
            soir_lu,
            date_completion
          FROM historique
          WHERE jour = ?
          LIMIT 1
        `,
        [jourNumber]
      );

    return (
      result.values?.[0] ||
      null
    );
  } catch (error) {
    console.error(
      "Erreur récupération jour historique :",
      error
    );

    throw error;
  }
}

// ============================================================
// SUPPRIMER L'HISTORIQUE
// ============================================================

/**
 * Supprime tout l'historique.
 */
export async function clearHistorique() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    try {
      localStorage.removeItem(
        STORAGE_KEYS.historique
      );

      return true;
    } catch (error) {
      console.error(
        "Erreur suppression historique localStorage :",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    await db.execute(
      "DELETE FROM historique"
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur suppression historique SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// RÉINITIALISER LA PROGRESSION
// ============================================================

/**
 * Remet la progression au jour 1.
 *
 * IMPORTANT :
 * Cette fonction ne supprime PAS l'historique.
 */
export async function resetProgression() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    try {
      const data = {
        id: 1,
        jour_actuel: 1,
        matin_lu: 0,
        soir_lu: 0,
      };

      localStorage.setItem(
        STORAGE_KEYS.progression,
        JSON.stringify(data)
      );

      return true;
    } catch (error) {
      console.error(
        "Erreur réinitialisation progression localStorage :",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    await db.run(
      `
        UPDATE progression
        SET
          jour_actuel = ?,
          matin_lu = ?,
          soir_lu = ?
        WHERE id = 1
      `,
      [1, 0, 0]
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur réinitialisation progression SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// RÉINITIALISER TOUT
// ============================================================

/**
 * Supprime :
 *
 * - la progression
 * - l'historique
 *
 * puis remet le plan au jour 1.
 *
 * ATTENTION :
 * Cette fonction est destructive.
 */
export async function resetTout() {
  // ==========================================================
  // WEB
  // ==========================================================

  if (isWeb()) {
    try {
      localStorage.removeItem(
        STORAGE_KEYS.progression
      );

      localStorage.removeItem(
        STORAGE_KEYS.historique
      );

      localStorage.setItem(
        STORAGE_KEYS.progression,
        JSON.stringify({
          id: 1,
          jour_actuel: 1,
          matin_lu: 0,
          soir_lu: 0,
        })
      );

      return true;
    } catch (error) {
      console.error(
        "Erreur réinitialisation complète localStorage :",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // SQLITE
  // ==========================================================

  const db =
    await getDatabase();

  try {
    await db.execute(
      "DELETE FROM historique"
    );

    await db.run(
      `
        UPDATE progression
        SET
          jour_actuel = ?,
          matin_lu = ?,
          soir_lu = ?
        WHERE id = 1
      `,
      [1, 0, 0]
    );

    return true;
  } catch (error) {
    console.error(
      "Erreur réinitialisation complète SQLite :",
      error
    );

    throw error;
  }
}

// ============================================================
// FERMER LA BASE
// ============================================================

export async function closeDatabase() {
  // Sur le Web, aucune connexion SQLite native
  // n'est utilisée.
  if (isWeb()) {
    return true;
  }

  try {
    const hasConnection =
      await sqlite.isConnection(
        DB_NAME,
        false
      );

    if (hasConnection.result) {
      await sqlite.closeConnection(
        DB_NAME,
        false
      );
    }

    return true;
  } catch (error) {
    console.error(
      "Erreur fermeture SQLite :",
      error
    );

    return false;
  }
}