import prisma from '@typebot.io/lib/prisma'
import { getWorkspacePlanKey, checkComponentsLimit } from '@typebot.io/lib'
import { z } from 'zod'
import { ComponentsPlanConfig } from '@/features/typebot/helpers/componentsLimit'

// A plan with no PlanComponentConfig row (unmapped plan key) falls back to an
// unrestricted allowlist rather than throwing — used both by the
// getComponentsPlanConfig query (feeds the always-visible live counter) and by
// updateTypebot's save-time check. Breaking a user's ability to see/build is worse
// than a temporary under-restriction. The count limit itself never falls back here:
// it always comes from checkComponentsLimit (Hub), which already fails open to
// `null` (unlimited) on its own.
const UNRESTRICTED_ALLOWED_BLOCK_TYPES = ['*']

const parseAllowedBlockTypes = (value: unknown, planKey: string): string[] => {
  const parsed = z.array(z.string()).safeParse(value)
  if (!parsed.success) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] malformed allowedBlockTypes for plan "${planKey}", falling back to unrestricted`
    )
    return UNRESTRICTED_ALLOWED_BLOCK_TYPES
  }
  return parsed.data
}

export const getComponentsPlanConfigForWorkspace = async (
  workspaceId: string
): Promise<ComponentsPlanConfig> => {
  const [allPlanRows, { planKey: currentPlanKey }, { maxComponents }] =
    await Promise.all([
      prisma.planComponentConfig.findMany(),
      getWorkspacePlanKey(workspaceId),
      checkComponentsLimit(workspaceId),
    ])
  const allPlans = allPlanRows.map((row) => ({
    planKey: row.planKey,
    maxComponents: row.maxComponents,
    allowedBlockTypes: parseAllowedBlockTypes(
      row.allowedBlockTypes,
      row.planKey
    ),
  }))

  if (!currentPlanKey) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] could not resolve plan key for workspace ${workspaceId}, falling back to unrestricted allowlist`
    )
    return {
      currentPlanKey: null,
      maxComponents,
      allowedBlockTypes: UNRESTRICTED_ALLOWED_BLOCK_TYPES,
      allPlans,
    }
  }

  const matchingConfig = allPlans.find(
    (plan) => plan.planKey === currentPlanKey
  )
  if (!matchingConfig) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] no PlanComponentConfig row for plan key "${currentPlanKey}", falling back to unrestricted allowlist`
    )
    return {
      currentPlanKey,
      maxComponents,
      allowedBlockTypes: UNRESTRICTED_ALLOWED_BLOCK_TYPES,
      allPlans,
    }
  }

  return {
    currentPlanKey,
    maxComponents,
    allowedBlockTypes: matchingConfig.allowedBlockTypes,
    allPlans,
  }
}
