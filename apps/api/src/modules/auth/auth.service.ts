import type { AuthRepository, AuthService } from './auth.types.js';

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    async resolve(providerUserId: string, email?: string) {
      const existing = await repository.findIdentity(providerUserId);

      if (existing) {
        return existing;
      }

      return repository.createIdentity(providerUserId, email);
    },
  };
}
