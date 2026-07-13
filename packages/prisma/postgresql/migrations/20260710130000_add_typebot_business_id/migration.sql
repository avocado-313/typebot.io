-- AlterTable: the Hub business a bot was created for / linked to. Persisted so it survives
-- an unlink; used to name backup copies (<name>-<businessId>).
ALTER TABLE "Typebot" ADD COLUMN "businessId" TEXT;
