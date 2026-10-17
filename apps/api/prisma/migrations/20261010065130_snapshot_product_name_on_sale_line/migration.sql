/*
  Warnings:

  - Added the required column `productName` to the `sale_line` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sale_line" ADD COLUMN     "productName" TEXT NOT NULL;
