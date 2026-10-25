/*
  Warnings:

  - You are about to drop the column `taxDisplayMode` on the `business` table. All the data in the column will be lost.
  - You are about to alter the column `defaultTaxRate` on the `business` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,4)` to `Decimal(5,2)`.
  - You are about to alter the column `taxRateApplied` on the `sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,4)` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "business" DROP COLUMN "taxDisplayMode",
ADD COLUMN     "taxOnSales" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "defaultTaxRate" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "sale" ALTER COLUMN "taxRateApplied" SET DATA TYPE DECIMAL(5,2);

-- DropEnum
DROP TYPE "TaxDisplayMode";
