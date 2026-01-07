-- Update existing orders with old status values to new status values
UPDATE "orders" SET "status" = 'PENDIENTE_DE_PAGO' WHERE "status" = 'PENDIENTE';
UPDATE "orders" SET "status" = 'PAGO_RECIBIDO' WHERE "status" = 'EN_PROCESO';
-- Keep COMPLETADO as is
-- Delete orders with CANCELADO status or update them to PENDIENTE_DE_PAGO
UPDATE "orders" SET "status" = 'PENDIENTE_DE_PAGO' WHERE "status" = 'CANCELADO';

-- Update default value in the table (this is handled by Prisma schema, but we can ensure it)
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_DE_PAGO';

