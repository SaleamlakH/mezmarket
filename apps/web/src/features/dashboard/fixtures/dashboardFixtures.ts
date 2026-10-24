import type {
  AttentionResponse,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  MemberPerformanceResponse,
  PaymentSummaryResponse,
} from '@mez/types';

/**
 * DEV-only preview data for dashboard sections. Production renders the real
 * error state instead. The shapes are the canonical @mez/types contracts, so a
 * fixture cannot drift from an API response.
 */
export interface DashboardFixtures {
  attention: AttentionResponse;
  summary: DashboardSummaryResponse;
  trend: DashboardTrendResponse;
  memberPerformance: MemberPerformanceResponse;
  paymentSummary: PaymentSummaryResponse;
}

const AS_OF = '2026-10-21T09:00:00.000Z';
const FROM = '2026-10-15T00:00:00.000Z';
const TO = '2026-10-22T00:00:00.000Z';
const PERIOD = { from: FROM, to: TO };

const trend: DashboardTrendResponse = {
  period: PERIOD,
  bucket: 'day',
  points: [
    { start: '2026-10-15T00:00:00.000Z', grossProfit: 420 },
    { start: '2026-10-16T00:00:00.000Z', grossProfit: 650 },
    { start: '2026-10-17T00:00:00.000Z', grossProfit: 580 },
    { start: '2026-10-18T00:00:00.000Z', grossProfit: 760 },
    { start: '2026-10-19T00:00:00.000Z', grossProfit: 890 },
    { start: '2026-10-20T00:00:00.000Z', grossProfit: 720 },
    { start: '2026-10-21T00:00:00.000Z', grossProfit: 800 },
  ],
};

const memberPerformance: MemberPerformanceResponse = {
  member: { id: 'member_owner', name: 'Demo Owner', role: 'OWNER' },
  period: PERIOD,
  asOf: AS_OF,
  sales: { total: 6240, count: 8 },
  cashCollected: 5100,
  unpaidSalesCount: 3,
};

const paymentSummary: PaymentSummaryResponse = {
  period: PERIOD,
  groupBy: 'method',
  total: 15200,
  methods: [
    { method: 'CASH', total: 9400, paymentCount: 9, sharePercent: 61.84 },
    { method: 'MOBILE_MONEY', total: 4300, paymentCount: 3, sharePercent: 28.29 },
    { method: 'BANK_TRANSFER', total: 1500, paymentCount: 2, sharePercent: 9.87 },
  ],
};

const managerAttention: AttentionResponse = {
  asOf: AS_OF,
  stock: {
    count: 7,
    lowCount: 5,
    outCount: 2,
    preview: ['Sugar 1kg', 'Oil 5L'],
  },
  expiring: {
    lotCount: 3,
    expiredLotCount: 0,
    expiringLotCount: 3,
    earliest: { productName: 'Yogurt 500ml', expiryDate: '2026-10-27T00:00:00.000Z' },
  },
  unpaid: {
    count: 4,
    total: 2350,
    overdue: { count: 2, total: 1200 },
  },
  draftBatches: {
    count: 2,
    oldest: {
      batchId: 'batch_draft_1',
      supplierName: 'Almaz',
      createdAt: '2026-10-18T09:00:00.000Z',
      lineCount: 5,
    },
  },
};

const staffAttention: AttentionResponse = {
  asOf: AS_OF,
  stock: managerAttention.stock,
  expiring: managerAttention.expiring,
  unpaid: managerAttention.unpaid,
};

const managerSummary: DashboardSummaryResponse = {
  period: PERIOD,
  asOf: AS_OF,
  grossProfit: { value: 4820, previous: 4303.57, deltaPercent: 12 },
  sales: { total: 18450, count: 23 },
  cashCollected: { total: 15200, paymentCount: 14 },
  outstanding: { total: 6100, count: 7, overdue: { total: 2350, count: 2 } },
  losses: { total: 340, count: 2 },
};

const staffSummary: DashboardSummaryResponse = {
  period: PERIOD,
  asOf: AS_OF,
  sales: managerSummary.sales,
  cashCollected: managerSummary.cashCollected,
};

const emptyAttention: AttentionResponse = {
  asOf: AS_OF,
  stock: { count: 0, lowCount: 0, outCount: 0, preview: [] },
  expiring: { lotCount: 0, expiredLotCount: 0, expiringLotCount: 0, earliest: null },
  unpaid: { count: 0, total: 0, overdue: { count: 0, total: 0 } },
  draftBatches: { count: 0, oldest: null },
};

const emptyStaffAttention: AttentionResponse = {
  asOf: emptyAttention.asOf,
  stock: emptyAttention.stock,
  expiring: emptyAttention.expiring,
  unpaid: emptyAttention.unpaid,
};

const emptyManagerSummary: DashboardSummaryResponse = {
  period: PERIOD,
  asOf: AS_OF,
  grossProfit: { value: 0, previous: 0, deltaPercent: null },
  sales: { total: 0, count: 0 },
  cashCollected: { total: 0, paymentCount: 0 },
  outstanding: { total: 0, count: 0, overdue: { total: 0, count: 0 } },
  losses: { total: 0, count: 0 },
};

const emptyStaffSummary: DashboardSummaryResponse = {
  period: PERIOD,
  asOf: AS_OF,
  sales: emptyManagerSummary.sales,
  cashCollected: emptyManagerSummary.cashCollected,
};

const emptyTrend: DashboardTrendResponse = {
  period: PERIOD,
  bucket: 'day',
  points: [],
};

const emptyMemberPerformance: MemberPerformanceResponse = {
  member: memberPerformance.member,
  period: PERIOD,
  asOf: AS_OF,
  sales: { total: 0, count: 0 },
  cashCollected: 0,
  unpaidSalesCount: 0,
};

const emptyPaymentSummary: PaymentSummaryResponse = {
  period: PERIOD,
  groupBy: 'method',
  total: 0,
  methods: [],
};

export type DashboardFixtureRole = 'OWNER' | 'CASHIER';

export const dashboardFixturesByRole: Record<DashboardFixtureRole, DashboardFixtures> = {
  OWNER: {
    attention: managerAttention,
    summary: managerSummary,
    trend,
    memberPerformance,
    paymentSummary,
  },
  CASHIER: {
    attention: staffAttention,
    summary: staffSummary,
    trend,
    memberPerformance,
    paymentSummary,
  },
};

export const emptyDashboardFixturesByRole: Record<DashboardFixtureRole, DashboardFixtures> = {
  OWNER: {
    attention: emptyAttention,
    summary: emptyManagerSummary,
    trend: emptyTrend,
    memberPerformance: emptyMemberPerformance,
    paymentSummary: emptyPaymentSummary,
  },
  CASHIER: {
    attention: emptyStaffAttention,
    summary: emptyStaffSummary,
    trend: emptyTrend,
    memberPerformance: emptyMemberPerformance,
    paymentSummary: emptyPaymentSummary,
  },
};
