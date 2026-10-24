import {
  LocalNotifications,
} from "@capacitor/local-notifications";

/**
 * ==========================================================
 * IDENTIFIANTS DES NOTIFICATIONS
 * ==========================================================
 *
 * 1001 = rappel matin
 * 1002 = rappel soir
 * 9999 = notification de test
 */

const MORNING_NOTIFICATION_ID = 1001;
const EVENING_NOTIFICATION_ID = 1002;
const TEST_NOTIFICATION_ID = 9999;


/**
 * ==========================================================
 * DEMANDER LA PERMISSION
 * ==========================================================
 */
export const requestNotificationPermission =
  async () => {
    try {
      const current =
        await LocalNotifications.checkPermissions();

      console.log(
        "[Notifications] Permission actuelle :",
        current.display
      );

      if (current.display === "granted") {
        return true;
      }

      const result =
        await LocalNotifications.requestPermissions();

      console.log(
        "[Notifications] Résultat permission :",
        result.display
      );

      return result.display === "granted";

    } catch (error) {

      console.error(
        "[Notifications] Erreur permission :",
        error
      );

      return false;
    }
  };


/**
 * ==========================================================
 * CONVERTIR UNE HEURE "07:30"
 * ==========================================================
 */
const parseTime = (time) => {

  const [hour, minute] =
    time.split(":").map(Number);

  return {
    hour,
    minute,
  };
};


/**
 * ==========================================================
 * PROGRAMMER UNE NOTIFICATION QUOTIDIENNE
 * ==========================================================
 */
const scheduleNotification = async ({
  id,
  title,
  body,
  time,
}) => {

  try {

    const { hour, minute } =
      parseTime(time);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {

      console.error(
        "[Notifications] Heure invalide :",
        time
      );

      return false;
    }


    /**
     * Supprimer une ancienne programmation
     * avec le même ID.
     */
    try {

      await LocalNotifications.cancel({
        notifications: [
          {
            id,
          },
        ],
      });

    } catch (error) {

      console.warn(
        "[Notifications] Ancienne notification non annulée :",
        error
      );
    }


    /**
     * Programmer la nouvelle notification.
     */
    await LocalNotifications.schedule({

      notifications: [

        {
          id,

          title,

          body,

          schedule: {

            on: {
              hour,
              minute,
            },

            allowWhileIdle: true,

          },

          sound: "default",

          smallIcon:
            "ic_stat_icon_config_sample",

          extra: {
            type: "reminder",
          },

        },

      ],

    });


    console.log(
      "[Notifications] ✅ Notification programmée",
      {
        id,
        title,
        time,
      }
    );

    return true;

  } catch (error) {

    console.error(
      "[Notifications] ❌ Erreur programmation :",
      error
    );

    return false;
  }
};


/**
 * ==========================================================
 * RAPPEL DU MATIN
 * ==========================================================
 */
export const scheduleMorningNotification =
  async (time) => {

    return scheduleNotification({

      id: MORNING_NOTIFICATION_ID,

      title:
        "📖 Rappel du matin",

      body:
        "C'est l'heure de votre lecture biblique.",

      time,

    });

  };


/**
 * ==========================================================
 * RAPPEL DU SOIR
 * ==========================================================
 */
export const scheduleEveningNotification =
  async (time) => {

    return scheduleNotification({

      id: EVENING_NOTIFICATION_ID,

      title:
        "🌙 Rappel du soir",

      body:
        "N'oubliez pas votre lecture biblique.",

      time,

    });

  };


/**
 * ==========================================================
 * ANNULER LE RAPPEL DU MATIN
 * ==========================================================
 */
export const cancelMorningNotification =
  async () => {

    try {

      await LocalNotifications.cancel({

        notifications: [
          {
            id:
              MORNING_NOTIFICATION_ID,
          },
        ],

      });

      console.log(
        "[Notifications] ✅ Rappel matin annulé."
      );

      return true;

    } catch (error) {

      console.error(
        "[Notifications] ❌ Erreur annulation matin :",
        error
      );

      return false;
    }
  };


/**
 * ==========================================================
 * ANNULER LE RAPPEL DU SOIR
 * ==========================================================
 */
export const cancelEveningNotification =
  async () => {

    try {

      await LocalNotifications.cancel({

        notifications: [
          {
            id:
              EVENING_NOTIFICATION_ID,
          },
        ],

      });

      console.log(
        "[Notifications] ✅ Rappel soir annulé."
      );

      return true;

    } catch (error) {

      console.error(
        "[Notifications] ❌ Erreur annulation soir :",
        error
      );

      return false;
    }
  };


/**
 * ==========================================================
 * ANNULER TOUTES LES NOTIFICATIONS
 * ==========================================================
 */
export const cancelAllNotifications =
  async () => {

    try {

      await LocalNotifications.cancel({

        notifications: [

          {
            id:
              MORNING_NOTIFICATION_ID,
          },

          {
            id:
              EVENING_NOTIFICATION_ID,
          },

          {
            id:
              TEST_NOTIFICATION_ID,
          },

        ],

      });

      console.log(
        "[Notifications] ✅ Toutes les notifications annulées."
      );

      return true;

    } catch (error) {

      console.error(
        "[Notifications] ❌ Erreur annulation globale :",
        error
      );

      return false;
    }
  };


/**
 * ==========================================================
 * 🔔 NOTIFICATION DE TEST
 * ==========================================================
 *
 * Cette fonction permet de vérifier rapidement que les
 * notifications locales fonctionnent sur Android.
 *
 * La notification apparaît 5 secondes après l'appel.
 */
export const sendTestNotification =
  async () => {

    try {

      console.log(
        "[Notifications] 🔔 Préparation notification de test..."
      );


      /**
       * Vérifier la permission.
       */
      const permission =
        await requestNotificationPermission();


      if (!permission) {

        console.warn(
          "[Notifications] ❌ Permission refusée."
        );

        return false;
      }


      /**
       * Supprimer une éventuelle ancienne
       * notification de test.
       */
      try {

        await LocalNotifications.cancel({

          notifications: [
            {
              id:
                TEST_NOTIFICATION_ID,
            },
          ],

        });

      } catch (error) {

        console.warn(
          "[Notifications] Ancien test non annulé :",
          error
        );
      }


      /**
       * Date actuelle.
       */
      const notificationDate =
        new Date();


      /**
       * Ajouter 5 secondes.
       */
      notificationDate.setSeconds(
        notificationDate.getSeconds() + 5
      );


      /**
       * Programmer la notification.
       */
      await LocalNotifications.schedule({

        notifications: [

          {

            id:
              TEST_NOTIFICATION_ID,

            title:
              "🔔 Test de notification",

            body:
              "Les notifications de votre application fonctionnent correctement !",

            schedule: {
              at: notificationDate,
              allowWhileIdle: true,
            },

            sound:
              "default",

            smallIcon:
              "ic_stat_icon_config_sample",

            extra: {
              type:
                "test",
            },

          },

        ],

      });


      console.log(
        "[Notifications] ✅ Notification de test programmée dans 5 secondes."
      );

      return true;

    } catch (error) {

      console.error(
        "[Notifications] ❌ Erreur notification de test :",
        error
      );

      return false;
    }
  };