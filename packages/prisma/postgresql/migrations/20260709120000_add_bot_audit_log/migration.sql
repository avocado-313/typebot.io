-- CreateEnum
CREATE TYPE "BotAuditAction" AS ENUM ('ARCHIVE', 'UNARCHIVE', 'DUPLICATE', 'PROMOTE', 'FALLBACK_HIT', 'LINK');

-- CreateEnum
CREATE TYPE "BotAuditActor" AS ENUM ('USER', 'API_TOKEN', 'SQL', 'SYSTEM');

-- CreateTable
CREATE TABLE "BotAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "botId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "action" "BotAuditAction" NOT NULL,
    "actorType" "BotAuditActor" NOT NULL,
    "actorId" TEXT,
    "source" TEXT,
    "metadata" JSONB,

    CONSTRAINT "BotAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotAuditLog_botId_createdAt_idx" ON "BotAuditLog"("botId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BotAuditLog_workspaceId_createdAt_idx" ON "BotAuditLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BotAuditLog_action_idx" ON "BotAuditLog"("action");

-- Audit trigger for Typebot.isArchived transitions.
--
-- This is the diagnosis net for the "mass auto-archiving" incident: it records EVERY
-- archive/unarchive, including changes made by raw SQL / Prisma Studio (which is the
-- suspected source, since no code path bulk-archives). The trigger is the sole author of
-- ARCHIVE/UNARCHIVE rows so there is never double-logging with app code.
--
-- The application attributes the actor by setting transaction-local GUCs before the
-- UPDATE (SET LOCAL app.actor_id / app.actor_type / app.source / app.metadata). These are
-- custom dotted settings that need no server config; current_setting(name, true) returns
-- NULL when unset. When the change comes from raw SQL, the GUCs are unset and the row is
-- stamped actorType = 'SQL' with source = 'sql' — pinpointing out-of-band archiving.
CREATE OR REPLACE FUNCTION log_typebot_archive_change() RETURNS trigger AS $$
DECLARE
  v_actor_id   text := current_setting('app.actor_id', true);
  v_actor_type text := current_setting('app.actor_type', true);
  v_source     text := current_setting('app.source', true);
  v_metadata   text := current_setting('app.metadata', true);
BEGIN
  INSERT INTO "BotAuditLog" (
    "id", "createdAt", "botId", "workspaceId", "action", "actorType", "actorId", "source", "metadata"
  )
  VALUES (
    gen_random_uuid()::text,
    CURRENT_TIMESTAMP,
    NEW."id",
    NEW."workspaceId",
    CASE WHEN NEW."isArchived" THEN 'ARCHIVE'::"BotAuditAction" ELSE 'UNARCHIVE'::"BotAuditAction" END,
    CASE
      WHEN v_actor_type = 'USER'      THEN 'USER'::"BotAuditActor"
      WHEN v_actor_type = 'API_TOKEN' THEN 'API_TOKEN'::"BotAuditActor"
      WHEN v_actor_type = 'SYSTEM'    THEN 'SYSTEM'::"BotAuditActor"
      ELSE 'SQL'::"BotAuditActor"
    END,
    NULLIF(v_actor_id, ''),
    COALESCE(NULLIF(v_source, ''), 'sql'),
    CASE WHEN v_metadata IS NULL OR v_metadata = '' THEN NULL ELSE v_metadata::jsonb END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER UPDATE OF "isArchived" + the WHEN guard means the trigger fires only on the rare
-- archive/unarchive transition, never on ordinary bot edits — negligible overhead.
CREATE TRIGGER typebot_archive_audit
AFTER UPDATE OF "isArchived" ON "Typebot"
FOR EACH ROW
WHEN (OLD."isArchived" IS DISTINCT FROM NEW."isArchived")
EXECUTE FUNCTION log_typebot_archive_change();
