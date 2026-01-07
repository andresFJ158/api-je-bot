-- AlterTable
ALTER TABLE "bot_config" ADD COLUMN     "autoCreateOrderOnPaymentRequest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoSendQRImages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "classificationCategories" TEXT[] DEFAULT ARRAY['ventas', 'soporte', 'facturacion', 'otros']::TEXT[],
ADD COLUMN     "contextMessages" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "extractOrderFromContext" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "findNearestBranchOnLocationShare" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationInstructions" TEXT,
ADD COLUMN     "locationKeywords" TEXT,
ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'deepseek-chat',
ADD COLUMN     "notifyOrderStatusChanges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "orderInstructions" TEXT,
ADD COLUMN     "prepareOrderInsteadOfCreate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLocationInstructions" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "systemPrompt" SET DEFAULT 'Eres un Asistente Virtual (Chatbot) que actúa como punto de entrada del cliente. Tu función es: CLASIFICAR las consultas de los usuarios, COTIZAR productos y precios, y REGISTRAR información (pedidos, contactos, etc.). IMPORTANTE: NUNCA vendas ni confirmes pagos. Solo proporciona información, cotizaciones y registra datos. Las ventas y confirmaciones de pago deben ser manejadas por agentes humanos.';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "comboId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "whatsappJid" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "offerPrice" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "qrImageUrl" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountType" TEXT,
    "cci" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "combos_categoryId_idx" ON "combos"("categoryId");

-- CreateIndex
CREATE INDEX "combos_isActive_idx" ON "combos"("isActive");

-- CreateIndex
CREATE INDEX "combo_items_comboId_idx" ON "combo_items"("comboId");

-- CreateIndex
CREATE INDEX "combo_items_productId_idx" ON "combo_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "combo_items_comboId_productId_key" ON "combo_items"("comboId", "productId");

-- CreateIndex
CREATE INDEX "payment_methods_type_idx" ON "payment_methods"("type");

-- CreateIndex
CREATE INDEX "payment_methods_isActive_idx" ON "payment_methods"("isActive");

-- CreateIndex
CREATE INDEX "payment_methods_order_idx" ON "payment_methods"("order");

-- CreateIndex
CREATE INDEX "order_items_comboId_idx" ON "order_items"("comboId");

-- CreateIndex
CREATE INDEX "users_whatsappJid_idx" ON "users"("whatsappJid");

-- AddForeignKey
ALTER TABLE "combos" ADD CONSTRAINT "combos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
