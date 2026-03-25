/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    // add more custom env variables here if needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

