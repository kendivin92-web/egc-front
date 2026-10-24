import bcrypt from "bcryptjs";
import cors from "cors";
import { createHash, randomUUID } from "node:crypto";
import express from "express";
import { mkdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { openDatabase } from "./db.js";
import { parseSundayVideos } from "./youtube.js";

const DEFAULT_YOUTUBE_CHANNEL_ID = "UCQi00Q-CJ5mGtbeMnrlqc4Q";

const registrationAnswerSchema = z.record(
  z.string().min(1).max(60),
  z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
);

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
}).strict();

const donationSchema = z.object({
  noms_prenoms: z.string().trim().min(3).max(120),
  phone: z.string().trim().regex(/^\d{9}$/),
  amount: z.coerce.number().int().min(100).max(10_000_000),
  operator: z.literal("MTN Mobile Money"),
}).strict();

const registrationStatusSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
}).strict();

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z.enum(["Culte", "Formation", "Prière", "Spéciaux", "Retraite"]),
  date: z.string().trim().max(80).default(""),
  lieu: z.string().trim().max(120).default(""),
  freq: z.string().trim().max(80).default(""),
  contenu: z.string().trim().min(1).max(3000),
  image: z.string().regex(/^\/uploads\/[0-9a-f-]+\.(png|jpg|webp)$/i).or(z.literal("")).default(""),
  published: z.boolean().default(true),
}).strict();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashRequest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function inTransaction(db, operation) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function getIdempotencyKey(request) {
  const key = request.get("Idempotency-Key");
  return key && UUID_PATTERN.test(key) ? key : null;
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("242") && digits.length === 12 ? digits.slice(3) : digits;
}

function normalizeActivity(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function parseRegistration(body, kind) {
  const parsed = registrationAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return { error: "Données d’inscription invalides." };
  }

  const answers = parsed.data;
  const phone = answers.telephone1 ?? answers.telephone ?? answers.phone;
  const firstName = answers.prenom ?? answers.first_name;
  const lastName = answers.nom ?? answers.last_name;
  const activityName = kind === "formation" ? answers.formation : "Inscription à l’église";

  if (
    typeof phone !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof activityName !== "string"
  ) {
    return { error: "Nom, prénom et téléphone sont obligatoires." };
  }

  const normalizedPhone = normalizePhone(phone);
  const normalizedActivity = normalizeActivity(activityName);
  const email = answers.email;
  const address = answers.adresse ?? answers.address;
  const city = answers.ville ?? answers.city;
  const district = answers.arrondissement ?? answers.district;

  if (
    !/^\+?[\d\s().-]+$/.test(phone.trim()) ||
    normalizedPhone.length < 8 ||
    normalizedPhone.length > 12 ||
    firstName.trim().length < 1 ||
    lastName.trim().length < 1 ||
    typeof address !== "string" ||
    address.trim().length < 3 ||
    address.trim().length > 200 ||
    typeof city !== "string" ||
    city.trim().length < 2 ||
    city.trim().length > 100 ||
    typeof district !== "string" ||
    district.trim().length < 2 ||
    district.trim().length > 100 ||
    !normalizedActivity ||
    (email !== undefined &&
      (typeof email !== "string" ||
        (email.length > 0 && !z.email().safeParse(email).success)))
  ) {
    return { error: "Les coordonnées ou le nom de l’activité sont invalides." };
  }

  return {
    value: {
      registrationKind: kind,
      activityKey: `${kind}:${normalizedActivity}`,
      activityName: activityName.trim().slice(0, 120),
      firstName: firstName.trim().slice(0, 80),
      lastName: lastName.trim().slice(0, 80),
      phone: phone.trim().slice(0, 40),
      normalizedPhone,
      email: typeof email === "string" && email.length ? email.trim().slice(0, 254) : null,
      address: address.trim(),
      city: city.trim(),
      district: district.trim(),
      answers,
    },
  };
}

function findIdempotentRequest(db, key, requestType, requestHash) {
  const previous = db.prepare(`
    SELECT request_type, request_hash, resource_id
    FROM idempotency_requests
    WHERE idempotency_key = ?
  `).get(key);

  if (!previous) return null;
  if (previous.request_type !== requestType || previous.request_hash !== requestHash) {
    return { conflict: true };
  }
  return { resourceId: previous.resource_id };
}

function createRegistration(db, value, idempotencyKey) {
  const requestHash = hashRequest(value);

  return inTransaction(db, () => {
    const previous = findIdempotentRequest(db, idempotencyKey, "registration", requestHash);
    if (previous?.conflict) return { conflict: "idempotency" };
    if (previous) {
      return {
        registration: db.prepare("SELECT * FROM registrations WHERE id = ?").get(previous.resourceId),
        replay: true,
      };
    }

    const existing = db.prepare(`
      SELECT * FROM registrations
      WHERE activity_key = ? AND normalized_phone = ?
    `).get(value.activityKey, value.normalizedPhone);

    if (existing?.status === "confirmed") return { conflict: "already_confirmed" };

    let registration;
    let created = false;
    const answersJson = JSON.stringify(value.answers);

    if (existing) {
      db.prepare(`
        UPDATE registrations
        SET registration_kind = ?, activity_name = ?, first_name = ?, last_name = ?,
            phone = ?, email = ?, address = ?, city = ?, district = ?,
            answers_json = ?, status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        value.registrationKind,
        value.activityName,
        value.firstName,
        value.lastName,
        value.phone,
        value.email,
        value.address,
        value.city,
        value.district,
        answersJson,
        existing.id,
      );
      registration = db.prepare("SELECT * FROM registrations WHERE id = ?").get(existing.id);
    } else {
      const result = db.prepare(`
        INSERT INTO registrations (
          registration_kind, activity_key, activity_name, first_name, last_name,
          phone, normalized_phone, email, address, city, district, answers_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        value.registrationKind,
        value.activityKey,
        value.activityName,
        value.firstName,
        value.lastName,
        value.phone,
        value.normalizedPhone,
        value.email,
        value.address,
        value.city,
        value.district,
        answersJson,
      );
      registration = db.prepare("SELECT * FROM registrations WHERE id = ?").get(result.lastInsertRowid);
      created = true;
    }

    db.prepare(`
      INSERT INTO idempotency_requests (idempotency_key, request_type, request_hash, resource_id)
      VALUES (?, 'registration', ?, ?)
    `).run(idempotencyKey, requestHash, registration.id);

    return { registration, created, replay: false };
  });
}

function publicRegistration(row) {
  return {
    id: row.id,
    kind: row.registration_kind,
    activity: row.activity_name,
    status: row.status,
  };
}

function getAdminSummary(db) {
  const registrations = Object.fromEntries(
    db.prepare("SELECT status, COUNT(*) AS total FROM registrations GROUP BY status")
      .all()
      .map((row) => [row.status, row.total]),
  );
  const pendingDonations = db.prepare(`
    SELECT COUNT(*) AS total FROM donation_intents WHERE status = 'pending_provider'
  `).get().total;

  return {
    registrations,
    donations: { pending_provider: pendingDonations },
  };
}

export function createApp({
  databasePath,
  jwtSecret,
  adminEmail,
  adminPassword,
  publicOrigins,
  youtubeChannelId = DEFAULT_YOUTUBE_CHANNEL_ID,
  fetchYouTubeFeed = globalThis.fetch,
}) {
  if (typeof jwtSecret !== "string" || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  if (!adminEmail || !adminPassword || adminPassword.length < 14) {
    throw new Error("ADMIN_EMAIL and an ADMIN_PASSWORD of at least 14 characters are required.");
  }

  const db = openDatabase(databasePath);
  const uploadDirectory = join(dirname(resolve(databasePath)), "uploads");
  mkdirSync(uploadDirectory, { recursive: true });
  const existingAdmin = db.prepare("SELECT id FROM admins LIMIT 1").get();
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(adminPassword, 12);
    db.prepare("INSERT INTO admins (email, password_hash, role) VALUES (?, ?, 'admin')")
      .run(adminEmail.trim().toLowerCase(), passwordHash);
  }

  const adminRows = db.prepare("SELECT id, email, password_hash FROM admins").all();
  const dummyPasswordHash = bcrypt.hashSync(randomUUID(), 12);
  const allowedOrigins = new Set(
    (publicOrigins ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://localhost",
      "http://localhost",
      "capacitor://localhost",
    ]).map((origin) => origin.trim()).filter(Boolean),
  );

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }));
  app.use(express.json({ limit: "32kb", strict: true }));

  const publicWriteLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Trop de demandes. Veuillez réessayer plus tard." },
  });
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Trop de tentatives de connexion. Réessayez plus tard." },
  });
  const adminLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Trop de requêtes administrateur. Réessayez plus tard." },
  });

  function authenticateAdmin(request, response, next) {
    const authorization = request.get("Authorization") ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      response.status(401).json({ message: "Authentification requise." });
      return;
    }

    try {
      const claims = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
      if (claims.role !== "admin" || typeof claims.sub !== "string") {
        response.status(403).json({ message: "Accès administrateur requis." });
        return;
      }
      request.adminId = Number(claims.sub);
      next();
    } catch {
      response.status(401).json({ message: "Session invalide ou expirée." });
    }
  }

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/", (_request, response) => {
    response.json({ service: "EGC API", status: "ok", health: "/api/health" });
  });

  app.use("/uploads", express.static(uploadDirectory, {
    dotfiles: "deny",
    index: false,
  }));

  app.get("/api/annonces", (_request, response) => {
    const announcements = db.prepare(`
      SELECT id, title, type, date, lieu, freq, contenu, image
      FROM announcements WHERE published = 1 ORDER BY id DESC
    `).all();
    response.json(announcements);
  });

  let sundayVideosCache = { expiresAt: 0, videos: null };
  app.get("/api/videos", async (_request, response) => {
    if (sundayVideosCache.videos && sundayVideosCache.expiresAt > Date.now()) {
      response.set("Cache-Control", "public, max-age=300");
      response.json(sundayVideosCache.videos);
      return;
    }
    try {
      const feedResponse = await fetchYouTubeFeed(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(youtubeChannelId)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!feedResponse.ok) {
        throw new Error(`YouTube RSS HTTP ${feedResponse.status}`);
      }
      const videos = parseSundayVideos(await feedResponse.text());
      sundayVideosCache = { expiresAt: Date.now() + 5 * 60 * 1000, videos };
      response.set("Cache-Control", "public, max-age=300");
      response.json(videos);
    } catch (error) {
      console.error("Unable to load Sunday videos from YouTube:", error.message);
      response.status(502).json({
        message: "Les vidéos YouTube sont momentanément indisponibles. Réessayez plus tard.",
      });
    }
  });

  app.post("/api/admin/auth/login", loginLimit, async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: "Adresse e-mail ou mot de passe invalide." });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const admin = adminRows.find((row) => row.email.toLowerCase() === email);
    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      admin?.password_hash ?? dummyPasswordHash,
    );

    if (!admin || !passwordMatches) {
      response.status(401).json({ message: "Identifiants incorrects." });
      return;
    }

    const token = jwt.sign(
      { role: "admin" },
      jwtSecret,
      { algorithm: "HS256", subject: String(admin.id), expiresIn: "20m" },
    );
    response.json({
      token,
      expiresIn: 1200,
      admin: { email: admin.email, role: "admin" },
    });
  });

  app.post("/api/inscription", publicWriteLimit, (request, response) => {
    const parsed = parseRegistration(request.body, "membership");
    if (parsed.error) {
      response.status(400).json({ message: parsed.error });
      return;
    }

    const idempotencyKey = getIdempotencyKey(request) ?? randomUUID();
    const result = createRegistration(db, parsed.value, idempotencyKey);
    if (result.conflict === "idempotency") {
      response.status(409).json({ message: "Cette clé de demande a déjà été utilisée pour d’autres données." });
      return;
    }
    if (result.conflict === "already_confirmed") {
      response.status(409).json({ message: "Une inscription validée existe déjà pour ce numéro." });
      return;
    }

    response.status(result.created ? 201 : 200).json({
      success: true,
      reused: !result.created,
      registration: publicRegistration(result.registration),
    });
  });

  app.post("/api/formations", publicWriteLimit, (request, response) => {
    const parsed = parseRegistration(request.body, "formation");
    if (parsed.error) {
      response.status(400).json({ message: parsed.error });
      return;
    }

    const idempotencyKey = getIdempotencyKey(request) ?? randomUUID();
    const result = createRegistration(db, parsed.value, idempotencyKey);
    if (result.conflict === "idempotency") {
      response.status(409).json({ message: "Cette clé de demande a déjà été utilisée pour d’autres données." });
      return;
    }
    if (result.conflict === "already_confirmed") {
      response.status(409).json({ message: "Cette inscription à la formation est déjà validée." });
      return;
    }

    response.status(result.created ? 201 : 200).json({
      success: true,
      reused: !result.created,
      registration: publicRegistration(result.registration),
    });
  });

  app.post("/api/pay", publicWriteLimit, (request, response) => {
    const parsed = donationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ success: false, message: "Les informations du don sont invalides." });
      return;
    }

    const idempotencyKey = getIdempotencyKey(request);
    if (!idempotencyKey) {
      response.status(400).json({
        success: false,
        message: "Une clé de requête unique est requise pour éviter les doublons.",
      });
      return;
    }

    const value = {
      fullName: parsed.data.noms_prenoms,
      phone: parsed.data.phone,
      normalizedPhone: normalizePhone(parsed.data.phone),
      amountXaf: parsed.data.amount,
      operator: parsed.data.operator,
    };
    const requestHash = hashRequest(value);
    const result = inTransaction(db, () => {
      const previous = findIdempotentRequest(db, idempotencyKey, "donation", requestHash);
      if (previous?.conflict) return { conflict: true };
      if (previous) {
        return {
          donation: db.prepare("SELECT * FROM donation_intents WHERE id = ?").get(previous.resourceId),
          replay: true,
        };
      }

      const inserted = db.prepare(`
        INSERT INTO donation_intents (
          full_name, phone, normalized_phone, amount_xaf, operator
        ) VALUES (?, ?, ?, ?, ?)
      `).run(value.fullName, value.phone, value.normalizedPhone, value.amountXaf, value.operator);

      db.prepare(`
        INSERT INTO idempotency_requests (idempotency_key, request_type, request_hash, resource_id)
        VALUES (?, 'donation', ?, ?)
      `).run(idempotencyKey, requestHash, inserted.lastInsertRowid);

      return {
        donation: db.prepare("SELECT * FROM donation_intents WHERE id = ?").get(inserted.lastInsertRowid),
        replay: false,
      };
    });

    if (result.conflict) {
      response.status(409).json({
        success: false,
        message: "Cette clé de demande a déjà été utilisée pour un autre don.",
      });
      return;
    }

    response.status(202).json({
      success: true,
      status: "pending_provider",
      donationId: result.donation.id,
      replay: result.replay,
      message: "Demande enregistrée en attente de l’activation MTN MoMo. Aucun paiement n’a été effectué.",
    });
  });

  app.use("/api/admin", adminLimit, authenticateAdmin);

  app.get("/api/admin/annonces", (_request, response) => {
    const announcements = db.prepare(`
      SELECT id, title, type, date, lieu, freq, contenu, image, published,
             created_at, updated_at
      FROM announcements ORDER BY id DESC
    `).all().map((announcement) => ({
      ...announcement,
      published: Boolean(announcement.published),
    }));
    response.json(announcements);
  });

  app.post(
    "/api/admin/uploads",
    express.raw({ type: () => true, limit: "5mb" }),
    async (request, response, next) => {
      try {
        const contentType = request.get("Content-Type")?.split(";")[0].trim().toLowerCase();
        const buffer = request.body;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
          response.status(400).json({ message: "Sélectionnez une image à importer." });
          return;
        }

        let extension;
        if (
          contentType === "image/png" &&
          buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ) {
          extension = "png";
        } else if (
          contentType === "image/jpeg" &&
          buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        ) {
          extension = "jpg";
        } else if (
          contentType === "image/webp" &&
          buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WEBP"
        ) {
          extension = "webp";
        } else {
          response.status(400).json({ message: "Formats acceptés : JPEG, PNG ou WebP valide." });
          return;
        }

        const filename = `${randomUUID()}.${extension}`;
        await mkdir(uploadDirectory, { recursive: true });
        await writeFile(join(uploadDirectory, filename), buffer, { flag: "wx" });
        response.status(201).json({ image: `/uploads/${filename}` });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/admin/annonces", (request, response) => {
    const parsed = announcementSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: "Les informations de l’annonce sont invalides." });
      return;
    }
    const announcement = parsed.data;
    const result = db.prepare(`
      INSERT INTO announcements (title, type, date, lieu, freq, contenu, image, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      announcement.title,
      announcement.type,
      announcement.date,
      announcement.lieu,
      announcement.freq,
      announcement.contenu,
      announcement.image,
      announcement.published ? 1 : 0,
    );
    response.status(201).json({ id: result.lastInsertRowid, ...announcement });
  });

  app.patch("/api/admin/annonces/:id", (request, response) => {
    const id = Number(request.params.id);
    const parsed = announcementSchema.safeParse(request.body);
    if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
      response.status(400).json({ message: "Les informations de l’annonce sont invalides." });
      return;
    }
    const announcement = parsed.data;
    const updated = db.prepare(`
      UPDATE announcements
      SET title = ?, type = ?, date = ?, lieu = ?, freq = ?, contenu = ?,
          image = ?, published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      announcement.title,
      announcement.type,
      announcement.date,
      announcement.lieu,
      announcement.freq,
      announcement.contenu,
      announcement.image,
      announcement.published ? 1 : 0,
      id,
    );
    if (updated.changes === 0) {
      response.status(404).json({ message: "Annonce introuvable." });
      return;
    }
    response.json({ id, ...announcement });
  });

  app.delete("/api/admin/annonces/:id", (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      response.status(400).json({ message: "Identifiant d’annonce invalide." });
      return;
    }
    const deleted = db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
    if (deleted.changes === 0) {
      response.status(404).json({ message: "Annonce introuvable." });
      return;
    }
    response.status(204).end();
  });

  app.get("/api/admin/registrations", (request, response) => {
    const status = request.query.status;
    if (status && !["pending", "confirmed", "rejected"].includes(status)) {
      response.status(400).json({ message: "Filtre de statut invalide." });
      return;
    }

    const pagination = paginationSchema.safeParse(request.query);
    if (!pagination.success) {
      response.status(400).json({ message: "Paramètres de pagination invalides." });
      return;
    }

    const { limit } = pagination.data;
    const total = status
      ? db.prepare("SELECT COUNT(*) AS total FROM registrations WHERE status = ?").get(status).total
      : db.prepare("SELECT COUNT(*) AS total FROM registrations").get().total;
    const totalPages = Math.ceil(total / limit);
    const page = Math.min(pagination.data.page, Math.max(1, totalPages));
    const offset = (page - 1) * limit;
    const query = status
      ? db.prepare(`
        SELECT id, registration_kind, activity_name, first_name, last_name, phone,
                 email, address, city, district, status, created_at, updated_at
        FROM registrations WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?
      `).all(status, limit, offset)
      : db.prepare(`
        SELECT id, registration_kind, activity_name, first_name, last_name, phone,
               email, address, city, district, status, created_at, updated_at
        FROM registrations ORDER BY id DESC LIMIT ? OFFSET ?
      `).all(limit, offset);
    response.json({
      registrations: query,
      summary: getAdminSummary(db),
      pagination: { page, limit, total, totalPages },
    });
  });

  app.patch("/api/admin/registrations/:id", (request, response) => {
    const id = Number(request.params.id);
    const parsed = registrationStatusSchema.safeParse(request.body);
    if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
      response.status(400).json({ message: "Demande de mise à jour invalide." });
      return;
    }

    const updated = db.prepare(`
      UPDATE registrations
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `).run(parsed.data.status, id);
    if (updated.changes === 0) {
      const current = db.prepare("SELECT id, status FROM registrations WHERE id = ?").get(id);
      if (!current) {
        response.status(404).json({ message: "Inscription introuvable." });
        return;
      }
      if (current.status !== parsed.data.status) {
        response.status(409).json({ message: "Cette inscription a déjà été traitée." });
        return;
      }
    }
    response.json({ success: true, id, status: parsed.data.status });
  });

  app.get("/api/admin/donations", (request, response) => {
    const pagination = paginationSchema.safeParse(request.query);
    if (!pagination.success) {
      response.status(400).json({ message: "Paramètres de pagination invalides." });
      return;
    }

    const total = db.prepare("SELECT COUNT(*) AS total FROM donation_intents").get().total;
    const totalPages = Math.ceil(total / pagination.data.limit);
    const page = Math.min(pagination.data.page, Math.max(1, totalPages));
    const offset = (page - 1) * pagination.data.limit;
    const donations = db.prepare(`
      SELECT id, full_name, phone, amount_xaf, operator, status, created_at, updated_at
      FROM donation_intents ORDER BY id DESC LIMIT ? OFFSET ?
    `).all(pagination.data.limit, offset);
    response.json({
      donations,
      summary: getAdminSummary(db),
      pagination: {
        page,
        limit: pagination.data.limit,
        total,
        totalPages,
      },
    });
  });

  app.use((error, _request, response, _next) => {
    if (error?.type === "entity.parse.failed") {
      response.status(400).json({ message: "Corps JSON invalide." });
      return;
    }
    if (error?.type === "entity.too.large") {
      response.status(413).json({ message: "Le fichier dépasse la limite de 5 Mo." });
      return;
    }
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      response.status(409).json({ message: "Une demande équivalente existe déjà." });
      return;
    }
    console.error("API request failed:", error?.message ?? "Unknown error");
    response.status(500).json({ message: "Erreur interne du serveur." });
  });

  return { app, db };
}
