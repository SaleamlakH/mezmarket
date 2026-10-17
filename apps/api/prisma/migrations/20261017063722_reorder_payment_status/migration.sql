-- Reorder the PaymentStatus enum so an ascending sort surfaces the sales that
-- still need attention first: PENDING, then PARTIALLY_PAID, then PAID.

ALTER TABLE "sale" ALTER COLUMN "paymentStatus" DROP DEFAULT;

CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

ALTER TABLE "sale"
    ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new"
    USING ("paymentStatus"::text::"PaymentStatus_new");

DROP TYPE "PaymentStatus";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";

ALTER TABLE "sale" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';