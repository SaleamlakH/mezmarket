export interface AuthIdentity {
  id: string;
  ownerId: string;
  providerUserId: string;
}

export type AuthRepository = {
  findIdentity(providerUserId: string): Promise<AuthIdentity | null>;
  createIdentity(providerUserId: string, email?: string): Promise<AuthIdentity>;
};

export type AuthService = {
  resolve(providerUserId: string, email?: string): Promise<AuthIdentity>;
};
