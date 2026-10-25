import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  BusinessMemberSummaryResponse,
  BusinessResponse,
  MemberListFilters,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { MembersApi } from '@/features/members/api/membersService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useMembersService } from '@/providers/members/useMembersService';
import { membersKeys, useMembers } from '../useMembersApi';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

vi.mock('@/providers/members/useMembersService', () => ({
  useMembersService: vi.fn(),
}));

const membersService = {
  listMembers: vi.fn(),
} satisfies MembersApi;

const members: BusinessMemberSummaryResponse[] = [{ id: 'm1', name: 'Sam', role: 'SERVER' }];

function businessFixture(): BusinessResponse {
  return {
    id: 'b1',
    ownerId: 'owner_1',
    name: 'Test Business',
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxOnSales: false,
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setBusiness(id: string | null) {
  vi.mocked(useBusinessContext).mockReturnValue({
    status: 'ready',
    businesses: [],
    currentBusiness: id === null ? null : businessFixture(),
    setCurrentBusiness: vi.fn(),
    refetch: vi.fn(),
  } satisfies BusinessContextValue);
}

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useMembersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    setBusiness('b1');
    vi.mocked(useMembersService).mockReturnValue(membersService);
  });

  it('fetches the members narrowed by the filter', async () => {
    vi.mocked(membersService.listMembers).mockResolvedValue(members);

    const { result } = renderHook(() => useMembers({ role: 'SERVER' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(membersService.listMembers).toHaveBeenCalledWith('b1', { role: 'SERVER' });
    expect(result.current.data).toEqual(members);
    expect(queryClient.getQueryData(membersKeys.list('b1', { role: 'SERVER' }))).toEqual(members);
  });

  it('caches each filter under its own key', async () => {
    vi.mocked(membersService.listMembers).mockResolvedValue(members);
    const noRole: MemberListFilters = {};

    const first = renderHook(() => useMembers({ role: 'SERVER' }), { wrapper });
    const second = renderHook(() => useMembers(noRole), { wrapper });

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(membersService.listMembers).toHaveBeenCalledWith('b1', { role: 'SERVER' });
    expect(membersService.listMembers).toHaveBeenCalledWith('b1', noRole);
    expect(queryClient.getQueryData(membersKeys.list('b1', { role: 'SERVER' }))).toEqual(members);
    expect(queryClient.getQueryData(membersKeys.list('b1', noRole))).toEqual(members);
  });

  it('stays idle while disabled', () => {
    const { result } = renderHook(() => useMembers({ role: 'SERVER' }, { enabled: false }), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(membersService.listMembers).not.toHaveBeenCalled();
  });

  it('stays idle without a selected business', () => {
    setBusiness(null);

    const { result } = renderHook(() => useMembers({ role: 'SERVER' }), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(membersService.listMembers).not.toHaveBeenCalled();
  });
});
