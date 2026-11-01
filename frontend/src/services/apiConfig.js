import { Capacitor } from "@capacitor/core";

const PRODUCTION_API_URL = "https://egliseglorieuseduchrist.up.railway.app";

export const API_URL = (
  import.meta.env.VITE_API_URL
  || (Capacitor.isNativePlatform() || import.meta.env.PROD
    ? PRODUCTION_API_URL
    : "http://localhost:8080")
).replace(/\/+$/, "");
