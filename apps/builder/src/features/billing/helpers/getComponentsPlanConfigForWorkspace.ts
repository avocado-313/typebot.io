import prisma from '@typebot.io/lib/prisma'
import { getWorkspacePlanKey } from '@typebot.io/lib'
import { z } from 'zod'
import { ComponentsPlanConfig } from '@/features/typebot/helpers/componentsLimit'

// A plan with no PlanComponentConfig row (unmapped plan key, or the Hub couldn't be
// reached) falls back to unrestricted rather than throwing — used both by the
// getComponentsPlanConfig query (feeds the always-visible live counter) and by
// updateTypebot's save-time check. Breaking a user's ability to see/build is worse
// than a temporary under-restriction.
const UNRESTRICTED: Pick<
  ComponentsPlanConfig,
  'maxComponents' | 'allowedBlockTypes'
> = {
  maxComponents: null,
  allowedBlockTypes: ['*'],
}

const parseAllowedBlockTypes = (value: unknown, planKey: string): string[] => {
  const parsed = z.array(z.string()).safeParse(value)
  if (!parsed.success) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] malformed allowedBlockTypes for plan "${planKey}", falling back to unrestricted`
    )
    return UNRESTRICTED.allowedBlockTypes
  }
  return parsed.data
}

export const getComponentsPlanConfigForWorkspace = async (
  workspaceId: string
): Promise<ComponentsPlanConfig> => {
  const allPlanRows = await prisma.planComponentConfig.findMany()
  const allPlans = allPlanRows.map((row) => ({
    planKey: row.planKey,
    maxComponents: row.maxComponents,
    allowedBlockTypes: parseAllowedBlockTypes(
      row.allowedBlockTypes,
      row.planKey
    ),
  }))

  const { planKey: currentPlanKey } = await getWorkspacePlanKey(workspaceId)
  if (!currentPlanKey) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] could not resolve plan key for workspace ${workspaceId}, falling back to unrestricted`
    )
    return { currentPlanKey: null, ...UNRESTRICTED, allPlans }
  }

  const matchingConfig = allPlans.find(
    (plan) => plan.planKey === currentPlanKey
  )
  if (!matchingConfig) {
    console.warn(
      `[getComponentsPlanConfigForWorkspace] no PlanComponentConfig row for plan key "${currentPlanKey}", falling back to unrestricted`
    )
    return { currentPlanKey, ...UNRESTRICTED, allPlans }
  }

  return {
    currentPlanKey,
    maxComponents: matchingConfig.maxComponents,
    allowedBlockTypes: matchingConfig.allowedBlockTypes,
    allPlans,
  }
}
