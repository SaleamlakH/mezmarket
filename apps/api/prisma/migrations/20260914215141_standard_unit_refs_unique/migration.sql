/*
  Warnings:

  - A unique constraint covering the columns `[standardUnitId]` on the table `dimension_reference` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "dimension_reference_standardUnitId_key" ON "dimension_reference"("standardUnitId");
