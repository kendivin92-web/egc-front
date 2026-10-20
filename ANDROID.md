# Build Android with Android Studio

## Requirements

- Node.js 20 or newer
- Android Studio with the Android SDK installed
- JDK 21

## Open the project

1. Configure `VITE_API_URL` in a `.env.production` file with the HTTPS URL of
   the backend API. See `.env.example`.
2. From the project directory, run `npm run android:sync`.
3. Run `npm run android:open` or open the `android` folder in Android Studio.
4. In Android Studio, wait for Gradle sync to finish, then choose **Build >
   Build Bundle(s) / APK(s) > Build APK(s)**.

The APK is produced under `android/app/build/outputs/apk/`.

Run `npm run android:sync` again after changing the web app so the Android
project receives the latest build.

## Backend access

The Android app cannot reach a development backend through `localhost`.
Configure `VITE_API_URL` to a backend address reachable by the device. For
production, use HTTPS and allow the Android app's Capacitor origin in the
backend CORS configuration.

## Local backend prototype

The Express + SQLite prototype is in `server/`. Configure its `server/.env`
from `server/.env.example`, then run `npm run server:dev` from the project root.
The backend requires Node.js 22.13 or newer. The Android emulator/device must
be able to reach the backend host; do not use `localhost` from the Android app.
Use a private HTTPS endpoint before handling real users or donations.

MTN MoMo is not connected yet. The app can record an unpaid intent for the
admin to review, but no payment is initiated or confirmed. Follow
`server/README.md` before treating donations as received.
