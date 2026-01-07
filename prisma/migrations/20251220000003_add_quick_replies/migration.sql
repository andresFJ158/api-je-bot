-- CreateTable: quick_replies
CREATE TABLE IF NOT EXISTS "quick_replies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: quick_replies category index
CREATE INDEX IF NOT EXISTS "quick_replies_category_idx" ON "quick_replies"("category");

-- CreateIndex: quick_replies order index
CREATE INDEX IF NOT EXISTS "quick_replies_order_idx" ON "quick_replies"("order");

