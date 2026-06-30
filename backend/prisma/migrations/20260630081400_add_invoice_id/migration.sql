-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "invoiceId" TEXT;
CREATE UNIQUE INDEX "payment_requests_invoiceId_key" ON "payment_requests"("invoiceId");
