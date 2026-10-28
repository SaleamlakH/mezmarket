import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthRepository } from '../auth.repository.js';
import type { AuthRepository } from '../auth.types.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type MockTx = {
  owner: { create: ReturnType<typeof vi.fn> };
  accountIdentity: { create: ReturnType<typeof vi.fn> };
};

function createPrismaStub() {
  const tx: MockTx = {
    owner: { create: vi.fn() },
    accountIdentity: { create: vi.fn() },
  };
  const accountIdentity = { findUnique: vi.fn() };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = { accountIdentity, $transaction } as unknown as PrismaClient;

  return { prisma, tx, accountIdentity, $transaction };
}

describe('auth.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing AuthRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createAuthRepository(prisma) satisfies AuthRepository;

    expect(typeof repo.findIdentity).toBe('function');
    expect(typeof repo.createIdentity).toBe('function');
  });

  describe('findIdentity', () => {
    it('calls findUnique with the provider user id', async () => {
      const { prisma, accountIdentity } = createPrismaStub();
      const repo = createAuthRepository(prisma);

      await repo.findIdentity('sub-123');

      expect(accountIdentity.findUnique).toHaveBeenCalledWith({
        where: { providerUserId: 'sub-123' },
      });
    });
  });

  describe('createIdentity', () => {
    it('creates the owner with the provided name and email', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createAuthRepository(prisma);

      tx.owner.create.mockResolvedValue({ id: 'owner-2' });
      tx.accountIdentity.create.mockResolvedValue({});

      await repo.createIdentity('sub-abc', 'user@test.com', 'Jane Doe');

      expect(tx.owner.create).toHaveBeenCalledWith({
        data: { name: 'Jane Doe', contactEmail: 'user@test.com' },
      });
    });

    it('falls back to the default name when none is provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createAuthRepository(prisma);

      tx.owner.create.mockResolvedValue({ id: 'owner-2' });
      tx.accountIdentity.create.mockResolvedValue({});

      await repo.createIdentity('sub-abc', 'user@test.com');

      expect(tx.owner.create).toHaveBeenCalledWith({
        data: { name: 'New User', contactEmail: 'user@test.com' },
      });
    });

    it('links the account identity to the created owner', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createAuthRepository(prisma);

      tx.owner.create.mockResolvedValue({ id: 'owner-2' });
      tx.accountIdentity.create.mockResolvedValue({});

      await repo.createIdentity('sub-abc', 'user@test.com');

      expect(tx.accountIdentity.create).toHaveBeenCalledWith({
        data: { providerUserId: 'sub-abc', ownerId: 'owner-2' },
      });
    });
  });
});
