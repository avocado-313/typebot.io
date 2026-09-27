-- CreateTable
-- Component count/allowlist limits for an Azeer plan family, resolved from the Hub
-- (see packages/lib/getWorkspacePlanKey.ts). Written IF NOT EXISTS / ON CONFLICT DO
-- NOTHING, same idempotent style as core.analytics_plan_gate, so it's safe to re-run.
CREATE TABLE IF NOT EXISTS "PlanComponentConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planKey" TEXT NOT NULL,
    "maxComponents" INTEGER,
    "allowedBlockTypes" JSONB NOT NULL,

    CONSTRAINT "PlanComponentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlanComponentConfig_planKey_key" ON "PlanComponentConfig"("planKey");

-- Seed the 7 canonical plan-family keys, matching core.analytics_plan_gate's exact
-- seed set (core/migrations/prod/20260707062242_analytics_plan_gate.sql) — parent
-- plan as the source of truth, package variants already collapse onto these via
-- core's PlanFamily(). Package `pro_plan_pkg3` etc. resolve to these same keys.
--
-- PLACEHOLDER VALUES — maxComponents, allowedBlockTypes and the entry/mid/top
-- tiering below are illustrative only (entry tier's 15 mirrors the design mockup's
-- "0/15 components used"). These need real numbers from product before this ships;
-- do not treat this seed as final. Adjust with plain UPDATE statements against
-- "PlanComponentConfig" by "planKey" — no new migration needed for value tweaks.
--
-- Block-type tokens below are restricted to values that exist today in
-- packages/schemas/features/blocks/*/constants.ts. The provided design mockup shows
-- a "Document" bubble and "List message"/"Button message" input labels that don't
-- map to any current block-type token (closest existing equivalents are the TEXT
-- bubble and the CHOICE input) — flagged rather than guessed at; confirm the mapping
-- before relying on this seed for those specific rows.
INSERT INTO "PlanComponentConfig" ("id", "updatedAt", "planKey", "maxComponents", "allowedBlockTypes")
VALUES
    -- Entry tier: small cap, bubbles + basic inputs + basic logic only.
    -- Locked at this tier: FILE/PICTURE_CHOICE/PAYMENT/RATING inputs, EMBED bubble,
    -- REDIRECT/SCRIPT/TYPEBOT_LINK/GLOBAL_JUMP/AB_TEST/WEBHOOK/TRIGGER_WHATSAPP_FLOW
    -- logic, and every integration/forged block — matches the design mockup's
    -- Webhook/WhatsApp-flow locked example.
    ('plan_component_config_essential_plan', CURRENT_TIMESTAMP, 'ESSENTIAL_PLAN', 15,
     '["text","image","video","audio","text input","number input","email input","url input","date input","phone number input","choice input","Set variable","Condition","Wait","Assign Chat","Close Chat","Jump"]'::jsonb),
    ('plan_component_config_instant_plan', CURRENT_TIMESTAMP, 'INSTANT_PLAN', 15,
     '["text","image","video","audio","text input","number input","email input","url input","date input","phone number input","choice input","Set variable","Condition","Wait","Assign Chat","Close Chat","Jump"]'::jsonb),
    ('plan_component_config_starter_plan', CURRENT_TIMESTAMP, 'STARTER_PLAN', 15,
     '["text","image","video","audio","text input","number input","email input","url input","date input","phone number input","choice input","Set variable","Condition","Wait","Assign Chat","Close Chat","Jump"]'::jsonb),

    -- Mid tier: higher cap, every block type unlocked (simplified placeholder —
    -- excluding specific "top-tier-only" integrations is left for a future refinement
    -- once product decides which ones, rather than guessed at here).
    ('plan_component_config_growth_plan', CURRENT_TIMESTAMP, 'GROWTH_PLAN', 50, '["*"]'::jsonb),
    ('plan_component_config_team_plan', CURRENT_TIMESTAMP, 'TEAM_PLAN', 50, '["*"]'::jsonb),

    -- Top tier: unlimited count, every block type.
    ('plan_component_config_pro_plan', CURRENT_TIMESTAMP, 'PRO_PLAN', NULL, '["*"]'::jsonb),
    ('plan_component_config_unlimited_plan', CURRENT_TIMESTAMP, 'UNLIMITED_PLAN', NULL, '["*"]'::jsonb)
ON CONFLICT ("planKey") DO NOTHING;
