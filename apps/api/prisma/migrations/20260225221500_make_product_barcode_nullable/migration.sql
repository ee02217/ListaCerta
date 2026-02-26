-- Allow manual products without barcode.
ALTER TABLE "Product"
ALTER COLUMN "barcode" DROP NOT NULL;
