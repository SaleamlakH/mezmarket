import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import type { BusinessMemberSummaryResponse, MemberListFilters } from '@mez/types';
import { createMembersService } from './membersService';

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

describe('createMembersService', () => {
  let service: ReturnType<typeof createMembersService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createMembersService(client);
  });

  it('listMembers narrows the request with the role filter', async () => {
    const member: BusinessMemberSummaryResponse = { id: 'm1', name: 'Sam', role: 'SERVER' };
    vi.mocked(client.get).mockResolvedValue([member]);

    const result = await service.listMembers('biz_1', { role: 'SERVER' });

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/members?role=SERVER');
    expect(result).toEqual([member]);
  });

  it('listMembers leaves the filter off when no role is given', async () => {
    vi.mocked(client.get).mockResolvedValue([]);

    const result = await service.listMembers('biz_1', {} as MemberListFilters);

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/members');
    expect(result).toEqual([]);
  });
});
