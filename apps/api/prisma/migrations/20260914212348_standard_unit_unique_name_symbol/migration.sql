/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `standard_unit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[symbol]` on the table `standard_unit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "standard_unit_name_key" ON "standard_unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "standard_unit_symbol_key" ON "standard_unit"("symbol");
