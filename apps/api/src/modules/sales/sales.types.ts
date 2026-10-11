import type { CreateSaleInput, SaleDetailResult } from '@mez/types';

import type {
  Payment as PaymentRecord,
  Sale as SaleRecord,
  SaleLine as SaleLineRecord,
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
  productUnits: ProductUnitSellContext[];
};

/**
 * A sale line with its unit snapshots resolved and its price taken, ready to be
 * written. Everything here is captured at the moment of sale, so a later rename
 * or repricing never rewrites a past line.
 */
export type ResolvedSaleLine = {
  productId: string;
  productName: string;
  productUnitId: string;
  soldUnit: string;
  quantity: number;
  standardUnit: string;
  quantityInStandardUnit: number;
  resolvedStandardUnitId: string;
  unitPrice: number;
};

/**
 * Everything the create write needs, once the service has resolved the lines
 * and worked out the totals. The business, branch and member come from the
 * resolved session scope, never the request body.
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
};

/** The business tax setting a sale snapshots at the moment it is created. */
export type BusinessTaxConfig = {
  defaultTaxRate: StoredDecimal | null;
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
  customer: { id: string; name: string } | null;
};

export type SaleRepository = {
  getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig | null>;
  getProductSellContext(businessId: string, productIds: string[]): Promise<ProductSellContext[]>;
  createSale(command: CreateSaleCommand): Promise<SaleRecordWithDetail>;
  listSales(businessId: string, branchId: string): Promise<SaleRecordWithDetail[]>;
};

export type SaleService = {
  createSale(actor: Actor, input: CreateSaleInput): Promise<SaleDetailResult>;
  listSales(scope: Scope): Promise<SaleDetailResult[]>;
};
