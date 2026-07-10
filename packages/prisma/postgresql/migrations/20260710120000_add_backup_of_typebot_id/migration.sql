-- AlterTable: pointer from a backup snapshot to its source bot (nullable, no FK so the
-- backup survives the source's deletion).
ALTER TABLE "Typebot" ADD COLUMN "backupOfTypebotId" TEXT;

-- CreateIndex
CREATE INDEX "Typebot_backupOfTypebotId_idx" ON "Typebot"("backupOfTypebotId");
