# EGC API prototype

This is a separate Express API backed by SQLite. It requires Node.js 22.13 or
newer because it uses Node's built-in `node:sqlite` API.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set a unique admin email, a strong password of at least 14 characters, and
   a random `JWT_SECRET` of at least 32 characters.
3. From the `backend/` directory, run `npm run dev`.
4. Copy `frontend/.env.example` to `frontend/.env` and set
   `VITE_API_URL=http://localhost:8080`.
5. Open `/admin` in the application and sign in with the initial admin account.

Generate a random JWT secret without sharing it:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

The first start creates the SQLite database under `backend/data/` and hashes the
initial administrator password with bcrypt. Database files and `.env` are
excluded from version control. Changing `ADMIN_PASSWORD` after initial setup
does not overwrite an existing account.

## Deploying the API on Railway

1. In Railway, create a project from this GitHub repository and set the service
   root directory to `/backend`.
2. Add a persistent volume mounted at `/app/data` before deploying. The API
   stores its SQLite database and uploaded images in this directory.
3. Set these service variables in Railway (never commit their values):
   - `DATABASE_PATH=/app/data/egc.sqlite`
   - `JWT_SECRET` to a unique random value of at least 32 characters.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` to the initial admin credentials;
     use a unique password of at least 14 characters.
   - `PUBLIC_ORIGINS=capacitor://localhost,https://localhost,http://localhost`
   - `YOUTUBE_CHANNEL_ID=UCQi00Q-CJ5mGtbeMnrlqc4Q`
4. Deploy the service. Railway uses `railway.json` to start the API and check
   `/api/health`. Generate a public domain in the service's Networking settings;
   that HTTPS domain is the API URL.
5. In `frontend/.env.production`, set `VITE_API_URL` to the generated HTTPS
   domain (without a trailing slash). Rebuild and reinstall the Android app
   with `npm run android:sync`.

The Railway volume is required: without it, the SQLite database and uploaded
images can be lost when the service is redeployed. Keep a single API instance
with this SQLite setup; it is not designed for multiple instances or sustained
high concurrency. Railway account access is needed to create the project and
generate its public domain.

## What is implemented

- Public membership sign-up at `POST /api/inscription`.
- Public training sign-up at `POST /api/formations`.
- Admin login at `POST /api/admin/auth/login` with a 20-minute JWT.
- Admin-only registration list and status changes under `/api/admin`.
- Admin-only read access to donation intents.
- Admin-only announcement creation, editing, publication, and deletion at
  `/api/admin/annonces`; published announcements are available at
  `GET /api/annonces`. Announcements can be categorized as seminars and
  individually selected for the home-page carousel; a selected announcement
  must have an uploaded image.
- Admin-only image uploads at `/api/admin/uploads` (JPEG, PNG, and WebP,
  maximum 5 MB). Images are stored under `backend/data/uploads/`.
- Registration addresses (street/landmark, city, and neighborhood) are stored
  for membership and training forms and returned only by authenticated admin
  registration endpoints. Public registration responses do not include them.
- Admin lists use server-side pagination (25 records by default, up to 100 per
  page) and return total counts so the dashboard can browse every record
  without downloading the complete database.
- Schema validation, parameterized SQL, rate limits, Helmet headers, CORS
  allowlisting, bounded JSON requests, bcrypt password hashing, and required
  request idempotency for donation intents.
- Registration phone numbers accept 8–12 digits, with optional spaces,
  parentheses, dashes, and a leading `+`; the same validation is applied by
  the frontend and API.
- One record per phone number and activity. Repeated pending or rejected
  registrations update the same record; a confirmed registration cannot be
  submitted again for the same training.

Admin list endpoints accept `page` and `limit` query parameters, with a default
page size of 25 and a maximum of 100. For example,
`GET /api/admin/registrations?page=2&limit=25&status=pending` returns only that
page plus `pagination` totals and status `summary`; `GET /api/admin/donations`
uses the same pagination parameters.

The admin dashboard is at `/admin` in the frontend. It supports filtered
Excel export and print-to-PDF export for registration lists; the browser's print
dialog can save the PDF. Keep exported files private because they contain
personal addresses and contact information.

## API tests

Run `npm test` from the `backend/` directory. The suite checks pagination
past 2,000 records and submits 2,000 simulated registrations through the API
in batches of 100 concurrent users. This local test is not a production
capacity guarantee; the SQLite deployment limitations below still apply.

## Donations and MTN MoMo limitation

MTN MoMo credentials and sandbox access have not been provided, and a real
provider integration/webhook has not been implemented. `POST /api/pay` only
stores an **unpaid intent** with status `pending_provider`; it does not contact
MTN, initiate a charge, or mark a payment successful. The admin dashboard
labels these records accordingly. Do not treat them as received donations.

The idempotency key makes retries of the same request return the same intent.
Before accepting real payments, implement MTN's official sandbox and production
API flow, verify signed provider callbacks server-side, and enforce unique
provider transaction references. Never mark a donation paid from a client
request or from an unverified manual status change.

## Prototype and deployment limits

Pagination and indexes keep admin reads bounded as registrations grow beyond
2,000 records. The API still uses Node's synchronous SQLite driver and is
intended for a single API instance with a private, persistent disk; it is not a
multi-instance or high-concurrency deployment design. For sustained concurrent
traffic or horizontal scaling, migrate to a managed database such as PostgreSQL
and use a shared rate-limit store before launch. Do not put the SQLite database
file in a public web folder. Use HTTPS, encrypted and access-controlled
backups, monitoring, and a production database/service with appropriate
concurrency and backup guarantees before public deployment. Set
`PUBLIC_ORIGINS` to the exact trusted web and Capacitor origins. Never commit
`.env`, credentials, or the database file.
