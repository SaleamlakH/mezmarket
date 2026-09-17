/*
  Warnings:

  - You are about to drop the column `photoId` on the `product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_photoId_fkey";

-- DropIndex
DROP INDEX "product_photoId_idx";

-- DropIndex
DROP INDEX "product_photoId_key";

-- AlterTable
ALTER TABLE "product" DROP COLUMN "photoId";

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachment_uploadId_idx" ON "attachment"("uploadId");

-- CreateIndex
CREATE INDEX "attachment_recordType_recordId_idx" ON "attachment"("recordType", "recordId");

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
