import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMembersService } from '../members.service.js';
import type { MembersRepository, MembersService } from '../members.types.js';
import type { BusinessMember as BusinessMemberRecord } from '../../../../generated/prisma/client.js';
import type { StoredDecimal } from '../../../shared/types/decimal.types.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): MembersRepository {
  return {
    list: vi.fn(),
    getMember: vi.fn(),
    memberSalesAggregate: vi.fn(),
    memberCashAggregate: vi.fn(),
    memberUnpaidCount: vi.fn(),
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

/** Stands in for a `Decimal` column: the service only ever calls toNumber. */
function decimal(value: number): StoredDecimal {
  return { toNumber: () => value };
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

  describe('getPerformance', () => {
    function resolveReads() {
      vi.mocked(mockRepo.memberSalesAggregate).mockResolvedValue({
        total: decimal(120.5),
        count: 2,
      });
      vi.mocked(mockRepo.memberCashAggregate).mockResolvedValue(decimal(40));
      vi.mocked(mockRepo.memberUnpaidCount).mockResolvedValue(1);
    }

    it('resolves "me" to the actor member and reads their own performance', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(
        memberRecord({ id: 'm-1', name: 'Abebe', role: 'CASHIER' }),
      );
      resolveReads();

      const result = await service.getPerformance(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'CASHIER' },
        'me',
        {
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        },
      );

      expect(mockRepo.getMember).toHaveBeenCalledTimes(1);
      expect(mockRepo.getMember).toHaveBeenCalledWith('b-1', 'br-1', 'm-1');
      expect(mockRepo.memberSalesAggregate).toHaveBeenCalledWith({
        branchId: 'br-1',
        memberId: 'm-1',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });
      expect(result).toEqual({
        member: { id: 'm-1', name: 'Abebe', role: 'CASHIER' },
        period: {
          from: new Date('2026-09-01T00:00:00.000Z').toISOString(),
          to: new Date('2026-09-30T23:59:59.000Z').toISOString(),
        },
        asOf: expect.any(String),
        sales: { total: 120.5, count: 2 },
        cashCollected: 40,
        unpaidSalesCount: 1,
      });
      expect(Date.parse(result.asOf)).not.toBeNaN();
    });

    it('lets a staff member read themselves by their own id', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(
        memberRecord({ id: 'm-1', name: 'Abebe', role: 'SERVER' }),
      );
      resolveReads();

      await expect(
        service.getPerformance(
          { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'SERVER' },
          'm-1',
          {
            from: new Date('2026-09-01T00:00:00.000Z'),
            to: new Date('2026-09-30T23:59:59.000Z'),
          },
        ),
      ).resolves.toMatchObject({
        member: { id: 'm-1', role: 'SERVER' },
      });
      expect(mockRepo.getMember).toHaveBeenCalledTimes(1);
    });

    it.each(['OWNER', 'MANAGER'] as const)('lets a %s read another member', async (role) => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(
        memberRecord({ id: 'm-2', name: 'Kebede', role: 'SERVER' }),
      );
      resolveReads();

      const result = await service.getPerformance(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role },
        'm-2',
        {
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        },
      );

      expect(result.member).toEqual({ id: 'm-2', name: 'Kebede', role: 'SERVER' });
      expect(mockRepo.getMember).toHaveBeenCalledTimes(1);
      expect(mockRepo.getMember).toHaveBeenCalledWith('b-1', 'br-1', 'm-2');
    });

    it.each(['CASHIER', 'SERVER'] as const)(
      'refuses a %s reading another member with FORBIDDEN',
      async (role) => {
        vi.mocked(mockRepo.getMember).mockResolvedValue(
          memberRecord({ id: 'm-2', name: 'Kebede', role: 'SERVER' }),
        );

        await expect(
          service.getPerformance(
            { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role },
            'm-2',
            {
              from: new Date('2026-09-01T00:00:00.000Z'),
              to: new Date('2026-09-30T23:59:59.000Z'),
            },
          ),
        ).rejects.toMatchObject({
          code: ERROR_CODES.FORBIDDEN,
          statusCode: 403,
          message: expect.any(String),
        });
        expect(mockRepo.memberSalesAggregate).not.toHaveBeenCalled();
        expect(mockRepo.memberCashAggregate).not.toHaveBeenCalled();
        expect(mockRepo.memberUnpaidCount).not.toHaveBeenCalled();
      },
    );

    it('answers NOT_FOUND for an unknown member', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(null);

      await expect(
        service.getPerformance(
          { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'OWNER' },
          'missing',
          {
            from: new Date('2026-09-01T00:00:00.000Z'),
            to: new Date('2026-09-30T23:59:59.000Z'),
          },
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
      expect(mockRepo.memberSalesAggregate).not.toHaveBeenCalled();
    });

    it('answers NOT_FOUND for a member outside the business and branch', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(null);

      await expect(
        service.getPerformance(
          { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'OWNER' },
          'other-branch-member',
          {
            from: new Date('2026-09-01T00:00:00.000Z'),
            to: new Date('2026-09-30T23:59:59.000Z'),
          },
        ),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, statusCode: 404 });
      expect(mockRepo.getMember).toHaveBeenCalledWith('b-1', 'br-1', 'other-branch-member');
    });

    it('converts the Decimal sums to numbers and rounds them at output', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(memberRecord({ id: 'm-1' }));
      vi.mocked(mockRepo.memberSalesAggregate).mockResolvedValue({
        total: decimal(12.345),
        count: 1,
      });
      vi.mocked(mockRepo.memberCashAggregate).mockResolvedValue(decimal(4.567));
      vi.mocked(mockRepo.memberUnpaidCount).mockResolvedValue(0);

      const result = await service.getPerformance(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'OWNER' },
        'me',
        {
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        },
      );

      expect(result.sales.total).toBe(12.35);
      expect(result.cashCollected).toBe(4.57);
    });

    it('reads zero when the member had no sales or cash in the period', async () => {
      vi.mocked(mockRepo.getMember).mockResolvedValue(memberRecord({ id: 'm-1' }));
      vi.mocked(mockRepo.memberSalesAggregate).mockResolvedValue({ total: null, count: 0 });
      vi.mocked(mockRepo.memberCashAggregate).mockResolvedValue(null);
      vi.mocked(mockRepo.memberUnpaidCount).mockResolvedValue(0);

      const result = await service.getPerformance(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role: 'OWNER' },
        'me',
        {
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        },
      );

      expect(result.sales).toEqual({ total: 0, count: 0 });
      expect(result.cashCollected).toBe(0);
    });
  });
});
