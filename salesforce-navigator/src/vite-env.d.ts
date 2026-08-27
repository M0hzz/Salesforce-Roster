/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SP_CLIENT_ID?: string;
  readonly VITE_SP_TENANT_ID?: string;
  readonly VITE_SP_HOSTNAME?: string;
  readonly VITE_SP_SITE_PATH?: string;
  readonly VITE_SP_ROSTER_LIST?: string;
  readonly VITE_SP_ACTIVITY_LIST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
