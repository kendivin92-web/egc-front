# Build Android with Android Studio

## Requirements

- Node.js 20 or newer
- Android Studio with the Android SDK installed
- JDK 21

## Open the project

1. Configure `VITE_API_URL` in a `.env.production` file with the HTTPS URL of
   the backend API. See `.env.example`.
2. The Capacitor app loads the published site at
   `https://egliseglorieuseduchrist.up.railway.app`, so site deployments appear
   in the app without rebuilding the APK.
3. From the `frontend/` directory, run `npm run android:sync`.
4. Run `npm run android:open` or open the `android` folder in Android Studio.
5. In Android Studio, wait for Gradle sync to finish, then choose **Build >
   Build Bundle(s) / APK(s) > Build APK(s)**.

The APK is produced under `android/app/build/outputs/apk/`.

Run `npm run android:sync` again after changing the web app so the Android
project receives the latest build.

The API URL must point to the deployed backend over HTTPS, without a trailing slash.
Production builds reject HTTP and localhost API URLs to prevent shipping an app
that sends requests or credentials to an insecure or unreachable server. The
Live and sermons screen gets its video list from that backend's `/api/videos`
route; the videos will not load if the URL is missing, points to `localhost`,
or the backend is not reachable from the phone. Production builds now stop
with an error when `VITE_API_URL` is not configured. After changing the URL,
build and install a new APK; an installed APK cannot pick up the setting. The
remote-site app requires an internet connection to load. The backend must allow
the published site's origin in `PUBLIC_ORIGINS`.

## Backend access

The Android app cannot reach a development backend through `localhost`.
Configure `VITE_API_URL` to a backend address reachable by the device. For
production, use HTTPS and allow the Android app's Capacitor origin in the
backend CORS configuration.

## Local backend prototype

The Express + SQLite prototype is in the sibling `backend/` directory. Configure
`backend/.env` from `backend/.env.example`, then run `npm run server:dev` from
the `frontend/` directory (or run `npm run dev` from `backend/`). The backend
requires Node.js 22.13 or newer. The Android emulator/device must
be able to reach the backend host; do not use `localhost` from the Android app.
Use a private HTTPS endpoint before handling real users or donations.

The administration dashboard is available at `/admin` in the frontend. Admins
can manage and publish announcements, upload images, view registration
addresses, and export registration lists. Registration exports include
personal contact and address information; store them securely.

### Testing on a physical Android phone

The phone and development computer must be on the same Wi-Fi network, and the
API must be reachable from the phone. For a local debug build, set
`VITE_API_URL` to the computer's Wi-Fi IP and run the Android sync/build steps.
The debug manifest permits HTTP for local testing only; release builds do not
inherit this permission. The computer's IP may change, so update it before
building again if needed. Use HTTPS for a production API.

MTN MoMo is not connected yet. The app can record an unpaid intent for the
admin to review, but no payment is initiated or confirmed. Follow
`../backend/README.md` before treating donations as received.

## Downloading the APK from the Railway website

The website's Android download button links to `/app-egc.apk`. Keep the APK at
`frontend/public/app-egc.apk`; Vite copies it into the production build. Replace
that file with the newly built APK and deploy the frontend service to update the
download on Railway.
