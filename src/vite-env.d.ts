/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_AGENT_COMPANY_API_URL?: string;
  readonly VITE_SUPABASE_TABLES?: string;
}
