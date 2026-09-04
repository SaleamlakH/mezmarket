declare namespace NodeJS {
  interface ProcessEnv {
    PORT: number;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    SUPABASE_JWKS_URL: string;
  }
}

declare namespace Express {
  interface Request {
    auth?: {
      ownerId: string;
    };
  }
}
