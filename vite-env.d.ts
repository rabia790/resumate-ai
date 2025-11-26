// vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // TypeScript declaration for your environment variable
  readonly VITE_GEMINI_API_KEY: string 
}

interface ImportMeta {
  // Tells TypeScript that the global ImportMeta has an 'env' property
  readonly env: ImportMetaEnv
}