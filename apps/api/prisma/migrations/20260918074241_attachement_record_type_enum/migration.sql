/*
  Warnings:

  - Changed the type of `recordType` on the `attachment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AttachmentRecordType" AS ENUM ('PRODUCT');

-- AlterTable
ALTER TABLE "attachment" DROP COLUMN "recordType",
ADD COLUMN     "recordType" "AttachmentRecordType" NOT NULL;

-- CreateIndex
CREATE INDEX "attachment_recordType_recordId_idx" ON "attachment"("recordType", "recordId");
