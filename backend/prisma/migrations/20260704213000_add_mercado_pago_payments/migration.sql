ALTER TABLE "TenantConfig"
ADD COLUMN "mpPublicKey" TEXT,
ADD COLUMN "mpAccessToken" TEXT,
ADD COLUMN "mpWebhookSecret" TEXT;

ALTER TABLE "Order"
ADD COLUMN "mpPaymentId" TEXT,
ADD COLUMN "mpPaymentStatus" TEXT,
ADD COLUMN "pixQrCode" TEXT,
ADD COLUMN "pixQrCodeBase64" TEXT,
ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_mpPaymentId_key" ON "Order"("mpPaymentId");
