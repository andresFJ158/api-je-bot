-- AlterTable (conditional - only if branches table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        -- Drop email column if it exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'email') THEN
            ALTER TABLE "branches" DROP COLUMN "email";
        END IF;
        -- Add openingHours column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'openingHours') THEN
            ALTER TABLE "branches" ADD COLUMN "openingHours" TEXT;
        END IF;
    END IF;
END $$;

