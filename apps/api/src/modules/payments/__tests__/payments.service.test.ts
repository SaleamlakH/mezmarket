import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '../../../../generated/prisma/client.js';
import type { PaymentMethod } from '@mez/types';
import { createPaymentsService } from '../payments.service.js';
import type { PaymentMethodTotal, PaymentsRepository, PaymentsService } from '../payments.types.js';

const FROM = new Date('2026-02-01T00:00:00.000Z');
const TO = new Date('2026-02-02T00:00:00.000Z');
const FILTERS = { from: FROM, to: TO, groupBy: 'method' } as const;
const SCOPE = { businessId: 'b-1', branchId: 'br-1' };

function mockRepository(): PaymentsRepository {
  return { summarizeByMethod: vi.fn() };
}

function group(method: PaymentMethod, total: string, paymentCount: number): PaymentMethodTotal {
  return { method, total: new Prisma.Decimal(total), paymentCount };
}

describe('payments.service', () => {
  let repository: PaymentsRepository;
  let service: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = mockRepository();
    service = createPaymentsService(repository);
  });

  it('derives the total from the method groups and shares that sum to about one hundred', async () => {
    vi.mocked(repository.summarizeByMethod).mockResolvedValue([
      group('CASH', '600.00', 3),
      group('CARD', '300.00', 2),
      group('OTHER', '100.00', 1),
    ]);

    const summary = await service.getSummary(SCOPE, FILTERS);

    expect(repository.summarizeByMethod).toHaveBeenCalledTimes(1);
    expect(repository.summarizeByMethod).toHaveBeenCalledWith(SCOPE, FILTERS);
    expect(summary.total).toBe(1000);
    expect(summary.methods.reduce((sum, method) => sum + method.total, 0)).toBe(summary.total);
    expect(summary.methods.reduce((sum, method) => sum + method.sharePercent, 0)).toBeCloseTo(
      100,
      5,
    );
  });

  it('orders by total descending, breaking a tie by method name', async () => {
    vi.mocked(repository.summarizeByMethod).mockResolvedValue([
      group('CASH', '250.00', 2),
      group('MOBILE_MONEY', '500.00', 1),
      group('CARD', '250.00', 1),
    ]);

    const summary = await service.getSummary(SCOPE, FILTERS);

    expect(summary.methods.map((method) => method.method)).toEqual([
      'MOBILE_MONEY',
      'CARD',
      'CASH',
    ]);
    expect(summary.methods.map((method) => method.paymentCount)).toEqual([1, 1, 2]);
  });

  it('answers zero and no methods for an empty period without dividing by zero', async () => {
    vi.mocked(repository.summarizeByMethod).mockResolvedValue([]);

    const summary = await service.getSummary(SCOPE, FILTERS);

    expect(summary).toEqual({
      period: { from: FROM.toISOString(), to: TO.toISOString() },
      groupBy: 'method',
      total: 0,
      methods: [],
    });
    expect(summary.methods).toHaveLength(0);
  });

  it('rounds shares to two decimals', async () => {
    vi.mocked(repository.summarizeByMethod).mockResolvedValue([
      group('CASH', '1.00', 1),
      group('CARD', '2.00', 1),
    ]);

    const summary = await service.getSummary(SCOPE, FILTERS);

    expect(summary.methods).toEqual([
      { method: 'CARD', total: 2, paymentCount: 1, sharePercent: 66.67 },
      { method: 'CASH', total: 1, paymentCount: 1, sharePercent: 33.33 },
    ]);
  });

  it('rounds money half up at output', async () => {
    vi.mocked(repository.summarizeByMethod).mockResolvedValue([group('CASH', '10.005', 1)]);

    const summary = await service.getSummary(SCOPE, FILTERS);

    expect(summary.total).toBe(10.01);
    expect(summary.methods).toEqual([
      { method: 'CASH', total: 10.01, paymentCount: 1, sharePercent: 100 },
    ]);
  });
});
