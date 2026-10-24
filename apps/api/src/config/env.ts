const REQUIRED_PRODUCTION_ENV = ['DATABASE_URL', 'SUPABASE_JWKS_URL', 'CORS_ORIGINS'] as const;

/**
 * Fail fast when the API is started in production without the environment it
 * needs. Development and tests keep their current lenient behavior.
 */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}. ` +
        'Set them in your deployment platform before starting the API.',
    );
  }
}

assertProductionEnv();
