-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "document" TEXT NOT NULL DEFAULT '',
    "cuit" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "birthDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "debtBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

