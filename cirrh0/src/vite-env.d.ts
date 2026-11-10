/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the API ("/api" when the API serves this app).
  readonly VITE_API_URL?: string
  // "true" shows the demo notice (use test data only).
  readonly VITE_DEMO_NOTICE?: string
  // Cloudinary cloud name for browser uploads.
  readonly VITE_CLOUDINARY_CLOUDNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
