# MySlides

AI-powered presentation slide generator. Enter a text prompt, and the app generates slide content (titles and bullet points) using the OpenAI API. Customize themes, fonts, colors, and layouts; edit slides; save/load in the cloud; export to PDF or PPTX.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Firebase SDK
- **Auth:** Firebase Authentication (email/password)
- **Database:** Cloud Firestore (presentations per user)
- **Backend:** Firebase Cloud Functions (slide generation with OpenAI, rate limiting)
- **Hosting:** Firebase Hosting

## Prerequisites

- Node.js 18+
- npm
- A [Firebase](https://console.firebase.google.com) project

## Setup

### 1. Firebase project

1. Create a project in [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore Database** (start in test mode if needed; deploy rules before production).
4. Register a web app in Project settings → General → Your apps → Add app (Web). Copy the `firebaseConfig` object.

### 2. Clone and install

```bash
cd MySlides
npm install
cd client && npm install
cd ../functions && npm install
```

### 3. Configure the client

In `client/`, copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cd client
copy .env.example .env
```

Edit `client/.env` with the values from your Firebase web app config:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4. Connect the project to Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
```

Replace `your-project-id` with your Firebase project ID (and update `.firebaserc` if you use a different id).

### 5. Run locally

**Option A – Firebase only (recommended)**

1. Set the OpenAI API key for the Cloud Function (used when you deploy or run emulators):
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```
   Paste your OpenAI API key when prompted.

2. Run the client (it will talk to **deployed** Firebase Auth, Firestore, and Functions):
   ```bash
   cd client && npm run dev
   ```
   Open **http://localhost:5173**. Register, log in, and use the app. Slide generation will call your **deployed** Cloud Function, so you need to deploy at least once (see Deploy below).

**Option B – Emulators (offline dev)**

1. Start emulators:
   ```bash
   firebase emulators:start --only auth,firestore,functions
   ```
2. In `client/.env` add: `VITE_USE_FIREBASE_EMULATORS=true`
3. In another terminal: `cd client && npm run dev`
4. The client will use the emulators. Set the OpenAI key for the functions emulator (e.g. in `functions/.env` or via `firebase functions:secrets:set OPENAI_API_KEY` and ensure the emulator can read it).

**Option C – Legacy Express server (optional)**

The `server/` folder still contains the original Express API. You can run it alongside the client for local dev if you prefer not to use Firebase for auth/generate during development. The client is currently wired to **Firebase** (Auth, Firestore, callable Function). To use the Express server again you would need to switch the client back to the REST API and session auth.

## Usage

1. **Register** – Create an account (email + password). You are signed in and taken to the app.
2. **Log in** – Sign in to open the main app.
3. **Generate slides** – Enter a prompt and click **Generate slides**. The Cloud Function calls OpenAI and returns slides; rate limiting applies per user.
4. **Edit** – Use **Edit slide** to change titles and bullets; pick a layout per slide.
5. **Theme & style** – Change **Theme**, **Font**, and **Colors**; **Reset** restores theme defaults.
6. **Save / Load** – **Save** stores the presentation in Firestore. **Load** lists your saved presentations; pick one or **New presentation**.
7. **Export** – **Download PDF** or **Export PPTX** to get a file with the current slides and styling.

## Project structure

```
MySlides/
├── client/                 # React frontend (Vite + Firebase SDK)
│   ├── src/
│   │   ├── api/            # Firebase callable (generateSlides)
│   │   ├── components/     # Layout, SlideCard, SlideCarousel
│   │   ├── contexts/       # AuthContext (Firebase Auth)
│   │   ├── lib/            # firebase, firestoreStorage, exportPdf, exportPptx
│   │   ├── pages/          # Login, Register, Dashboard
│   │   └── types/          # presentation types, themes, layouts
│   └── .env.example
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts        # generateSlides (OpenAI + rate limit)
│   ├── package.json
│   └── tsconfig.json
├── firebase.json           # Hosting, Firestore, Functions config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── .firebaserc             # Firebase project id
├── server/                 # Optional Express backend (legacy)
└── README.md
```

## Deploy

1. **Build the client**
   ```bash
   cd client && npm run build
   ```

2. **Set the OpenAI secret** (if not already set)
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```

3. **Deploy**
   ```bash
   firebase deploy
   ```
   This deploys Firestore rules and indexes, Cloud Functions, and Hosting (serves `client/dist` with SPA rewrites).

4. Your app will be at `https://your-project-id.web.app` (or your custom Hosting URL).

## Security

- **Auth:** Firebase Authentication handles sign-up/sign-in and tokens.
- **Firestore:** Rules restrict `presentations` so users can only read/write their own documents (`userId == request.auth.uid`). `rateLimits` is server-only (Cloud Functions use the Admin SDK).
- **Secrets:** Store `OPENAI_API_KEY` in Firebase/Secret Manager; do not commit it.
- Use HTTPS in production (Firebase Hosting and Functions use HTTPS by default).

## License

MIT.
