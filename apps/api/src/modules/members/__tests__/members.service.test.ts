import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMembersService } from '../members.service.js';
import type { MembersRepository, MembersService } from '../members.types.js';
import type { BusinessMember as BusinessMemberRecord } from '../../../../generated/prisma/client.js';

function mockRepository(): MembersRepository {
  return {
    list: vi.fn(),
  };
}

function memberRecord(overrides: Partial<BusinessMemberRecord> = {}): BusinessMemberRecord {
  return {
    id: 'srv-1',
    businessId: 'b-1',
    branchId: 'br-1',
    ownerId: null,
    name: 'Abebe',
    role: 'SERVER',
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

let mockRepo: MembersRepository;
let service: MembersService;

describe('members.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createMembersService(mockRepo);
  });

  describe('list', () => {
    it('reads the members of the resolved business and branch with the filters', async () => {
      vi.mocked(mockRepo.list).mockResolvedValue([]);

      await service.list({ businessId: 'b-1', branchId: 'br-1' }, { role: 'SERVER' });

      expect(mockRepo.list).toHaveBeenCalledWith('b-1', 'br-1', { role: 'SERVER' });
    });

    it('narrows each member to the summary a picker shows', async () => {
      vi.mocked(mockRepo.list).mockResolvedValue([memberRecord()]);

      await expect(service.list({ businessId: 'b-1', branchId: 'br-1' }, {})).resolves.toEqual([
        { id: 'srv-1', name: 'Abebe', role: 'SERVER' },
      ]);
    });

    it('returns an empty list when the business has no members', async () => {
      vi.mocked(mockRepo.list).mockResolvedValue([]);

      await expect(service.list({ businessId: 'b-1', branchId: 'br-1' }, {})).resolves.toEqual([]);
    });
  });
});
