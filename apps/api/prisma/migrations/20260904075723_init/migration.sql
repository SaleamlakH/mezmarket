-- CreateEnum
CREATE TYPE "TaxDisplayMode" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'CASHIER', 'SERVER');

-- CreateEnum
CREATE TYPE "UnitRole" AS ENUM ('BASE', 'MOU', 'STANDARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UnitDependsOn" AS ENUM ('BASE', 'MOU');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "VoidStatus" AS ENUM ('NONE', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "LossReason" AS ENUM ('DAMAGE', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('STOCK_BATCH', 'STOCK_BATCH_LINE', 'SALE', 'CONTAINER', 'LOSS', 'STAFF', 'BUSINESS', 'PRODUCT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'CONFIRMED', 'VOIDED', 'CLOSED', 'REFUNDED', 'UPDATED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "owner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_identity" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "defaultTaxRate" DECIMAL(6,4),
    "taxDisplayMode" "TaxDisplayMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT true,
    "lowStockDefaultThreshold" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'main',
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dimension" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dimension_reference" (
    "dimensionId" TEXT NOT NULL,
    "standardUnitId" TEXT NOT NULL,

    CONSTRAINT "dimension_reference_pkey" PRIMARY KEY ("dimensionId")
);

-- CreateTable
CREATE TABLE "standard_unit" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "ratioToReferenceUnit" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standard_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_unit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitRole" "UnitRole" NOT NULL,
    "standardUnitId" TEXT,
    "name" TEXT NOT NULL,
    "dependsOn" "UnitDependsOn",
    "conversionRate" DECIMAL(18,6),
    "price" DECIMAL(10,2),
    "purchaseCapable" BOOLEAN NOT NULL DEFAULT false,
    "sellCapable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "trackAsPartial" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" DECIMAL(12,4),
    "currentSealedStock" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "supplierName" TEXT,
    "referenceNumber" TEXT,
    "batchDate" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "receivedByActorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batch_line" (
    "id" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseUnit" TEXT NOT NULL,
    "purchaseQuantity" DECIMAL(12,4) NOT NULL,
    "purchaseUnitCost" DECIMAL(10,2) NOT NULL,
    "standardUnit" TEXT NOT NULL,
    "standardQuantity" DECIMAL(12,4) NOT NULL,
    "productUnitId" TEXT,
    "resolvedStandardUnitId" TEXT,
    "quantityRemaining" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batch_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loss" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockBatchLineId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "standardUnit" TEXT NOT NULL,
    "standardQuantity" DECIMAL(12,4) NOT NULL,
    "productUnitId" TEXT,
    "resolvedStandardUnitId" TEXT,
    "reason" "LossReason" NOT NULL,
    "reasonDetail" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stockBatchLineId" TEXT NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'OPEN',
    "initialMouQty" DECIMAL(12,4) NOT NULL,
    "remainingMouQty" DECIMAL(12,4) NOT NULL,
    "openedByActorId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByActorId" TEXT,
    "closedAt" TIMESTAMP(3),
    "deviation" DECIMAL(12,4),
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "processedByActorId" TEXT NOT NULL,
    "staffId" TEXT,
    "customerId" TEXT,
    "saleDatetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount" DECIMAL(10,2),
    "taxRateApplied" DECIMAL(6,4) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "voidStatus" "VoidStatus" NOT NULL DEFAULT 'NONE',
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "soldUnit" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "standardUnit" TEXT NOT NULL,
    "quantityInStandardUnit" DECIMAL(12,4) NOT NULL,
    "productUnitId" TEXT,
    "resolvedStandardUnitId" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "containerId" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "refundRestocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line_cost" (
    "id" TEXT NOT NULL,
    "saleLineId" TEXT NOT NULL,
    "stockBatchLineId" TEXT NOT NULL,
    "quantityPulled" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_line_cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "methodDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_identity_ownerId_key" ON "account_identity"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "account_identity_providerUserId_key" ON "account_identity"("providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "actor_ownerId_key" ON "actor"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "actor_staffId_key" ON "actor"("staffId");

-- CreateIndex
CREATE INDEX "business_ownerId_idx" ON "business"("ownerId");

-- CreateIndex
CREATE INDEX "branch_businessId_idx" ON "branch"("businessId");

-- CreateIndex
CREATE INDEX "staff_businessId_idx" ON "staff"("businessId");

-- CreateIndex
CREATE INDEX "staff_branchId_idx" ON "staff"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "dimension_name_key" ON "dimension"("name");

-- CreateIndex
CREATE INDEX "standard_unit_dimensionId_idx" ON "standard_unit"("dimensionId");

-- CreateIndex
CREATE INDEX "product_unit_productId_idx" ON "product_unit"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_unit_productId_name_key" ON "product_unit"("productId", "name");

-- CreateIndex
CREATE INDEX "product_businessId_idx" ON "product"("businessId");

-- CreateIndex
CREATE INDEX "product_branchId_idx" ON "product"("branchId");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "category_businessId_name_key" ON "category"("businessId", "name");

-- CreateIndex
CREATE INDEX "stock_batch_businessId_idx" ON "stock_batch"("businessId");

-- CreateIndex
CREATE INDEX "stock_batch_branchId_idx" ON "stock_batch"("branchId");

-- CreateIndex
CREATE INDEX "stock_batch_line_stockBatchId_idx" ON "stock_batch_line"("stockBatchId");

-- CreateIndex
CREATE INDEX "stock_batch_line_productId_idx" ON "stock_batch_line"("productId");

-- CreateIndex
CREATE INDEX "loss_productId_idx" ON "loss"("productId");

-- CreateIndex
CREATE INDEX "loss_stockBatchLineId_idx" ON "loss"("stockBatchLineId");

-- CreateIndex
CREATE INDEX "container_productId_status_idx" ON "container"("productId", "status");

-- CreateIndex
CREATE INDEX "container_branchId_idx" ON "container"("branchId");

-- CreateIndex
CREATE INDEX "customer_businessId_idx" ON "customer"("businessId");

-- CreateIndex
CREATE INDEX "sale_businessId_idx" ON "sale"("businessId");

-- CreateIndex
CREATE INDEX "sale_branchId_idx" ON "sale"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_branchId_invoiceNumber_key" ON "sale"("branchId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "sale_line_saleId_idx" ON "sale_line"("saleId");

-- CreateIndex
CREATE INDEX "sale_line_containerId_idx" ON "sale_line"("containerId");

-- CreateIndex
CREATE INDEX "sale_line_cost_saleLineId_idx" ON "sale_line_cost"("saleLineId");

-- CreateIndex
CREATE INDEX "sale_line_cost_stockBatchLineId_idx" ON "sale_line_cost"("stockBatchLineId");

-- CreateIndex
CREATE INDEX "payment_saleId_idx" ON "payment"("saleId");

-- CreateIndex
CREATE INDEX "audit_log_businessId_idx" ON "audit_log"("businessId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "account_identity" ADD CONSTRAINT "account_identity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_reference" ADD CONSTRAINT "dimension_reference_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_reference" ADD CONSTRAINT "dimension_reference_standardUnitId_fkey" FOREIGN KEY ("standardUnitId") REFERENCES "standard_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_unit" ADD CONSTRAINT "standard_unit_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "dimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit" ADD CONSTRAINT "product_unit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit" ADD CONSTRAINT "product_unit_standardUnitId_fkey" FOREIGN KEY ("standardUnitId") REFERENCES "standard_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch" ADD CONSTRAINT "stock_batch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch" ADD CONSTRAINT "stock_batch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch" ADD CONSTRAINT "stock_batch_receivedByActorId_fkey" FOREIGN KEY ("receivedByActorId") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch_line" ADD CONSTRAINT "stock_batch_line_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "stock_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch_line" ADD CONSTRAINT "stock_batch_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch_line" ADD CONSTRAINT "stock_batch_line_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "product_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch_line" ADD CONSTRAINT "stock_batch_line_resolvedStandardUnitId_fkey" FOREIGN KEY ("resolvedStandardUnitId") REFERENCES "standard_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_stockBatchLineId_fkey" FOREIGN KEY ("stockBatchLineId") REFERENCES "stock_batch_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "product_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_resolvedStandardUnitId_fkey" FOREIGN KEY ("resolvedStandardUnitId") REFERENCES "standard_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_stockBatchLineId_fkey" FOREIGN KEY ("stockBatchLineId") REFERENCES "stock_batch_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_openedByActorId_fkey" FOREIGN KEY ("openedByActorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_closedByActorId_fkey" FOREIGN KEY ("closedByActorId") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_processedByActorId_fkey" FOREIGN KEY ("processedByActorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "product_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_resolvedStandardUnitId_fkey" FOREIGN KEY ("resolvedStandardUnitId") REFERENCES "standard_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "container"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_cost" ADD CONSTRAINT "sale_line_cost_saleLineId_fkey" FOREIGN KEY ("saleLineId") REFERENCES "sale_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_cost" ADD CONSTRAINT "sale_line_cost_stockBatchLineId_fkey" FOREIGN KEY ("stockBatchLineId") REFERENCES "stock_batch_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
