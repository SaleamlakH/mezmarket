import type { RecordPaymentInput } from '@mez/types';
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
import { computeSaleTotals } from './utils/totals.js';
import { toSaleDetail, toSaleSummary } from './utils/mappers.js';

export function createSaleService(repository: SaleRepository): SaleService {
  return {
    async createSale(actor: Actor, input: CreateSaleInput): Promise<SaleDetailResult> {
      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const [saleConfig, products, lots] = await Promise.all([
        repository.getBusinessSaleConfig(actor.businessId),
        repository.getProductSellContext(actor.businessId, productIds),
        repository.getStockLots(actor.businessId, productIds),
      ]);

      if (!saleConfig) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      const lines = snapshotSaleLines(products, actor.businessId, input.lines);
      const allocated = allocateStock(products, lots, lines, saleConfig.allowNegativeStock);

      const taxRateApplied = saleConfig.defaultTaxRate?.toNumber() ?? 0;
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

    async listSales({ businessId, branchId }: Scope) {
      const records = await repository.listSales(businessId, branchId);
      return records.map(toSaleSummary);
    },
  };
}
