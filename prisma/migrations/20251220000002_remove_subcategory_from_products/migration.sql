-- Remove subCategoryId column from products table
ALTER TABLE "products" DROP COLUMN IF EXISTS "subCategoryId";

-- Ensure categoryId is nullable (should already be, but making sure)
-- The constraint error suggests there might be an old 'category' field, let's check and remove it if exists
DO $$ 
BEGIN
    -- Check if there's a 'category' column (old text field) and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category' AND data_type = 'text'
    ) THEN
        ALTER TABLE "products" DROP COLUMN "category";
    END IF;
END $$;

-- Ensure stock defaults to 0 and is not nullable
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT 0;
ALTER TABLE "products" ALTER COLUMN "stock" SET NOT NULL;

