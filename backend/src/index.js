import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
const trustProxyHops = Number(
  process.env.TRUST_PROXY_HOPS
    ?? (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT ? 1 : 0),
);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
  throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10.");
}

const { app } = createApp({
  databasePath: process.env.DATABASE_PATH ?? "./data/egc.sqlite",
  jwtSecret: process.env.JWT_SECRET,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  publicOrigins: process.env.PUBLIC_ORIGINS?.split(","),
  trustProxyHops,
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
});

app.listen(port, "0.0.0.0", () => {
  console.log(`EGC API listening on port ${port}`);
});
