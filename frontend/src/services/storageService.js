import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
} from "@capacitor-community/sqlite";

const DATABASE_NAME = "app.db";
const DATABASE_VERSION = 1;

const sqlite = new SQLiteConnection(CapacitorSQLite);

let db = null;

/**
 * Vérifie si l'application tourne sur Android ou iOS.
 */
const isNative = () => {
  const platform = Capacitor.getPlatform();

  return platform === "android" || platform === "ios";
};

/**
 * Initialise SQLite.
 *
 * Cette fonction :
 * - crée la connexion
 * - ouvre la base
 * - crée la table des rappels si elle n'existe pas
 */
export const initDatabase = async () => {
  try {
    // ----------------------------------------------------------
    // Sur le navigateur, SQLite natif n'est pas disponible.
    // Nous gérerons le fallback Web plus tard.
    // ----------------------------------------------------------

    if (!isNative()) {
      console.log(
        "[SQLite] Mode navigateur détecté. SQLite natif non utilisé."
      );

      return false;
    }

    // ----------------------------------------------------------
    // Si la connexion existe déjà, on ne la recrée pas.
    // ----------------------------------------------------------

    if (db) {
      return true;
    }

    // ----------------------------------------------------------
    // Vérifie si une connexion existe déjà.
    // ----------------------------------------------------------

    const consistency = await sqlite.checkConnectionsConsistency();

    const isConnection = await sqlite.isConnection(
      DATABASE_NAME,
      false
    );

    if (consistency.result && isConnection.result) {
      db = await sqlite.retrieveConnection(
        DATABASE_NAME,
        false
      );
    } else {
      db = await sqlite.createConnection(
        DATABASE_NAME,
        false,
        "no-encryption",
        DATABASE_VERSION,
        false
      );
    }

    // ----------------------------------------------------------
    // Ouvre la base.
    // ----------------------------------------------------------

    await db.open();

    // ----------------------------------------------------------
    // Création de la table.
    // ----------------------------------------------------------

    await db.execute(`
      CREATE TABLE IF NOT EXISTS reminder_settings (
        id INTEGER PRIMARY KEY NOT NULL,
        morning_enabled INTEGER NOT NULL DEFAULT 0,
        morning_time TEXT NOT NULL DEFAULT '07:00',
        evening_enabled INTEGER NOT NULL DEFAULT 0,
        evening_time TEXT NOT NULL DEFAULT '21:00',
        notification_permission_asked INTEGER NOT NULL DEFAULT 0
      );
    `);

    // ----------------------------------------------------------
    // Création des réglages par défaut.
    //
    // Une seule ligne doit exister.
    // ----------------------------------------------------------

    const result = await db.query(`
      SELECT id
      FROM reminder_settings
      WHERE id = 1;
    `);

    if (!result.values || result.values.length === 0) {
      await db.run(
        `
          INSERT INTO reminder_settings (
            id,
            morning_enabled,
            morning_time,
            evening_enabled,
            evening_time,
            notification_permission_asked
          )
          VALUES (?, ?, ?, ?, ?, ?);
        `,
        [1, 0, "07:00", 0, "21:00", 0]
      );
    }

    console.log("[SQLite] Base initialisée.");

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur lors de l'initialisation :",
      error
    );

    db = null;

    return false;
  }
};

/**
 * Récupère tous les réglages des rappels.
 */
export const getReminderSettings = async () => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return {
        morningEnabled: false,
        morningTime: "07:00",
        eveningEnabled: false,
        eveningTime: "21:00",
        notificationPermissionAsked: false,
      };
    }

    const result = await db.query(`
      SELECT
        morning_enabled,
        morning_time,
        evening_enabled,
        evening_time,
        notification_permission_asked
      FROM reminder_settings
      WHERE id = 1;
    `);

    if (!result.values || result.values.length === 0) {
      return {
        morningEnabled: false,
        morningTime: "07:00",
        eveningEnabled: false,
        eveningTime: "21:00",
        notificationPermissionAsked: false,
      };
    }

    const row = result.values[0];

    return {
      morningEnabled: row.morning_enabled === 1,
      morningTime: row.morning_time,
      eveningEnabled: row.evening_enabled === 1,
      eveningTime: row.evening_time,
      notificationPermissionAsked:
        row.notification_permission_asked === 1,
    };
  } catch (error) {
    console.error(
      "[SQLite] Erreur lecture des réglages :",
      error
    );

    return null;
  }
};

/**
 * Active ou désactive le rappel du matin.
 */
export const setMorningEnabled = async (enabled) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET morning_enabled = ?
        WHERE id = 1;
      `,
      [enabled ? 1 : 0]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur morning_enabled :",
      error
    );

    return false;
  }
};

/**
 * Modifie l'heure du rappel du matin.
 *
 * Exemple :
 * setMorningTime("07:30")
 */
export const setMorningTime = async (time) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET morning_time = ?
        WHERE id = 1;
      `,
      [time]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur morning_time :",
      error
    );

    return false;
  }
};

/**
 * Active ou désactive le rappel du soir.
 */
export const setEveningEnabled = async (enabled) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET evening_enabled = ?
        WHERE id = 1;
      `,
      [enabled ? 1 : 0]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur evening_enabled :",
      error
    );

    return false;
  }
};

/**
 * Modifie l'heure du rappel du soir.
 *
 * Exemple :
 * setEveningTime("21:30")
 */
export const setEveningTime = async (time) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET evening_time = ?
        WHERE id = 1;
      `,
      [time]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur evening_time :",
      error
    );

    return false;
  }
};

/**
 * Enregistre le fait que l'utilisateur a déjà
 * répondu à notre question concernant les notifications.
 */
export const setNotificationPermissionAsked = async (
  asked
) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET notification_permission_asked = ?
        WHERE id = 1;
      `,
      [asked ? 1 : 0]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur notification_permission_asked :",
      error
    );

    return false;
  }
};

/**
 * Sauvegarde tous les réglages en une seule opération.
 *
 * Cette fonction sera particulièrement pratique
 * lorsque nous brancherons Rappel.jsx.
 */
export const saveReminderSettings = async ({
  morningEnabled,
  morningTime,
  eveningEnabled,
  eveningTime,
  notificationPermissionAsked,
}) => {
  try {
    const initialized = await initDatabase();

    if (!initialized || !db) {
      return false;
    }

    await db.run(
      `
        UPDATE reminder_settings
        SET
          morning_enabled = ?,
          morning_time = ?,
          evening_enabled = ?,
          evening_time = ?,
          notification_permission_asked = ?
        WHERE id = 1;
      `,
      [
        morningEnabled ? 1 : 0,
        morningTime,
        eveningEnabled ? 1 : 0,
        eveningTime,
        notificationPermissionAsked ? 1 : 0,
      ]
    );

    return true;
  } catch (error) {
    console.error(
      "[SQLite] Erreur sauvegarde des réglages :",
      error
    );

    return false;
  }
};

/**
 * Ferme proprement la connexion SQLite.
 *
 * À utiliser lorsque nous en aurons besoin,
 * notamment lors de certaines opérations natives.
 */
export const closeDatabase = async () => {
  try {
    if (!db) {
      return;
    }

    await sqlite.closeConnection(
      DATABASE_NAME,
      false
    );

    db = null;

    console.log("[SQLite] Base fermée.");
  } catch (error) {
    console.error(
      "[SQLite] Erreur fermeture :",
      error
    );
  }
};