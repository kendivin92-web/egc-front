const CACHE_NAME = "egc-announcement-images-v1";
const API_ORIGIN = new URL(self.location.href).searchParams.get("apiOrigin");

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_ANNOUNCEMENT_IMAGES") return;
  const imageUrls = Array.isArray(event.data.imageUrls) ? event.data.imageUrls : [];
  event.waitUntil(cacheAnnouncementImages(imageUrls));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.destination !== "image" || !isAnnouncementImage(request.url)) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      console.warn("Announcement image is not available offline:", request.url, error);
      return Response.error();
    }
  })());
});

function isAnnouncementImage(value) {
  if (!API_ORIGIN) return false;
  try {
    const url = new URL(value);
    return url.origin === API_ORIGIN && url.pathname.startsWith("/uploads/");
  } catch {
    return false;
  }
}

async function cacheAnnouncementImages(imageUrls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(imageUrls.filter(isAnnouncementImage).map(async (url) => {
    try {
      const request = new Request(url, { mode: "no-cors" });
      if (await cache.match(request)) return;
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
      }
    } catch (error) {
      console.warn("Unable to cache announcement image:", url, error);
    }
  }));
}
