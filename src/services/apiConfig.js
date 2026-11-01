import { Capacitor } from "@capacitor/core";

const PRODUCTION_API_URL = "https://egc-front-production.up.railway.app";

export const API_URL = (
  import.meta.env.VITE_API_URL
  || (Capacitor.isNativePlatform() || import.meta.env.PROD
    ? PRODUCTION_API_URL
    : "http://localhost:8080")
).replace(/\/+$/, "");

export const YOUTUBE_CHANNEL_URL =
  import.meta.env.VITE_YOUTUBE_CHANNEL_URL
  || "https://www.youtube.com/@egliseglorieuseduchrist";
