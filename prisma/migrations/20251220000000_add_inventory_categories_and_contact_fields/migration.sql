-- AlterTable: Add lastName and city to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- CreateIndex: Add index on phone (if not exists)
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

-- CreateIndex: Add index on city (if not exists)
CREATE INDEX IF NOT EXISTS "users_city_idx" ON "users"("city");

-- CreateTable: categories
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sub_categories
CREATE TABLE IF NOT EXISTS "sub_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory_transactions
CREATE TABLE IF NOT EXISTS "inventory_transactions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "glosa" TEXT,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add new columns to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;

-- CreateIndex: categories name unique
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");

-- CreateIndex: sub_categories unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "sub_categories_name_categoryId_key" ON "sub_categories"("name", "categoryId");

-- CreateIndex: sub_categories categoryId index
CREATE INDEX IF NOT EXISTS "sub_categories_categoryId_idx" ON "sub_categories"("categoryId");

-- CreateIndex: products categoryId index
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex: products subCategoryId index
CREATE INDEX IF NOT EXISTS "products_subCategoryId_idx" ON "products"("subCategoryId");

-- CreateIndex: inventory_transactions indexes
CREATE INDEX IF NOT EXISTS "inventory_transactions_productId_idx" ON "inventory_transactions"("productId");
CREATE INDEX IF NOT EXISTS "inventory_transactions_type_idx" ON "inventory_transactions"("type");
CREATE INDEX IF NOT EXISTS "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");
CREATE INDEX IF NOT EXISTS "inventory_transactions_agentId_idx" ON "inventory_transactions"("agentId");

-- AddForeignKey: sub_categories to categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sub_categories_categoryId_fkey'
    ) THEN
        ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: products to categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_categoryId_fkey'
    ) THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: products to sub_categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_subCategoryId_fkey'
    ) THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_subCategoryId_fkey" 
        FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: inventory_transactions to products
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_transactions_productId_fkey'
    ) THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: inventory_transactions to agents
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_transactions_agentId_fkey'
    ) THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_agentId_fkey" 
        FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

