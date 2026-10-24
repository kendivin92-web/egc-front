import { useEffect, useState } from "react";

import {
  Bell,
  Clock,
  Moon,
  Sun,
} from "lucide-react";

import {
  getReminderSettings,

  setMorningEnabled,
  setMorningTime,

  setEveningEnabled,
  setEveningTime,

  setNotificationPermissionAsked,
} from "../services/storageService";

import {
  requestNotificationPermission,
  scheduleMorningNotification,
  scheduleEveningNotification,
  cancelMorningNotification,
  cancelEveningNotification,
} from "../services/notificationService";


function Rappel({ dark }) {

  // ==========================================================
  // MATIN
  // ==========================================================

  const [morningEnabled, setMorningEnabledState] =
    useState(false);

  const [morningTime, setMorningTimeState] =
    useState("07:00");


  // ==========================================================
  // SOIR
  // ==========================================================

  const [eveningEnabled, setEveningEnabledState] =
    useState(false);

  const [eveningTime, setEveningTimeState] =
    useState("21:00");


  // ==========================================================
  // PERMISSION
  // ==========================================================

  const [
    showPermissionMessage,
    setShowPermissionMessage,
  ] = useState(false);

  const [
    permissionTarget,
    setPermissionTarget,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  useEffect(() => {

    const loadSettings = async () => {

      try {

        const settings =
          await getReminderSettings();

        if (settings) {

          setMorningEnabledState(
            Boolean(settings.morningEnabled)
          );

          setMorningTimeState(
            settings.morningTime || "07:00"
          );

          setEveningEnabledState(
            Boolean(settings.eveningEnabled)
          );

          setEveningTimeState(
            settings.eveningTime || "21:00"
          );

        }

      } catch (error) {

        console.error(
          "[Rappel] Erreur chargement :",
          error
        );

      } finally {

        setLoading(false);

      }

    };

    loadSettings();

  }, []);


  // ==========================================================
  // DEMANDE PERMISSION
  // ==========================================================

  const askForPermission = (target) => {

    setPermissionTarget(target);

    setShowPermissionMessage(true);

  };


  // ==========================================================
  // ACTIVER MATIN
  // ==========================================================

  const activateMorning = async () => {

    try {

      console.log(
        "[Rappel] Programmation matin :",
        morningTime
      );

      const scheduled =
        await scheduleMorningNotification(
          morningTime
        );

      if (!scheduled) {

        console.error(
          "[Rappel] Échec programmation matin."
        );

        setMorningEnabledState(false);

        return false;

      }

      await setMorningEnabled(true);

      setMorningEnabledState(true);

      console.log(
        "[Rappel] Matin activé."
      );

      return true;

    } catch (error) {

      console.error(
        "[Rappel] Erreur activation matin :",
        error
      );

      setMorningEnabledState(false);

      return false;

    }

  };


  // ==========================================================
  // ACTIVER SOIR
  // ==========================================================

  const activateEvening = async () => {

    try {

      console.log(
        "[Rappel] Programmation soir :",
        eveningTime
      );

      const scheduled =
        await scheduleEveningNotification(
          eveningTime
        );

      if (!scheduled) {

        console.error(
          "[Rappel] Échec programmation soir."
        );

        setEveningEnabledState(false);

        return false;

      }

      await setEveningEnabled(true);

      setEveningEnabledState(true);

      console.log(
        "[Rappel] Soir activé."
      );

      return true;

    } catch (error) {

      console.error(
        "[Rappel] Erreur activation soir :",
        error
      );

      setEveningEnabledState(false);

      return false;

    }

  };


  // ==========================================================
  // TOGGLE MATIN
  // ==========================================================

  const handleMorningToggle = async () => {

    if (loading) {
      return;
    }

    // Désactivation
    if (morningEnabled) {

      await cancelMorningNotification();

      await setMorningEnabled(false);

      setMorningEnabledState(false);

      return;

    }

    try {

      const settings =
        await getReminderSettings();

      if (
        !settings.notificationPermissionAsked
      ) {

        askForPermission("morning");

        return;

      }

      const permission =
        await requestNotificationPermission();

      if (!permission) {

        console.warn(
          "[Rappel] Permission refusée."
        );

        return;

      }

      await activateMorning();

    } catch (error) {

      console.error(
        "[Rappel] Erreur toggle matin :",
        error
      );

    }

  };


  // ==========================================================
  // TOGGLE SOIR
  // ==========================================================

  const handleEveningToggle = async () => {

    if (loading) {
      return;
    }

    // Désactivation
    if (eveningEnabled) {

      await cancelEveningNotification();

      await setEveningEnabled(false);

      setEveningEnabledState(false);

      return;

    }

    try {

      const settings =
        await getReminderSettings();

      if (
        !settings.notificationPermissionAsked
      ) {

        askForPermission("evening");

        return;

      }

      const permission =
        await requestNotificationPermission();

      if (!permission) {

        console.warn(
          "[Rappel] Permission refusée."
        );

        return;

      }

      await activateEvening();

    } catch (error) {

      console.error(
        "[Rappel] Erreur toggle soir :",
        error
      );

    }

  };


  // ==========================================================
  // ACCEPTER PERMISSION
  // ==========================================================
const handleAcceptNotifications = async () => {
  try {

    setShowPermissionMessage(false);

    const granted =
      await requestNotificationPermission();

    await setNotificationPermissionAsked(true);

    if (!granted) {

      alert(
        "❌ Permission de notification refusée."
      );

      setPermissionTarget(null);

      return;
    }

    let result = false;

    if (permissionTarget === "morning") {

      result =
        await activateMorning();

    }

    if (permissionTarget === "evening") {

      result =
        await activateEvening();

    }

    if (!result) {

      alert(
        "❌ La notification n'a pas pu être programmée."
      );

    } else {

      console.log();
      (
        "✅ Notification programmée avec succès !"
      );

    }

    setPermissionTarget(null);

  } catch (error) {

    console.error(
      "[Rappel] Erreur permission :",
      error
    );

    alert(
      "❌ Erreur : " +
      (error?.message || error)
    );

    setPermissionTarget(null);
  }
};


  // ==========================================================
  // PLUS TARD
  // ==========================================================

  const handleCancelPermission =
    async () => {

      setShowPermissionMessage(false);

      await setNotificationPermissionAsked(
        true
      );

      setPermissionTarget(null);

    };


  // ==========================================================
  // CHANGEMENT HEURE MATIN
  // ==========================================================

  const handleMorningTimeChange =
    async (event) => {

      const newTime =
        event.target.value;

      setMorningTimeState(newTime);

      try {

        await setMorningTime(newTime);

        if (morningEnabled) {

          await scheduleMorningNotification(
            newTime
          );

        }

      } catch (error) {

        console.error(
          "[Rappel] Erreur heure matin :",
          error
        );

      }

    };


  // ==========================================================
  // CHANGEMENT HEURE SOIR
  // ==========================================================

  const handleEveningTimeChange =
    async (event) => {

      const newTime =
        event.target.value;

      setEveningTimeState(newTime);

      try {

        await setEveningTime(newTime);

        if (eveningEnabled) {

          await scheduleEveningNotification(
            newTime
          );

        }

      } catch (error) {

        console.error(
          "[Rappel] Erreur heure soir :",
          error
        );

      }

    };


  // ==========================================================
  // STYLES
  // ==========================================================

  const cardStyle = {

    marginTop: 20,

    padding: 20,

    borderRadius: 16,

    background:
      dark
        ? "#2c2c2e"
        : "#f0f4fb",

    border:
      dark
        ? "1px solid #2c3e6b"
        : "1px solid #e1e7f0",

  };


  const labelStyle = {

    display: "flex",

    alignItems: "center",

    gap: 12,

  };


  const iconContainerStyle = {

    width: 42,

    height: 42,

    borderRadius: 12,

    background:
      dark
        ? "#263957"
        : "#ffffff",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    color: "#c9a84c",

    flexShrink: 0,

  };


  const toggleStyle = (enabled) => ({

    width: 48,

    height: 27,

    borderRadius: 20,

    border: "none",

    padding: 3,

    background:
      enabled
        ? "#c9a84c"
        : dark
        ? "#46546b"
        : "#cbd3df",

    cursor: "pointer",

    display: "flex",

    alignItems: "center",

    justifyContent:
      enabled
        ? "flex-end"
        : "flex-start",

    transition:
      "all 0.2s ease",

  });


  const toggleCircleStyle = {

    width: 21,

    height: 21,

    borderRadius: "50%",

    background: "#ffffff",

    boxShadow:
      "0 2px 5px rgba(0,0,0,0.2)",

  };


  const timeInputStyle = {

    marginTop: 15,

    width: "100%",

    boxSizing: "border-box",

    padding: "12px 14px",

    borderRadius: 10,

    border:
      dark
        ? "1px solid #35496b"
        : "1px solid #d7deea",

    background:
      dark
        ? "#16243a"
        : "#ffffff",

    color:
      dark
        ? "#f0e6c8"
        : "#173b70",

    fontSize: 16,

    outline: "none",

  };


  // ==========================================================
  // RENDU
  // ==========================================================

  return (

    <div
      style={{
        minHeight: "100vh",

        padding: "40px 20px",

        background:
          dark
            ? "#101c2e"
            : "#ffffff",

        color:
          dark
            ? "#f0e6c8"
            : "#173b70",

        boxSizing: "border-box",
      }}
    >

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
          }}
        >

          <div
            style={{
              width: 55,
              height: 55,

              margin:
                "0 auto 15px",

              borderRadius: "50%",

              background:
                dark
                  ? "#2c2c2e"
                  : "#f0f4fb",

              display: "flex",

              alignItems: "center",

              justifyContent:
                "center",

              color: "#c9a84c",
            }}
          >

            <Bell size={27} />

          </div>

          <h1
            style={{
              margin: 0,

              color:
                dark
                  ? "#f0e6c8"
                  : "#173b70",

              fontSize: 24,

              fontWeight: 700,
            }}
          >
            Rappel
          </h1>

          <p
            style={{
              marginTop: 10,

              color:
                dark
                  ? "#a1a1a6"
                  : "#6e6e73",

              fontSize: 14,

              lineHeight: 1.5,
            }}
          >
            Configurez vos rappels de
            lecture biblique.
          </p>

        </div>


        {/* ==================================================
            MATIN
        ================================================== */}

        <div style={cardStyle}>

          <div
            style={{
              display: "flex",

              alignItems: "center",

              justifyContent:
                "space-between",

              gap: 15,
            }}
          >

            <div style={labelStyle}>

              <div style={iconContainerStyle}>

                <Sun size={21} />

              </div>

              <div>

                <div
                  style={{
                    fontSize: 16,

                    fontWeight: 700,

                    color:
                      dark
                        ? "#f0e6c8"
                        : "#173b70",
                  }}
                >
                  Rappel du matin
                </div>

                <div
                  style={{
                    marginTop: 4,

                    fontSize: 13,

                    color:
                      dark
                        ? "#a1a1a6"
                        : "#6e6e73",
                  }}
                >
                  Recevoir un rappel le matin
                </div>

              </div>

            </div>

            <button
              type="button"

              onClick={
                handleMorningToggle
              }

              disabled={loading}

              aria-label=
                "Activer ou désactiver le rappel du matin"

              style={{
                ...toggleStyle(
                  morningEnabled
                ),

                opacity:
                  loading
                    ? 0.5
                    : 1,
              }}
            >

              <span
                style={
                  toggleCircleStyle
                }
              />

            </button>
                
          </div>


          <div
            style={{
              position: "relative",
            }}
          >

            <Clock
              size={18}

              style={{
                position: "absolute",

                left: 13,

                top: 27,

                color: "#c9a84c",

                pointerEvents:
                  "none",
              }}
            />

            <input
              type="time"

              value={morningTime}

              onChange={
                handleMorningTimeChange
              }

              disabled={
                !morningEnabled ||
                loading
              }

              style={{
                ...timeInputStyle,

                paddingLeft: 42,

                opacity:
                  morningEnabled &&
                  !loading
                    ? 1
                    : 0.5,
              }}
            />

          </div>

        </div>


        {/* ==================================================
            SOIR
        ================================================== */}

        <div style={cardStyle}>

          <div
            style={{
              display: "flex",

              alignItems: "center",

              justifyContent:
                "space-between",

              gap: 15,
            }}
          >

            <div style={labelStyle}>

              <div style={iconContainerStyle}>

                <Moon size={21} />

              </div>

              <div>

                <div
                  style={{
                    fontSize: 16,

                    fontWeight: 700,

                    color:
                      dark
                        ? "#f0e6c8"
                        : "#173b70",
                  }}
                >
                  Rappel du soir
                </div>

                <div
                  style={{
                    marginTop: 4,

                    fontSize: 13,

                    color:
                      dark
                        ? "#a1a1a6"
                        : "#6e6e73",
                  }}
                >
                  Recevoir un rappel le soir
                </div>

              </div>

            </div>

            <button
              type="button"

              onClick={
                handleEveningToggle
              }

              disabled={loading}

              aria-label=
                "Activer ou désactiver le rappel du soir"

              style={{
                ...toggleStyle(
                  eveningEnabled
                ),

                opacity:
                  loading
                    ? 0.5
                    : 1,
              }}
            >

              <span
                style={
                  toggleCircleStyle
                }
              />

            </button>

          </div>


          <div
            style={{
              position: "relative",
            }}
          >

            <Clock
              size={18}

              style={{
                position: "absolute",

                left: 13,

                top: 27,

                color: "#c9a84c",

                pointerEvents:
                  "none",
              }}
            />

            <input
              type="time"

              value={eveningTime}

              onChange={
                handleEveningTimeChange
              }

              disabled={
                !eveningEnabled ||
                loading
              }

              style={{
                ...timeInputStyle,

                paddingLeft: 42,

                opacity:
                  eveningEnabled &&
                  !loading
                    ? 1
                    : 0.5,
              }}
            />

          </div>

        </div>


        {/* INFORMATION */}

        <div
          style={{
            marginTop: 20,

            padding: 16,

            borderRadius: 12,

            background:
              dark
                ? "#16243a"
                : "#fafafa",

            color:
              dark
                ? "#8fa4bc"
                : "#718096",

            fontSize: 13,

            lineHeight: 1.5,

            textAlign: "center",
          }}
        >
          Les rappels utilisent
          l'heure locale de votre
          téléphone.
        </div>

      </div>


      {/* ====================================================
          POPUP PERMISSION
      ==================================================== */}

      {showPermissionMessage && (

        <div
          style={{
            position: "fixed",

            inset: 0,

            zIndex: 9999,

            background:
              "rgba(0, 0, 0, 0.55)",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            padding: 20,

            boxSizing:
              "border-box",
          }}
        >

          <div
            style={{
              width: "100%",

              maxWidth: 380,

              padding: 25,

              borderRadius: 18,

              background:
                dark
                  ? "#2c2c2e"
                  : "#ffffff",

              color:
                dark
                  ? "#f0e6c8"
                  : "#173b70",

              boxShadow:
                "0 15px 50px rgba(0,0,0,0.25)",

              textAlign:
                "center",
            }}
          >

            <div
              style={{
                width: 50,

                height: 50,

                margin:
                  "0 auto 15px",

                borderRadius: "50%",

                background:
                  dark
                    ? "#263957"
                    : "#f0f4fb",

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "center",

                color: "#c9a84c",
              }}
            >

              <Bell size={24} />

            </div>


            <h2
              style={{
                margin: 0,

                fontSize: 20,
              }}
            >
              Autoriser les rappels ?
            </h2>


            <p
              style={{
                margin:
                  "12px 0 22px",

                color:
                  dark
                    ? "#a1a1a6"
                    : "#6e6e73",

                fontSize: 14,

                lineHeight: 1.5,
              }}
            >
              Souhaitez-vous recevoir
              des notifications pour
              vos rappels de lecture
              biblique ?
            </p>


            <div
              style={{
                display: "flex",

                gap: 10,
              }}
            >

              <button
                type="button"

                onClick={
                  handleCancelPermission
                }

                style={{
                  flex: 1,

                  padding:
                    "12px 10px",

                  borderRadius: 10,

                  border:
                    dark
                      ? "1px solid #35496b"
                      : "1px solid #d7deea",

                  background:
                    "transparent",

                  color:
                    dark
                      ? "#f0e6c8"
                      : "#173b70",

                  cursor:
                    "pointer",

                  fontWeight: 600,
                }}
              >
                Plus tard
              </button>


              <button
                type="button"

                onClick={
                  handleAcceptNotifications
                }

                style={{
                  flex: 1,

                  padding:
                    "12px 10px",

                  borderRadius: 10,

                  border: "none",

                  background:
                    "#c9a84c",

                  color:
                    "#ffffff",

                  cursor:
                    "pointer",

                  fontWeight: 700,
                }}
              >
                Autoriser
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

export default Rappel;