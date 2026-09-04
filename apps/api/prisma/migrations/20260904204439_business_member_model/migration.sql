/*
  Warnings:

  - You are about to drop the column `actorId` on the `audit_log` table. All the data in the column will be lost.
  - You are about to drop the column `closedByActorId` on the `container` table. All the data in the column will be lost.
  - You are about to drop the column `openedByActorId` on the `container` table. All the data in the column will be lost.
  - You are about to drop the column `actorId` on the `loss` table. All the data in the column will be lost.
  - You are about to drop the column `actorId` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `processedByActorId` on the `sale` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `sale` table. All the data in the column will be lost.
  - You are about to drop the column `receivedByActorId` on the `stock_batch` table. All the data in the column will be lost.
  - You are about to drop the `actor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `businessMemberId` to the `audit_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openedByMemberId` to the `container` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessMemberId` to the `loss` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessMemberId` to the `payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processedByMemberId` to the `sale` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'SERVER');

-- DropForeignKey
ALTER TABLE "actor" DROP CONSTRAINT "actor_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "actor" DROP CONSTRAINT "actor_staffId_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actorId_fkey";

-- DropForeignKey
ALTER TABLE "container" DROP CONSTRAINT "container_closedByActorId_fkey";

-- DropForeignKey
ALTER TABLE "container" DROP CONSTRAINT "container_openedByActorId_fkey";

-- DropForeignKey
ALTER TABLE "loss" DROP CONSTRAINT "loss_actorId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_actorId_fkey";

-- DropForeignKey
ALTER TABLE "sale" DROP CONSTRAINT "sale_processedByActorId_fkey";

-- DropForeignKey
ALTER TABLE "sale" DROP CONSTRAINT "sale_staffId_fkey";

-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_branchId_fkey";

-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_businessId_fkey";

-- DropForeignKey
ALTER TABLE "stock_batch" DROP CONSTRAINT "stock_batch_receivedByActorId_fkey";

-- AlterTable
ALTER TABLE "audit_log" DROP COLUMN "actorId",
ADD COLUMN     "businessMemberId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "container" DROP COLUMN "closedByActorId",
DROP COLUMN "openedByActorId",
ADD COLUMN     "closedByMemberId" TEXT,
ADD COLUMN     "openedByMemberId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "loss" DROP COLUMN "actorId",
ADD COLUMN     "businessMemberId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "actorId",
ADD COLUMN     "businessMemberId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sale" DROP COLUMN "processedByActorId",
DROP COLUMN "staffId",
ADD COLUMN     "processedByMemberId" TEXT NOT NULL,
ADD COLUMN     "serverMemberId" TEXT;

-- AlterTable
ALTER TABLE "stock_batch" DROP COLUMN "receivedByActorId",
ADD COLUMN     "receivedByMemberId" TEXT;

-- DropTable
DROP TABLE "actor";

-- DropTable
DROP TABLE "staff";

-- DropEnum
DROP TYPE "StaffRole";

-- CreateTable
CREATE TABLE "business_member" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_member_businessId_idx" ON "business_member"("businessId");

-- CreateIndex
CREATE INDEX "business_member_branchId_idx" ON "business_member"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "business_member_businessId_ownerId_key" ON "business_member"("businessId", "ownerId");

-- AddForeignKey
ALTER TABLE "business_member" ADD CONSTRAINT "business_member_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_member" ADD CONSTRAINT "business_member_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_member" ADD CONSTRAINT "business_member_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batch" ADD CONSTRAINT "stock_batch_receivedByMemberId_fkey" FOREIGN KEY ("receivedByMemberId") REFERENCES "business_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss" ADD CONSTRAINT "loss_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "business_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_openedByMemberId_fkey" FOREIGN KEY ("openedByMemberId") REFERENCES "business_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container" ADD CONSTRAINT "container_closedByMemberId_fkey" FOREIGN KEY ("closedByMemberId") REFERENCES "business_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_processedByMemberId_fkey" FOREIGN KEY ("processedByMemberId") REFERENCES "business_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_serverMemberId_fkey" FOREIGN KEY ("serverMemberId") REFERENCES "business_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "business_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_businessMemberId_fkey" FOREIGN KEY ("businessMemberId") REFERENCES "business_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
