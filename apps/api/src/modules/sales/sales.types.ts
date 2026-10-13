import type { CreateSaleInput, SaleDetailResult, SaleSummaryResult } from '@mez/types';

import type {
  Payment as PaymentRecord,
  Sale as SaleRecord,
  SaleLine as SaleLineRecord,
  Customer as CustomerRecord,
} from '../../../generated/prisma/client.js';

import type { StoredDecimal } from '../../shared/types/decimal.types.js';
import type { Actor, MemberSummary, Scope } from '../../shared/types/session.types.js';
import type { ProductUnitContext } from '../../shared/types/unit.types.js';

export type {
  CreateSaleInput,
  CreateSaleLineInput,
  SaleDetailResponse,
  SaleDetailResult,
  SaleLineDetailResponse,
  SaleLineResponse,
  SaleResponse,
  PaymentResponse,
  SaleSummaryResponse,
  SaleSummaryResult,
} from '@mez/types';

/**
 * A sellable unit: the shared unit context plus the price it sells at. The
 * price is what only a sale snapshot reads, which is why it lives here rather
 * than on the shared type.
 */
export type ProductUnitSellContext = ProductUnitContext & {
  price: StoredDecimal | null;
};

export type ProductSellContext = {
  id: string;
  businessId: string;
  name: string;
  currentSealedStock: StoredDecimal;
  productUnits: ProductUnitSellContext[];
};

/**
 * One lot draw a sale line makes. A line that outruns the oldest lot keeps
 * allocating against the next one, so a line can hold several of these.
 * `unitCost` is the lot's cost at the moment of the draw, frozen so a later
 * correction to the batch never rewrites the sale.
 */
export type SaleLineAllocation = {
  stockBatchLineId: string;
  quantityPulled: number;
  unitCost: number;
};

/**
 * A sale line with its unit snapshots resolved, its price taken and its lot
 * draws allocated, ready to be written. Everything here is captured at the
 * moment of sale, so a later rename or repricing never rewrites a past line.
 *
 * `quantityInBaseUnit` is what the line takes out of the product's sealed
 * stock; `allocations` say which lots that draw came from.
 */
export type ResolvedSaleLine = {
  productId: string;
  productName: string;
  productUnitId: string;
  soldUnit: string;
  quantity: number;
  standardUnit: string;
  quantityInStandardUnit: number;
  quantityInBaseUnit: number;
  resolvedStandardUnitId: string;
  unitPrice: number;
  allocations: SaleLineAllocation[];
};

/**
 * A purchase lot still holding stock, oldest first, as the FIFO allocation
 * walks it. Remaining is in the product's base unit.
 */
export type StockLot = {
  id: string;
  productId: string;
  purchaseUnitCost: StoredDecimal;
  quantityRemaining: StoredDecimal;
};

/**
 * One product's sealed-stock movement from a sale. Sealed stock is counted per
 * product, so the several lines one product contributes are added up into a
 * single decrement rather than decremented line by line.
 */
export type StockDecrement = {
  productId: string;
  amount: number;
};

/**
 * One lot's remaining-quantity movement from a sale, in the product's base
 * unit. The several allocations a lot receives are added up into a single
 * decrement, so the write moves each lot once.
 */
export type StockLotDecrement = {
  stockBatchLineId: string;
  quantity: number;
};

/**
 * Everything the create write needs, once the service has resolved the lines,
 * allocated their stock and worked out the totals. The business, branch and
 * member come from the resolved session scope, never the request body.
 */
export type CreateSaleCommand = {
  businessId: string;
  branchId: string;
  memberId: string;
  saleDatetime: Date;
  discount: number | null;
  taxRateApplied: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: ResolvedSaleLine[];
  stockDecrements: StockDecrement[];
  lotDecrements: StockLotDecrement[];
};

/** The business settings a sale snapshots at the moment it is created. */
export type BusinessSaleConfig = {
  defaultTaxRate: StoredDecimal | null;
  allowNegativeStock: boolean;
};

export type SaleLineRecordWithProduct = SaleLineRecord & {
  product: {
    brand: string | null;
  };
};

/**
 * A sale with everything a read carries: its lines and each line's product
 * brand, its payments, the member who processed it, the server who took the
 * order, and the attached customer.
 */
export type SaleRecordWithDetail = SaleRecord & {
  lines: SaleLineRecordWithProduct[];
  payments: PaymentRecord[];
  processedByMember: MemberSummary;
  serverMember: MemberSummary | null;
  customer: CustomerRecord | null;
};

/**
 * A sale as a history read returns it: the whole sale row with its lines and
 * relations included. The service narrows it down to the summary the client
 * sees; the read itself carries no projection.
 */
export type SaleRecordSummary = SaleRecord & {
  lines: SaleLineRecord[];
  processedByMember: MemberSummary;
  serverMember: MemberSummary | null;
  customer: CustomerRecord | null;
};

export type SaleRepository = {
  getBusinessSaleConfig(businessId: string): Promise<BusinessSaleConfig | null>;
  getProductSellContext(businessId: string, productIds: string[]): Promise<ProductSellContext[]>;
  getStockLots(businessId: string, productIds: string[]): Promise<StockLot[]>;
  createSale(command: CreateSaleCommand): Promise<SaleRecordWithDetail>;
  listSales(businessId: string, branchId: string): Promise<SaleRecordSummary[]>;
};

export type SaleService = {
  createSale(actor: Actor, input: CreateSaleInput): Promise<SaleDetailResult>;
  listSales(scope: Scope): Promise<SaleSummaryResult[]>;
};
