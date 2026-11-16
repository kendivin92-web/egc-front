import localforage from "localforage";
import readingPlan from "../plan_lecture.json";

const offlineStore = localforage.createInstance({
  name: "egc-offline",
  storeName: "app_data",
});

const CONTENT = {
  readingPlan: "content:reading-plan",
};

const LEGACY_PREFERENCES = [
  "theme",
  "annonces",
  "evenements",
  "egc_bible_favorites",
  "egc_personalized_reading_progress",
  "egc_personalized_reading_theme",
  "plan_lecture_progression",
  "plan_lecture_historique",
];

export async function initializeOfflineStorage() {
  await offlineStore.setItem(CONTENT.readingPlan, readingPlan);

  await Promise.all(
    LEGACY_PREFERENCES.map(async (key) => {
      const cacheKey = `preference:${key}`;
      const cachedValue = await offlineStore.getItem(cacheKey);
      if (cachedValue !== null) return;

      const legacyValue = localStorage.getItem(key);
      if (legacyValue === null) return;

      try {
        await offlineStore.setItem(cacheKey, JSON.parse(legacyValue));
      } catch {
        await offlineStore.setItem(cacheKey, legacyValue);
      }
    }),
  );

  const cachedAnnouncements = await offlineStore.getItem("cache:annonces");
  if (!Array.isArray(cachedAnnouncements)) {
    const savedAnnouncements =
      (await offlineStore.getItem("preference:annonces")) ??
      (await offlineStore.getItem("preference:evenements"));
    if (Array.isArray(savedAnnouncements)) {
      await offlineStore.setItem("cache:annonces", savedAnnouncements);
    }
  }
}

export function getOfflineData(key) {
  return offlineStore.getItem(key);
}

export function setOfflineData(key, value) {
  return offlineStore.setItem(key, value);
}

export function getOfflinePreference(key) {
  return offlineStore.getItem(`preference:${key}`);
}

export function setOfflinePreference(key, value) {
  return offlineStore.setItem(`preference:${key}`, value);
}
