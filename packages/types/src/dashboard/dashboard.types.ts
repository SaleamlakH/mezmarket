import type { BusinessMemberRole } from '../business/business.types.js';
import type { PaymentMethod } from '../sales/sales.types.js';

/**
 * The bucket a trend series is grouped into. `hour` and `day` are the only
 * granularities the dashboard trend reads at.
 */
export type DashboardPeriodBucket = 'hour' | 'day';

/**
 * The reporting window a dashboard read covers. Both bounds are ISO 8601
 * instants; the server never uses a business timezone.
 */
export type ReportingPeriod = { from: string; to: string };

/**
 * The oldest draft batch an inventory summary points at. `createdAt` is an
 * ISO 8601 instant.
 */
export type InventorySummaryDraftBatch = {
  count: number;
  oldest: { id: string; supplierName: string | null; createdAt: string; lineCount: number } | null;
};

/**
 * The stock expiring around `asOf`: how many lots have already expired and how
 * many are about to, plus the earliest one. `expiryDate` is an ISO 8601 instant.
 */
export type InventorySummaryExpiring = {
  expiredCount: number;
  expiringCount: number;
  earliest: { productName: string; expiryDate: string } | null;
};

/**
 * An inventory summary for the dashboard. `asOf` is an ISO 8601 instant.
 * Containers are deliberately out of scope: this describes no container shape.
 */
export type InventorySummaryResponse = {
  asOf: string;
  draftBatches?: InventorySummaryDraftBatch;
  lowStock: { count: number; preview: string[] };
  outOfStock: { count: number; preview: string[] };
  expiring: InventorySummaryExpiring;
  stockValue?: number;
};

/**
 * The unpaid sales a cash summary reports, split into all unpaid and those
 * older than the caller's overdue cutoff.
 */
export type SalesSummaryOutstanding = {
  total: number;
  unpaidCount: number;
  olderThan: { count: number; total: number };
};

/**
 * A cash summary for the dashboard. `asOf` is an ISO 8601 instant.
 */
export type SalesSummaryResponse = {
  asOf: string;
  outstanding?: SalesSummaryOutstanding;
};

/** Stock needing attention, split by why. */
export type AttentionStock = {
  count: number;
  lowCount: number;
  outCount: number;
  preview: string[];
};

/**
 * Lots expiring around `asOf`, with the earliest one. `expiryDate` is an
 * ISO 8601 instant.
 */
export type AttentionExpiring = {
  lotCount: number;
  expiredLotCount: number;
  expiringLotCount: number;
  earliest: { productName: string; expiryDate: string } | null;
};

/** Unpaid sales needing attention, with the overdue slice called out. */
export type AttentionUnpaid = {
  count: number;
  total: number;
  overdue: { count: number; total: number };
};

/**
 * Draft batches needing attention. `createdAt` is an ISO 8601 instant.
 */
export type AttentionDraftBatches = {
  count: number;
  oldest: {
    batchId: string;
    supplierName: string | null;
    createdAt: string;
    lineCount: number;
  } | null;
};

/**
 * Everything the dashboard's attention panel reports. `asOf` is an ISO 8601
 * instant.
 */
export type AttentionResponse = {
  asOf: string;
  stock: AttentionStock;
  expiring: AttentionExpiring;
  unpaid: AttentionUnpaid;
  draftBatches?: AttentionDraftBatches;
};

/**
 * The dashboard summary for a reporting period. `asOf` is an ISO 8601 instant.
 * Money values are already rounded to two decimals by the API.
 */
export type DashboardSummaryResponse = {
  period: ReportingPeriod;
  asOf: string;
  grossProfit?: { value: number; previous: number; deltaPercent: number | null };
  sales: { total: number; count: number };
  cashCollected: { total: number; paymentCount: number };
  outstanding?: { total: number; count: number; overdue: { total: number; count: number } };
  losses?: { total: number; count: number };
};

/**
 * One member's performance over a reporting period. `asOf` is an ISO 8601
 * instant.
 */
export type MemberPerformanceResponse = {
  member: { id: string; name: string; role: BusinessMemberRole };
  period: ReportingPeriod;
  asOf: string;
  sales: { total: number; count: number };
  cashCollected: number;
  unpaidSalesCount: number;
};

/**
 * How much of a payment period came in through one method. `sharePercent` is
 * already rounded to two decimals by the API.
 */
export type PaymentMethodSummary = {
  method: PaymentMethod;
  total: number;
  paymentCount: number;
  sharePercent: number;
};

/**
 * A payment breakdown for a reporting period, grouped by method.
 */
export type PaymentSummaryResponse = {
  period: ReportingPeriod;
  groupBy: 'method';
  total: number;
  methods: PaymentMethodSummary[];
};

/**
 * One point of a trend series: `start` is an ISO 8601 instant, `grossProfit` is
 * already rounded to two decimals by the API.
 */
export type TrendPoint = { start: string; grossProfit: number };

/**
 * A gross-profit trend for a reporting period, bucketed by hour or day.
 */
export type DashboardTrendResponse = {
  period: ReportingPeriod;
  bucket: DashboardPeriodBucket;
  points: TrendPoint[];
};

/**
 * Parsed query values a reporting-period read accepts. Mirrors the existing
 * `ProductInventoryListFilters` convention of carrying `Date` values.
 */
export type ReportingPeriodQueryFilters = { from: Date; to: Date };

/** Parsed query values a trend read accepts. */
export type TrendQueryFilters = ReportingPeriodQueryFilters & { bucket: DashboardPeriodBucket };

/** Parsed query values a payment summary read accepts. */
export type PaymentSummaryQueryFilters = ReportingPeriodQueryFilters & { groupBy: 'method' };
