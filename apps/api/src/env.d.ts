declare namespace NodeJS {
  interface ProcessEnv {
    PORT: number;
    CORS_ORIGINS: string;
    DATABASE_URL: string;
    SUPABASE_JWKS_URL: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    STORAGE_BUCKET: string;
  }
}

declare namespace Express {
  interface Request {
    auth?: {
      ownerId: string;
      businessId?: string;
      branchId?: string;
      memberId?: string;
      role?: import('@mez/types').BusinessMemberRole;
    };
    validBody: unknown;
    validQuery?: unknown;
    uploadIds?: string[];
  }
}
