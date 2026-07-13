-- AlterTable: the Hub business a workspace was created for / linked to. Bots created in the
-- workspace inherit it when no explicit businessId is provided.
ALTER TABLE "Workspace" ADD COLUMN "businessId" TEXT;

-- CreateIndex
CREATE INDEX "Workspace_businessId_idx" ON "Workspace"("businessId");
