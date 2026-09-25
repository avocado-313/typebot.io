import { BlockV6 } from '@typebot.io/schemas'

export type PlanComponentSummary = {
  planKey: string
  maxComponents: number | null
  allowedBlockTypes: string[]
}

export type ComponentsPlanConfig = {
  currentPlanKey: string | null
  maxComponents: number | null
  allowedBlockTypes: string[]
  allPlans: PlanComponentSummary[]
}

// Structural rather than TypebotV6-typed on purpose: also used to count a loosely
// -typed "previous saved state" view in updateTypebot.ts's grandfathering diff, which
// doesn't carry the full discriminated Block union.
export const countComponents = (typebot: {
  groups: { blocks: unknown[] }[]
}): number =>
  typebot.groups.reduce((total, group) => total + group.blocks.length, 0)

// type is a plain string (not BlockV6['type']) so this also works against the
// loosely-typed "previous saved state" diff in updateTypebot.ts, which doesn't carry
// the full discriminated Block union.
export const isBlockTypeAllowed = (
  type: string,
  allowedBlockTypes: string[]
): boolean =>
  allowedBlockTypes.includes('*') || allowedBlockTypes.includes(type)

export const isComponentLimitReached = (
  currentCount: number,
  maxComponents: number | null
): boolean => maxComponents !== null && currentCount >= maxComponents

// Tiering isn't stored on PlanComponentConfig (only planKey/maxComponents/
// allowedBlockTypes) — this is presentation-only, used to name "which plan unlocks
// this" in the locked-block tooltip. PLACEHOLDER ordering pending product
// confirmation, same as the seeded values themselves.
export const PLAN_TIER_ORDER = [
  'ESSENTIAL_PLAN',
  'INSTANT_PLAN',
  'STARTER_PLAN',
  'TEAM_PLAN',
  'GROWTH_PLAN',
  'PRO_PLAN',
  'UNLIMITED_PLAN',
]

// The cheapest plan (by PLAN_TIER_ORDER) whose allowlist includes this block type,
// for the locked-block tooltip's "available on the {plan} plan" copy. Falls back to
// undefined if no known plan config unlocks it (shouldn't happen for a real block
// type once the seed is complete, but the caller must handle it gracefully).
export const findUnlockingPlan = (
  type: BlockV6['type'],
  allPlans: PlanComponentSummary[]
): PlanComponentSummary | undefined => {
  const byTier = [...allPlans].sort(
    (a, b) =>
      PLAN_TIER_ORDER.indexOf(a.planKey) - PLAN_TIER_ORDER.indexOf(b.planKey)
  )
  return byTier.find((plan) => isBlockTypeAllowed(type, plan.allowedBlockTypes))
}
