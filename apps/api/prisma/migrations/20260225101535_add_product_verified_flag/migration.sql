-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Price_status_idx" ON "Price"("status");
