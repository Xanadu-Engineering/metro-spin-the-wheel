function normalizeAppEnv(value) {
  return String(value || '')
    .trim()
    .toLowerCase() === 'production'
    ? 'Production'
    : 'Development';
}

export const APP_ENV = normalizeAppEnv(
  import.meta.env.VITE_APP_ENV || (import.meta.env.PROD ? 'Production' : 'Development'),
);

export const IS_PRODUCTION_ENV = APP_ENV === 'Production';
export const HAS_SUPABASE_BROWSER_CONFIG = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
