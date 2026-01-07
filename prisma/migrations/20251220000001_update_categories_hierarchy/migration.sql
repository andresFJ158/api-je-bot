-- Drop foreign keys and indexes related to sub_categories
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_subCategoryId_fkey";
DROP INDEX IF EXISTS "products_subCategoryId_idx";

-- Add parentId to categories and update unique constraint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Update unique constraint: name should be unique per parent, not globally
DROP INDEX IF EXISTS "categories_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_parentId_key" ON "categories"("name", "parentId");

-- Add index on parentId
CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON "categories"("parentId");

-- Add foreign key for parent relationship
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_parentId_fkey'
    ) THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Remove subCategoryId from products
ALTER TABLE "products" DROP COLUMN IF EXISTS "subCategoryId";

-- Drop sub_categories table if it exists
DROP TABLE IF EXISTS "sub_categories";

-- Update products to remove subCategory references
-- Note: This will set categoryId to NULL if it was pointing to a subcategory
-- You may want to migrate data manually before running this migration

