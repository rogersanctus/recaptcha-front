/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The site key for Cloudflare Turnstile captcha */
  readonly VITE_TURNSTILE_SITEKEY: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
