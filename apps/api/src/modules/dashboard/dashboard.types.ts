import type {
  AttentionResponse,
  BusinessMemberRole,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  ReportingPeriodQueryFilters,
  TrendQueryFilters,
} from '@mez/types';
import type { StoredDecimal } from '../../shared/types/decimal.types.js';
import type { Actor } from '../../shared/types/session.types.js';
import type { ConversionUnits } from '../../shared/types/unit.types.js';

export type {
  AttentionDraftBatches,
  AttentionExpiring,
  AttentionResponse,
  AttentionStock,
  AttentionUnpaid,
  DashboardPeriodBucket,
  DashboardSummaryResponse,
  DashboardTrendResponse,
  ReportingPeriodQueryFilters,
  TrendQueryFilters,
} from '@mez/types';

/**
 * The caller scope plus the role resolved for this business. The authorize
 * middleware stamps both onto the request; neither is ever read from params.
 */
export type DashboardActor = Actor & { role: BusinessMemberRole };

/** An active product's stock position and the threshold it is low against. */
export type StockPosition = {
  name: string;
  currentSealedStock: StoredDecimal;
  lowStockThreshold: StoredDecimal | null;
};

/** The earliest-expiring supported lot, with the product name it belongs to. */
export type ExpiringLotAnchor = {
  expiryDate: Date | null;
  product: { name: string };
};

/** A summed balance and the number of rows behind it. */
export type BalanceAggregate = {
  total: StoredDecimal | null;
  count: number;
};

/** Every unpaid balance plus the overdue slice of it. */
export type UnpaidAggregate = {
  all: BalanceAggregate;
  overdue: BalanceAggregate;
};

/** The oldest draft batch, with the supplier and line count a card shows. */
export type DraftBatchAggregate = {
  count: number;
  oldest: {
    batchId: string;
    supplierName: string | null;
    createdAt: Date;
    lineCount: number;
  } | null;
};

/** A period's sales total, tax and row count. */
export type SalesAggregate = {
  total: StoredDecimal | null;
  taxAmount: StoredDecimal | null;
  count: number;
};

/** A period's cash total and payment row count. */
export type CashAggregate = {
  total: StoredDecimal | null;
  count: number;
};

/** A period's sales total, tax and row count as service numbers. */
export type SalesFigures = {
  total: number;
  taxAmount: number;
  count: number;
};

/** A period's cash total and payment count as service numbers. */
export type CashFigures = {
  total: number;
  count: number;
};

/** A lot/cost group of pulled quantities, ready for the service to price. */
export type CostGroup = {
  stockBatchLineId: string;
  unitCost: StoredDecimal;
  quantityPulled: StoredDecimal | null;
};

/** A lot group of lost standard quantities, with the number of loss rows behind it. */
export type LossGroup = {
  stockBatchLineId: string;
  standardQuantity: StoredDecimal | null;
  count: number;
};

/**
 * The lot columns a cost conversion needs, plus the units that conversion
 * walks. The repository supplies them directly so the service never has to
 * carry the whole unit set.
 */
export type CostingLot = {
  id: string;
  purchaseQuantity: StoredDecimal;
  purchaseUnitCost: StoredDecimal;
  units: ConversionUnits;
};

/** One sale timestamp's revenue components, grouped by the database. */
export type SalesTimeGroup = {
  saleDatetime: Date;
  total: StoredDecimal | null;
  taxAmount: StoredDecimal | null;
};

/** One sale line/cost group of the trend, before its timestamp is joined in. */
export type TrendCostGroup = {
  saleLineId: string;
  stockBatchLineId: string;
  unitCost: StoredDecimal;
  quantityPulled: StoredDecimal | null;
};

/** A sale line's timestamp, the only column the trend join needs. */
export type SaleLineTime = {
  id: string;
  saleDatetime: Date;
};

/** Data access for the dashboard reads; the service finishes the business math. */
export type DashboardRepository = {
  /** Active branch products with the stock and product threshold used for classification. */
  stockPositions(businessId: string, branchId: string): Promise<StockPosition[]>;
  /** Count of confirmed lots with stock that expired before `asOf`. */
  expiredLotCount(businessId: string, branchId: string, asOf: Date): Promise<number>;
  /** Count of confirmed lots with stock expiring in [asOf, before). */
  expiringLotCount(businessId: string, branchId: string, asOf: Date, before: Date): Promise<number>;
  /** The earliest-expiring lot in the window, with its product name. */
  earliestExpiringLot(
    businessId: string,
    branchId: string,
    before: Date,
  ): Promise<ExpiringLotAnchor | null>;
  /** Sum and count of non-voided sales still owing money, plus the overdue slice. */
  unpaidAggregate(
    businessId: string,
    branchId: string,
    overdueBefore: Date,
  ): Promise<UnpaidAggregate>;
  /** Count of draft batches and the oldest one with its supplier and line count. */
  draftBatchAggregate(businessId: string, branchId: string): Promise<DraftBatchAggregate>;
  /** Sum and count of non-voided sales in [from, to). */
  salesAggregate(
    businessId: string,
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<SalesAggregate>;
  /** Sum and count of payments received in [from, to) through non-voided sales. */
  cashAggregate(businessId: string, branchId: string, from: Date, to: Date): Promise<CashAggregate>;
  /** Pulled quantities grouped by lot and frozen unit cost, for COGS. */
  cogsGroups(businessId: string, branchId: string, from: Date, to: Date): Promise<CostGroup[]>;
  /** Lost standard quantities grouped by lot, with each group's row count. */
  lossGroups(businessId: string, branchId: string, from: Date, to: Date): Promise<LossGroup[]>;
  /** The lot columns and product units needed to price a group without another lookup. */
  lotContext(stockBatchLineIds: string[]): Promise<CostingLot[]>;
  /** Non-voided sales in [from, to) grouped by sale timestamp. */
  salesByTimestamp(
    businessId: string,
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<SalesTimeGroup[]>;
  /** Pulled quantities grouped per sale line, lot and frozen cost, for the trend. */
  trendCostGroups(
    businessId: string,
    branchId: string,
    from: Date,
    to: Date,
  ): Promise<TrendCostGroup[]>;
  /** The sale timestamps for the given sale line ids. */
  saleLineMap(saleLineIds: string[]): Promise<SaleLineTime[]>;
};

/** Dashboard reads, shaped by the caller's role tier. */
export type DashboardService = {
  /** Snapshot counts for the attention cards; draft batches are manager-only. */
  getAttention(actor: DashboardActor): Promise<AttentionResponse>;
  /** Period sales and cash for everyone, plus manager-only profit and outstanding figures. */
  getSummary(
    actor: DashboardActor,
    filters: ReportingPeriodQueryFilters,
  ): Promise<DashboardSummaryResponse>;
  /** Bucketed gross-profit trend; manager tier only. */
  getTrend(actor: DashboardActor, filters: TrendQueryFilters): Promise<DashboardTrendResponse>;
};
