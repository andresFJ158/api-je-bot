-- AlterTable
ALTER TABLE "messages" ADD COLUMN "agentId" TEXT;

-- CreateIndex
CREATE INDEX "messages_agentId_idx" ON "messages"("agentId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

