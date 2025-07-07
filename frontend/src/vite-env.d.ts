/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly VITE_OLLAMA_HOST: string
  readonly VITE_OLLAMA_MODEL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
