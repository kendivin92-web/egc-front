import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

const { app } = createApp({
  databasePath: process.env.DATABASE_PATH ?? "./data/egc.sqlite",
  jwtSecret: process.env.JWT_SECRET,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  publicOrigins: process.env.PUBLIC_ORIGINS?.split(","),
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
});

app.listen(port, "0.0.0.0", () => {
  console.log(`EGC API listening on port ${port}`);
});
