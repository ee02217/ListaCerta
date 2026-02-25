/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Price` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Price" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Price_idempotencyKey_key" ON "Price"("idempotencyKey");
