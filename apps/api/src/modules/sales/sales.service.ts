import type { RecordPaymentInput, SaleListFilters } from '@mez/types';
import type {
  CreateSaleInput,
  SaleDetailResult,
  SaleRepository,
  SaleService,
} from './sales.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { amountToRecord, resolveInitialPayment, toResolvedPayment } from './utils/payment.js';
import { snapshotSaleLines } from './utils/snapshot.js';
import { allocateStock, sumBaseByProduct, sumDrawsByLot } from './utils/stock.js';
import { assertSaleLines } from './utils/validation.js';
import { computeSaleTotals } from './utils/totals.js';
import { toSaleDetail, toSaleSummary } from './utils/mappers.js';
import { toSaleListQuery } from './utils/filters.js';

export function createSaleService(repository: SaleRepository): SaleService {
  return {
    async getSale(actor: Actor, saleId: string): Promise<SaleDetailResult> {
      const record = await repository.getSale(actor.businessId, saleId);
      if (!record) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Sale not found', 404);
      }
      return toSaleDetail(record);
    },

    async createSale(actor: Actor, input: CreateSaleInput): Promise<SaleDetailResult> {
      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const [saleConfig, products, lots, customer, server] = await Promise.all([
        repository.getBusinessSaleConfig(actor.businessId),
        repository.getProductSellContext(actor.businessId, productIds),
        repository.getStockLots(actor.businessId, productIds),
        // A customer named by the sale must belong to the business; a sale with
        // none never reads one back.
        input.customerId === undefined
          ? Promise.resolve(null)
          : repository.getCustomer(actor.businessId, input.customerId),
        // A server named by the sale must be an active server of the business;
        // attribution with none named never reads one back.
        input.serverMemberId === undefined
          ? Promise.resolve(null)
          : repository.getServer(actor.businessId, input.serverMemberId),
      ]);

      if (!saleConfig) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      if (input.customerId !== undefined && customer === null) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Customer not found', 400, {
          customerId: 'Select a valid customer',
        });
      }

      if (input.serverMemberId !== undefined && server === null) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Server not found', 400, {
          serverMemberId: 'Select a valid server',
        });
      }

      assertSaleLines(products, actor.businessId, input.lines, saleConfig.allowNegativeStock);

      const lines = snapshotSaleLines(products, actor.businessId, input.lines);
      const allocated = allocateStock(products, lots, lines, saleConfig.allowNegativeStock);

      const taxRateApplied = saleConfig.taxOnSales
        ? (saleConfig.defaultTaxRate?.toNumber() ?? 0)
        : 0;
      const { subtotal, taxAmount, total } = computeSaleTotals(
        allocated,
        taxRateApplied,
        input.discount,
      );

      const initial = resolveInitialPayment(input.initialPayment, total);

      const record = await repository.createSale({
        businessId: actor.businessId,
        branchId: actor.branchId,
        memberId: actor.memberId,
        saleDatetime: input.saleDatetime ?? new Date(),
        discount: input.discount ?? null,
        taxRateApplied,
        subtotal,
        taxAmount,
        total,
        paymentStatus: initial.status,
        amountPaid: initial.amountPaid,
        balanceDue: initial.balanceDue,
        customerId: customer?.id ?? null,
        serverMemberId: server?.id ?? null,
        initialPayment: initial.payment,
        lines: allocated,
        stockDecrements: sumBaseByProduct(allocated),
        lotDecrements: sumDrawsByLot(allocated),
      });

      return toSaleDetail(record);
    },

    async recordPayment(actor: Actor, saleId: string, input: RecordPaymentInput) {
      const sale = await repository.getSaleForPayment(actor.businessId, saleId);

      if (!sale) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Sale not found', 404);
      }

      if (sale.voidStatus === 'VOIDED') {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'A voided sale cannot be paid', 400);
      }

      if (sale.paymentStatus === 'PAID') {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'This sale is already paid', 400);
      }

      // A pending stamp only means "nothing paid": a sale that already holds a
      // payment can never be walked back to it.
      if (input.status === 'PENDING' && sale.amountPaid.toNumber() > 0) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          'A sale with recorded payments cannot be marked pending',
          400,
        );
      }

      const amount = amountToRecord(input.status, input.amount, sale.balanceDue.toNumber());

      const record = await repository.recordPayment({
        businessId: actor.businessId,
        saleId,
        memberId: actor.memberId,
        total: sale.total.toNumber(),
        paymentStatus: input.status,
        payment: amount === null ? null : toResolvedPayment(input, amount),
      });

      return toSaleDetail(record);
    },

    async listSales({ businessId, branchId }: Scope, filters: SaleListFilters) {
      const records = await repository.listSales(
        businessId,
        branchId,
        toSaleListQuery(filters, new Date()),
      );
      return records.map(toSaleSummary);
    },
  };
}
