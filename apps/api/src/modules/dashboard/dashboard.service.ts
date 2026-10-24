import type {
  AttentionDraftBatches,
  AttentionExpiring,
  AttentionResponse,
  DashboardSummaryResponse,
  DashboardTrendResponse,
} from '@mez/types';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { roundMoney } from '../../shared/utils/rounding.js';
import type {
  CostingLot,
  DashboardActor,
  DashboardRepository,
  DashboardService,
  SaleLineTime,
  TrendCostGroup,
} from './dashboard.types.js';
import { toAttentionStock } from './utils/attention.js';
import { cogsOf, deltaPercentOf, grossProfitOf, lossesOf } from './utils/profit.js';
import {
  toCashFigures,
  toCashResponse,
  toDraftBatches,
  toOutstanding,
  toSalesFigures,
  toSalesResponse,
  toUnpaid,
} from './utils/mappers.js';
import { buildTrendPoints } from './utils/trend.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Thresholds are server constants and are never returned to a client. */
const OVERDUE_AFTER_DAYS = 7;
const EXPIRING_WITHIN_DAYS = 30;
const MAX_PERIOD_DAYS = 366;
const HOURLY_MAX_HOURS = 48;

type TrendCostData = {
  costs: TrendCostGroup[];
  lineMap: SaleLineTime[];
  lots: CostingLot[];
};

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

export function createDashboardService(repository: DashboardRepository): DashboardService {
  return {
    async getAttention(actor: DashboardActor): Promise<AttentionResponse> {
      const asOf = new Date();
      const overdueBefore = new Date(asOf.getTime() - OVERDUE_AFTER_DAYS * MS_PER_DAY);
      const expiryBefore = new Date(asOf.getTime() + EXPIRING_WITHIN_DAYS * MS_PER_DAY);
      const isManager = actor.role === 'OWNER' || actor.role === 'MANAGER';

      // Every category starts immediately; the final Promise.all is the response join.
      const stock = repository
        .stockPositions(actor.businessId, actor.branchId)
        .then(toAttentionStock);
      const expiredLots = repository.expiredLotCount(actor.businessId, actor.branchId, asOf);
      const expiringLots = repository.expiringLotCount(
        actor.businessId,
        actor.branchId,
        asOf,
        expiryBefore,
      );
      const earliestLot = repository.earliestExpiringLot(
        actor.businessId,
        actor.branchId,
        expiryBefore,
      );
      const unpaid = repository
        .unpaidAggregate(actor.businessId, actor.branchId, overdueBefore)
        .then(toUnpaid);
      // Staff cannot open stock intake, so the draft-batch queries are skipped outright.
      const drafts: Promise<AttentionDraftBatches | undefined> = isManager
        ? repository.draftBatchAggregate(actor.businessId, actor.branchId).then(toDraftBatches)
        : Promise.resolve(undefined);

      const [stockResult, expiredCount, expiringCount, earliest, unpaidResult, draftResult] =
        await Promise.all([stock, expiredLots, expiringLots, earliestLot, unpaid, drafts]);

      const expiring: AttentionExpiring = {
        lotCount: expiredCount + expiringCount,
        expiredLotCount: expiredCount,
        expiringLotCount: expiringCount,
        earliest:
          earliest && earliest.expiryDate
            ? {
                productName: earliest.product.name,
                expiryDate: earliest.expiryDate.toISOString(),
              }
            : null,
      };

      const response: AttentionResponse = {
        asOf: asOf.toISOString(),
        stock: stockResult,
        expiring,
        unpaid: unpaidResult,
      };

      if (draftResult !== undefined) response.draftBatches = draftResult;

      return response;
    },

    async getSummary(actor: DashboardActor, filters): Promise<DashboardSummaryResponse> {
      const { from, to } = filters;
      const period = { from: from.toISOString(), to: to.toISOString() };
      const asOf = new Date();
      const overdueBefore = new Date(asOf.getTime() - OVERDUE_AFTER_DAYS * MS_PER_DAY);

      const salesCurrent = repository
        .salesAggregate(actor.businessId, actor.branchId, from, to)
        .then(toSalesFigures);
      const cash = repository
        .cashAggregate(actor.businessId, actor.branchId, from, to)
        .then(toCashFigures);

      // Staff branch returns before any manager-only query starts.
      if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
        const [sales, cashResult] = await Promise.all([salesCurrent, cash]);

        return {
          period,
          asOf: asOf.toISOString(),
          sales: toSalesResponse(sales),
          cashCollected: toCashResponse(cashResult),
        };
      }

      const span = to.getTime() - from.getTime();
      const previousFrom = new Date(from.getTime() - span);

      const salesPrevious = repository
        .salesAggregate(actor.businessId, actor.branchId, previousFrom, from)
        .then(toSalesFigures);

      const cogsCurrent = repository
        .cogsGroups(actor.businessId, actor.branchId, from, to)
        .then(async (groups) => {
          const lots = await repository.lotContext(
            distinct(groups.map((group) => group.stockBatchLineId)),
          );

          return cogsOf(groups, lots);
        });

      const cogsPrevious = repository
        .cogsGroups(actor.businessId, actor.branchId, previousFrom, from)
        .then(async (groups) => {
          const lots = await repository.lotContext(
            distinct(groups.map((group) => group.stockBatchLineId)),
          );

          return cogsOf(groups, lots);
        });

      const outstanding = repository
        .unpaidAggregate(actor.businessId, actor.branchId, overdueBefore)
        .then(toOutstanding);

      const losses = repository
        .lossGroups(actor.businessId, actor.branchId, from, to)
        .then(async (groups) => {
          const lots = await repository.lotContext(
            distinct(groups.map((group) => group.stockBatchLineId)),
          );

          return lossesOf(groups, lots);
        });

      // Gross profit waits only for its own sales/COGS pair, not for the other fields.
      const grossProfitCurrent = Promise.all([salesCurrent, cogsCurrent]).then(([sales, cogs]) =>
        grossProfitOf(sales, cogs),
      );
      const grossProfitPrevious = Promise.all([salesPrevious, cogsPrevious]).then(([sales, cogs]) =>
        grossProfitOf(sales, cogs),
      );

      const [
        sales,
        cashResult,
        currentGrossProfit,
        previousGrossProfit,
        outstandingResult,
        lossResult,
      ] = await Promise.all([
        salesCurrent,
        cash,
        grossProfitCurrent,
        grossProfitPrevious,
        outstanding,
        losses,
      ]);

      return {
        period,
        asOf: asOf.toISOString(),
        grossProfit: {
          value: roundMoney(currentGrossProfit),
          previous: roundMoney(previousGrossProfit),
          deltaPercent: deltaPercentOf(currentGrossProfit, previousGrossProfit),
        },
        sales: toSalesResponse(sales),
        cashCollected: toCashResponse(cashResult),
        outstanding: outstandingResult,
        losses: {
          total: roundMoney(lossResult.total),
          count: lossResult.count,
        },
      };
    },

    async getTrend(actor: DashboardActor, filters): Promise<DashboardTrendResponse> {
      if (actor.role !== 'OWNER' && actor.role !== 'MANAGER') {
        throw new AppError(
          ERROR_CODES.FORBIDDEN,
          'You do not have permission to view the trend',
          403,
        );
      }

      const { from, to, bucket } = filters;
      const span = to.getTime() - from.getTime();

      if (bucket === 'hour' && span > HOURLY_MAX_HOURS * MS_PER_HOUR) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          'An hourly trend cannot span more than 48 hours',
          400,
          { bucket: 'An hourly trend cannot span more than 48 hours' },
        );
      }

      if (span > MAX_PERIOD_DAYS * MS_PER_DAY) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          'The period cannot span more than 366 days',
          400,
          { to: 'The period cannot span more than 366 days' },
        );
      }

      const salesByTime = repository.salesByTimestamp(actor.businessId, actor.branchId, from, to);
      const costData: Promise<TrendCostData> = repository
        .trendCostGroups(actor.businessId, actor.branchId, from, to)
        .then(async (costs) => {
          if (costs.length === 0) return { costs, lineMap: [], lots: [] };

          const [lineMap, lots] = await Promise.all([
            repository.saleLineMap(distinct(costs.map((cost) => cost.saleLineId))),
            repository.lotContext(distinct(costs.map((cost) => cost.stockBatchLineId))),
          ]);

          return { costs, lineMap, lots };
        });

      const [salesTimes, { costs, lineMap, lots }] = await Promise.all([salesByTime, costData]);

      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        bucket,
        points: buildTrendPoints(from, to, bucket, salesTimes, costs, lineMap, lots),
      };
    },
  };
}
