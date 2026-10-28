import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from '../auth.service.js';
import type { AuthRepository } from '../auth.types.js';
import type { AuthIdentity } from '../auth.types.js';

function mockRepository(): AuthRepository {
  return {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  };
}

function identity(overrides: Partial<AuthIdentity> = {}): AuthIdentity {
  return {
    id: 'id-1',
    ownerId: 'owner-1',
    providerUserId: 'sub-1',
    ...overrides,
  };
}

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolve', () => {
    it('returns existing identity when found', async () => {
      const repo = mockRepository();
      const service = createAuthService(repo);

      const existing = identity({ providerUserId: 'sub-123' });

      vi.mocked(repo.findIdentity).mockResolvedValue(existing);

      const result = await service.resolve('sub-123', 'user@test.com');

      expect(result).toEqual(existing);
      expect(repo.findIdentity).toHaveBeenCalledWith('sub-123');
      expect(repo.createIdentity).not.toHaveBeenCalled();
    });

    it('creates and returns new identity when not found', async () => {
      const repo = mockRepository();
      const service = createAuthService(repo);

      const created = identity({ id: 'id-2', ownerId: 'owner-2', providerUserId: 'sub-new' });

      vi.mocked(repo.findIdentity).mockResolvedValue(null);
      vi.mocked(repo.createIdentity).mockResolvedValue(created);

      const result = await service.resolve('sub-new', 'user@test.com', 'Jane Doe');

      expect(result).toEqual(created);
      expect(repo.createIdentity).toHaveBeenCalledWith('sub-new', 'user@test.com', 'Jane Doe');
    });
  });
});
