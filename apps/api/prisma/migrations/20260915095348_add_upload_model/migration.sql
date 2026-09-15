/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[photoId]` on the table `product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'UPLOAD';

-- AlterTable
ALTER TABLE "product" DROP COLUMN "photoUrl",
ADD COLUMN     "photoId" TEXT;

-- CreateTable
CREATE TABLE "upload" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upload_storageKey_key" ON "upload"("storageKey");

-- CreateIndex
CREATE INDEX "upload_status_idx" ON "upload"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_photoId_key" ON "product"("photoId");

-- CreateIndex
CREATE INDEX "product_photoId_idx" ON "product"("photoId");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
