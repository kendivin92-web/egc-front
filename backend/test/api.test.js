import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createApp } from "../src/app.js";

const ADMIN_EMAIL = "admin@example.org";
const ADMIN_PASSWORD = "test-password-that-is-long-enough";
const JWT_SECRET = "unit-test-jwt-secret-with-at-least-32-characters";
const key = (lastDigit) => `d5a4e5f0-1200-4000-8000-00000000000${lastDigit}`;

test("registrations are idempotent, validated duplicates are blocked, and donations stay unpaid", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "egc-api-test-"));
  const { app, db } = createApp({
    databasePath: path.join(directory, "test.sqlite"),
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    publicOrigins: [
      "capacitor://localhost",
      "https://egliseglorieuseduchrist.up.railway.app",
    ],
    trustProxyHops: 1,
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
    await rm(directory, { recursive: true, force: true });
  });

  const request = (route, options = {}) => fetch(`${baseUrl}${route}`, options);
  const jsonRequest = (route, method, body, headers = {}) => request(route, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  const root = await request("/");
  assert.equal(root.status, 200);
  assert.equal(root.headers.get("x-content-type-options"), "nosniff");
  assert.equal(root.headers.get("x-powered-by"), null);
  assert.deepEqual(await root.json(), {
    service: "EGC API",
    status: "ok",
    health: "/api/health",
  });

  const allowedPreflight = await request("/api/annonces", {
    method: "OPTIONS",
    headers: {
      Origin: "https://egliseglorieuseduchrist.up.railway.app",
      "Access-Control-Request-Method": "GET",
    },
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(
    allowedPreflight.headers.get("access-control-allow-origin"),
    "https://egliseglorieuseduchrist.up.railway.app",
  );
  const blockedPreflight = await request("/api/annonces", {
    method: "OPTIONS",
    headers: {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "GET",
    },
  });
  assert.equal(blockedPreflight.headers.get("access-control-allow-origin"), null);

  const unauthorized = await request("/api/admin/registrations");
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");

  const invalidLogin = await jsonRequest("/api/admin/auth/login", "POST", {
    email: ADMIN_EMAIL,
    password: "wrong-password",
  });
  assert.equal(invalidLogin.status, 401);

  const login = await jsonRequest("/api/admin/auth/login", "POST", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("cache-control"), "no-store");
  const { token } = await login.json();
  const adminHeaders = { Authorization: `Bearer ${token}` };

  const unauthenticatedAnnouncements = await request("/api/admin/annonces");
  assert.equal(unauthenticatedAnnouncements.status, 401);
  const unauthenticatedUpload = await request("/api/admin/uploads", {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  assert.equal(unauthenticatedUpload.status, 401);

  for (const telephone of ["06ABC123456", "1234567890123"]) {
    const invalidPhone = await jsonRequest("/api/inscription", "POST", {
      nom: "Test",
      prenom: "User",
      telephone1: telephone,
    });
    assert.equal(invalidPhone.status, 400);
  }

  const missingAddress = await jsonRequest("/api/formations", "POST", {
    formation: "Formation biblique",
    nom: "Test",
    prenom: "User",
    telephone: "061234567",
  });
  assert.equal(missingAddress.status, 400);

  const formation = {
    formation: "Formation biblique",
    nom: "Mabiala",
    prenom: "Aline",
    telephone: "+242 06 123 45 67",
    email: "aline@example.org",
    adresse: "12 rue de la Paix",
    ville: "Brazzaville",
    arrondissement: "Bacongo",
  };
  const first = await jsonRequest("/api/formations", "POST", formation, {
    "Idempotency-Key": key(1),
  });
  assert.equal(first.status, 201);
  const firstData = await first.json();
  assert.equal("address" in firstData.registration, false);

  const resubmittedWhilePending = await jsonRequest("/api/formations", "POST", {
    ...formation,
    telephone: "061234567",
    email: "aline.updated@example.org",
  }, { "Idempotency-Key": key(2) });
  assert.equal(resubmittedWhilePending.status, 200);
  assert.equal((await resubmittedWhilePending.json()).registration.id, firstData.registration.id);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 1);

  const adminRegistrationList = await request("/api/admin/registrations", {
    headers: adminHeaders,
  });
  const adminRegistrationData = await adminRegistrationList.json();
  assert.equal(adminRegistrationData.registrations[0].address, "12 rue de la Paix");
  assert.equal(adminRegistrationData.registrations[0].city, "Brazzaville");
  assert.equal(adminRegistrationData.registrations[0].district, "Bacongo");

  const announcement = {
    title: "Culte du dimanche",
    type: "Culte",
    date: "Dimanche 10h",
    lieu: "Brazzaville",
    freq: "Hebdomadaire",
    contenu: "Bienvenue à tous.",
    image: "",
    showInCarousel: false,
    published: true,
  };
  const unauthorizedAnnouncementCreate = await jsonRequest(
    "/api/admin/annonces",
    "POST",
    announcement,
  );
  assert.equal(unauthorizedAnnouncementCreate.status, 401);
  const createdAnnouncement = await jsonRequest(
    "/api/admin/annonces",
    "POST",
    announcement,
    adminHeaders,
  );
  assert.equal(createdAnnouncement.status, 201);
  const announcementData = await createdAnnouncement.json();
  const publicAnnouncements = await request("/api/annonces");
  assert.equal(publicAnnouncements.status, 200);
  assert.equal((await publicAnnouncements.json()).length, 1);
  const missingCarouselImage = await jsonRequest(
    "/api/admin/annonces",
    "POST",
    { ...announcement, showInCarousel: true },
    adminHeaders,
  );
  assert.equal(missingCarouselImage.status, 400);

  const png = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 0, 73, 69, 78, 68,
    174, 66, 96, 130,
  ]);
  const uploadResponse = await request("/api/admin/uploads", {
    method: "POST",
    headers: { ...adminHeaders, "Content-Type": "image/png" },
    body: png,
  });
  assert.equal(uploadResponse.status, 201);
  const uploaded = await uploadResponse.json();
  const uploadedResponse = await request(uploaded.image);
  assert.equal(uploadedResponse.status, 200);
  assert.equal(uploadedResponse.headers.get("content-type"), "image/png");
  assert.equal(
    uploadedResponse.headers.get("cross-origin-resource-policy"),
    "cross-origin",
  );

  const seminar = {
    ...announcement,
    title: "Séminaire de la jeunesse",
    type: "Séminaire",
    image: uploaded.image,
    showInCarousel: true,
  };
  const createdSeminar = await jsonRequest(
    "/api/admin/annonces",
    "POST",
    seminar,
    adminHeaders,
  );
  assert.equal(createdSeminar.status, 201);
  const publicAnnouncementsWithSeminar = await (await request("/api/annonces")).json();
  assert.equal(publicAnnouncementsWithSeminar.length, 2);
  assert.equal(publicAnnouncementsWithSeminar[0].type, "Séminaire");
  assert.equal(publicAnnouncementsWithSeminar[0].showInCarousel, true);
  const adminAnnouncementList = await request("/api/admin/annonces", {
    headers: adminHeaders,
  });
  assert.equal(adminAnnouncementList.status, 200);
  const adminAnnouncements = await adminAnnouncementList.json();
  assert.equal(adminAnnouncements[0].showInCarousel, true);

  const unpublishedAnnouncement = await jsonRequest(
    `/api/admin/annonces/${announcementData.id}`,
    "PATCH",
    { ...announcement, image: uploaded.image, showInCarousel: true, published: false },
    adminHeaders,
  );
  assert.equal(unpublishedAnnouncement.status, 200);
  assert.equal((await (await request("/api/annonces")).json()).length, 1);
  const deleteAnnouncement = await request(
    `/api/admin/annonces/${announcementData.id}`,
    { method: "DELETE", headers: adminHeaders },
  );
  assert.equal(deleteAnnouncement.status, 204);

  const confirmed = await jsonRequest(
    `/api/admin/registrations/${firstData.registration.id}`,
    "PATCH",
    { status: "confirmed" },
    adminHeaders,
  );
  assert.equal(confirmed.status, 200);

  const conflictingAdminUpdate = await jsonRequest(
    `/api/admin/registrations/${firstData.registration.id}`,
    "PATCH",
    { status: "rejected" },
    adminHeaders,
  );
  assert.equal(conflictingAdminUpdate.status, 409);

  const confirmedDuplicate = await jsonRequest("/api/formations", "POST", formation, {
    "Idempotency-Key": key(3),
  });
  assert.equal(confirmedDuplicate.status, 409);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 1);

  const rejectedFormation = await jsonRequest("/api/formations", "POST", {
    ...formation,
    formation: "Chant",
  }, { "Idempotency-Key": key(5) });
  assert.equal(rejectedFormation.status, 201);
  const rejectedData = await rejectedFormation.json();
  const rejectRequest = await jsonRequest(
    `/api/admin/registrations/${rejectedData.registration.id}`,
    "PATCH",
    { status: "rejected" },
    adminHeaders,
  );
  assert.equal(rejectRequest.status, 200);
  const resubmittedAfterRejection = await jsonRequest("/api/formations", "POST", {
    ...formation,
    formation: "Chant",
  }, { "Idempotency-Key": key(6) });
  assert.equal(resubmittedAfterRejection.status, 200);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM registrations
    WHERE activity_key = 'formation:chant' AND normalized_phone = '061234567'
  `).get().count, 1);

  const donation = {
    noms_prenoms: "Aline Mabiala",
    phone: "061234567",
    amount: 5000,
    operator: "MTN Mobile Money",
  };
  const firstDonation = await jsonRequest("/api/pay", "POST", donation, {
    "Idempotency-Key": key(4),
  });
  assert.equal(firstDonation.status, 202);
  const firstDonationData = await firstDonation.json();
  assert.match(firstDonationData.message, /Aucun paiement n’a été effectué/);

  const retriedDonation = await jsonRequest("/api/pay", "POST", donation, {
    "Idempotency-Key": key(4),
  });
  assert.equal(retriedDonation.status, 202);
  const retriedDonationData = await retriedDonation.json();
  assert.equal(retriedDonationData.donationId, firstDonationData.donationId);
  assert.equal(retriedDonationData.replay, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM donation_intents").get().count, 1);

  const conflictingReplay = await jsonRequest("/api/pay", "POST", {
    ...donation,
    amount: 7000,
  }, { "Idempotency-Key": key(4) });
  assert.equal(conflictingReplay.status, 409);

  const registrations = await request("/api/admin/registrations?status=confirmed", {
    headers: adminHeaders,
  });
  assert.equal(registrations.status, 200);
  assert.equal((await registrations.json()).registrations[0].status, "confirmed");

  const donations = await request("/api/admin/donations", { headers: adminHeaders });
  assert.equal(donations.status, 200);
  const donationRows = (await donations.json()).donations;
  assert.equal(donationRows.length, 1);
  assert.equal(donationRows[0].status, "pending_provider");

  const forwardedIp = "198.51.100.10";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await jsonRequest("/api/admin/auth/login", "POST", {
      email: ADMIN_EMAIL,
      password: "wrong-password",
    }, { "X-Forwarded-For": forwardedIp });
    assert.equal(response.status, 401);
  }
  const rateLimited = await jsonRequest("/api/admin/auth/login", "POST", {
    email: ADMIN_EMAIL,
    password: "wrong-password",
  }, { "X-Forwarded-For": forwardedIp });
  assert.equal(rateLimited.status, 429);

  const separateIp = await jsonRequest("/api/admin/auth/login", "POST", {
    email: ADMIN_EMAIL,
    password: "wrong-password",
  }, { "X-Forwarded-For": "198.51.100.11" });
  assert.equal(separateIp.status, 401);
});

test("server refuses weak secrets and bootstrap passwords", () => {
  assert.throws(() => createApp({
    databasePath: ":memory:",
    jwtSecret: "short",
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
  }), /JWT_SECRET/);
  assert.throws(() => createApp({
    databasePath: ":memory:",
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: "short",
  }), /ADMIN_EMAIL/);
  assert.throws(() => createApp({
    databasePath: ":memory:",
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    trustProxyHops: -1,
  }), /TRUST_PROXY_HOPS/);
});

test("existing registration addresses and announcement carousel settings are migrated", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "egc-api-migration-test-"));
  const databasePath = path.join(directory, "legacy.sqlite");
  const legacyDb = new DatabaseSync(databasePath);
  legacyDb.exec(`
    CREATE TABLE announcements (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      lieu TEXT NOT NULL DEFAULT '',
      freq TEXT NOT NULL DEFAULT '',
      contenu TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO announcements (title, type, contenu, image)
    VALUES ('Culte', 'Culte', 'Annonce existante', '/uploads/legacy.jpg');

    CREATE TABLE registrations (
      id INTEGER PRIMARY KEY,
      registration_kind TEXT NOT NULL,
      activity_key TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      email TEXT,
      answers_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (activity_key, normalized_phone)
    );
    INSERT INTO registrations (
      registration_kind, activity_key, activity_name, first_name, last_name,
      phone, normalized_phone, answers_json
    ) VALUES (
      'membership', 'membership:eglise', 'Inscription à l’église', 'Aline',
      'Mabiala', '061234567', '061234567',
      '{"adresse":"12 rue de la Paix","ville":"Brazzaville","arrondissement":"Bacongo"}'
    );
  `);
  legacyDb.close();

  const { db } = createApp({
    databasePath,
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
  });
  try {
    const registration = db.prepare(
      "SELECT address, city, district FROM registrations WHERE id = 1",
    ).get();
    assert.deepEqual({ ...registration }, {
      address: "12 rue de la Paix",
      city: "Brazzaville",
      district: "Bacongo",
    });
    const announcement = db.prepare(
      "SELECT show_in_carousel FROM announcements WHERE id = 1",
    ).get();
    assert.equal(announcement.show_in_carousel, 1);
  } finally {
    db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("public video endpoint returns the four latest distinct Sunday sermons and caches them", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "egc-youtube-test-"));
  const entries = [
    ["abcdefghijk", "EGC - CULTE DU DIMANCHE 18/10/2026", "2026-10-18T22:37:18Z"],
    ["bcdefghijkl", "EGC - CULTE DU DIMANCHE 18/10/2026", "2026-10-18T11:27:30Z"],
    ["cdefghijklm", "EGC - SEMINAIRE SPECIAL - JOUR 3", "2026-10-17T19:15:57Z"],
    ["defghijklmn", "EGC - CULTE DU DIMANCHE 11/10/2026", "2026-10-11T22:52:54Z"],
    ["efghijklmno", "EGC - CULTE DU DIMANCHE 04/10/2026", "2026-10-04T22:43:49Z"],
    ["fghijklmnop", "EGC - CULTE DU DIMANCHE 27/09/2026", "2026-09-27T23:25:41Z"],
  ];
  const xml = `<feed>${entries.map(([id, title, published]) => `
    <entry><yt:videoId>${id}</yt:videoId><title>${title}</title>
    <published>${published}</published></entry>`).join("")}</feed>`;
  let fetchCount = 0;
  const { app, db } = createApp({
    databasePath: path.join(directory, "test.sqlite"),
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    fetchYouTubeFeed: async (url) => {
      fetchCount += 1;
      assert.match(url, /channel_id=UCQi00Q-CJ5mGtbeMnrlqc4Q/);
      return new Response(xml, { status: 200 });
    },
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
    await rm(directory, { recursive: true, force: true });
  });

  const response = await fetch(`${baseUrl}/api/videos`);
  assert.equal(response.status, 200);
  const videos = await response.json();
  assert.equal(videos.length, 4);
  assert.deepEqual(videos.map((video) => video.id), [
    "abcdefghijk",
    "defghijklmn",
    "efghijklmno",
    "fghijklmnop",
  ]);
  assert.equal(videos[0].date, "2026-10-18");
  assert.equal(response.headers.get("cache-control"), "public, max-age=300");

  const cachedResponse = await fetch(`${baseUrl}/api/videos`);
  assert.equal(cachedResponse.status, 200);
  assert.equal(fetchCount, 1);
});

test("admin registration lists paginate beyond 2,000 records", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "egc-api-pagination-test-"));
  const { app, db } = createApp({
    databasePath: path.join(directory, "test.sqlite"),
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
    await rm(directory, { recursive: true, force: true });
  });

  const login = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const insertRegistration = db.prepare(`
    INSERT INTO registrations (
      registration_kind, activity_key, activity_name, first_name, last_name,
      phone, normalized_phone, answers_json, status
    ) VALUES ('membership', ?, 'Inscription à l’église', ?, 'Test', ?, ?, '{}', ?)
  `);
  db.exec("BEGIN");
  for (let id = 1; id <= 2_105; id += 1) {
    insertRegistration.run(
      `membership:${id}`,
      `Membre${id}`,
      `060000${String(id).padStart(3, "0")}`,
      `060000${String(id).padStart(3, "0")}`,
      id % 2 === 0 ? "pending" : "confirmed",
    );
  }
  db.exec("COMMIT");

  const firstPageResponse = await fetch(
    `${baseUrl}/api/admin/registrations?limit=25&page=1`,
    { headers },
  );
  assert.equal(firstPageResponse.status, 200);
  const firstPage = await firstPageResponse.json();
  assert.equal(firstPage.registrations.length, 25);
  assert.equal(firstPage.pagination.total, 2_105);
  assert.equal(firstPage.pagination.totalPages, 85);
  assert.equal(firstPage.registrations[0].id, 2_105);
  assert.equal(firstPage.summary.registrations.pending, 1_052);

  const lastPageResponse = await fetch(
    `${baseUrl}/api/admin/registrations?limit=25&page=85`,
    { headers },
  );
  const lastPage = await lastPageResponse.json();
  assert.equal(lastPage.registrations.length, 5);
  assert.equal(lastPage.pagination.page, 85);

  const filteredResponse = await fetch(
    `${baseUrl}/api/admin/registrations?status=pending&limit=10`,
    { headers },
  );
  const filtered = await filteredResponse.json();
  assert.equal(filtered.pagination.total, 1_052);
  assert.ok(filtered.registrations.every((registration) => registration.status === "pending"));

  const invalidLimitResponse = await fetch(
    `${baseUrl}/api/admin/registrations?limit=101`,
    { headers },
  );
  assert.equal(invalidLimitResponse.status, 400);
});

test("API accepts registrations from 2,000 simulated users", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "egc-api-load-test-"));
  const { app, db } = createApp({
    databasePath: path.join(directory, "test.sqlite"),
    jwtSecret: JWT_SECRET,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
  });
  app.set("trust proxy", 1);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
    await rm(directory, { recursive: true, force: true });
  });

  const results = [];
  for (let batchStart = 1; batchStart <= 2_000; batchStart += 100) {
    const batchSize = Math.min(100, 2_001 - batchStart);
    const batch = await Promise.all(Array.from({ length: batchSize }, async (_, offset) => {
      const userId = batchStart + offset;
      const body = {
        nom: "LoadTest",
        prenom: `User${userId}`,
        telephone1: `06${String(userId).padStart(7, "0")}`,
        adresse: "12 rue de la Paix",
        ville: "Brazzaville",
        arrondissement: "Bacongo",
      };
      const response = await fetch(`${baseUrl}/api/inscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
          "X-Forwarded-For": `10.${Math.floor(userId / 65_536)}.${Math.floor(userId / 256) % 256}.${userId % 256}`,
        },
        body: JSON.stringify(body),
      });
      return response.status;
    }));
    results.push(...batch);
  }

  assert.equal(results.length, 2_000);
  assert.ok(results.every((status) => status === 201));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 2_000);
});
