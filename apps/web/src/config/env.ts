const REQUIRED_WEB_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL'] as const;

type RequiredWebEnvKey = (typeof REQUIRED_WEB_ENV)[number];

function missingEnvMessage(keys: readonly RequiredWebEnvKey[]): string {
  return (
    `Missing required environment variables: ${keys.join(', ')}. ` +
    'Set them in the Vercel project settings before deploying the web app.'
  );
}

/** Read an env var and fail loudly when a production build is misconfigured. */
export function requireWebEnv(key: RequiredWebEnvKey): string {
  const value = import.meta.env[key];

  if (value && value.trim()) {
    return value;
  }

  if (import.meta.env.PROD) {
    throw new Error(missingEnvMessage([key]));
  }

  return '';
}

/** Validate the whole production web contract in one place. */
export function assertWebEnv(): void {
  if (!import.meta.env.PROD) {
    return;
  }

  const missing = REQUIRED_WEB_ENV.filter((key) => !import.meta.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(missingEnvMessage(missing));
  }
}
