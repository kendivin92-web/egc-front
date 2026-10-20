import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
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

  const unauthorized = await request("/api/admin/registrations");
  assert.equal(unauthorized.status, 401);

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
  const { token } = await login.json();
  const adminHeaders = { Authorization: `Bearer ${token}` };

  for (const telephone of ["06ABC123456", "1234567890123"]) {
    const invalidPhone = await jsonRequest("/api/inscription", "POST", {
      nom: "Test",
      prenom: "User",
      telephone1: telephone,
    });
    assert.equal(invalidPhone.status, 400);
  }

  const formation = {
    formation: "Formation biblique",
    nom: "Mabiala",
    prenom: "Aline",
    telephone: "+242 06 123 45 67",
    email: "aline@example.org",
  };
  const first = await jsonRequest("/api/formations", "POST", formation, {
    "Idempotency-Key": key(1),
  });
  assert.equal(first.status, 201);
  const firstData = await first.json();

  const resubmittedWhilePending = await jsonRequest("/api/formations", "POST", {
    ...formation,
    telephone: "061234567",
    email: "aline.updated@example.org",
  }, { "Idempotency-Key": key(2) });
  assert.equal(resubmittedWhilePending.status, 200);
  assert.equal((await resubmittedWhilePending.json()).registration.id, firstData.registration.id);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM registrations").get().count, 1);

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
