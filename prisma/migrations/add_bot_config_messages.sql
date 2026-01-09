-- Migration: Add configurable message fields to bot_config table
-- Run this SQL directly in your PostgreSQL database

ALTER TABLE bot_config 
ADD COLUMN IF NOT EXISTS "orderSuccessMessage" TEXT,
ADD COLUMN IF NOT EXISTS "orderErrorMessage" TEXT,
ADD COLUMN IF NOT EXISTS "orderNotFoundMessage" TEXT,
ADD COLUMN IF NOT EXISTS "orderPrepareErrorMessage" TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethodsMessage" TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethodsNotFoundMessage" TEXT,
ADD COLUMN IF NOT EXISTS "locationDefaultMessage" TEXT,
ADD COLUMN IF NOT EXISTS "nearestBranchMessage" TEXT,
ADD COLUMN IF NOT EXISTS "generalErrorMessage" TEXT,
ADD COLUMN IF NOT EXISTS "branchNotFoundMessage" TEXT,
ADD COLUMN IF NOT EXISTS "productsRequiredMessage" TEXT,
ADD COLUMN IF NOT EXISTS "paymentConfirmationMessage" TEXT;

