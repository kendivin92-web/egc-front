import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useNavigate } from "react-router-dom";

export default function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const handler = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.then((listener) => listener.remove()).catch((error) => {
        console.error("Unable to remove Android back-button listener:", error);
      });
    };
  }, [navigate]);

  return null;
}
