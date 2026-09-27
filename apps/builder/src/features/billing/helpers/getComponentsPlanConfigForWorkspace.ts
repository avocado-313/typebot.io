import prisma from '@typebot.io/lib/prisma'
import { getWorkspacePlanKey, checkComponentsLimit } from '@typebot.io/lib'
import { ComponentsPlanConfig } from '@/features/typebot/helpers/componentsLimit'

// Every plan sees and can use every component now — only the live component COUNT
// (from checkComponentsLimit/Hub) is actually restricted per plan. The allowlist
// stays wired through (rather than deleted) so per-type restrictions can come back
// without another refactor if product changes its mind.
const ALL_BLOCK_TYPES_ALLOWED = ['*']

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
    allowedBlockTypes: ALL_BLOCK_TYPES_ALLOWED,
  }))

  return {
    currentPlanKey,
    maxComponents,
    allowedBlockTypes: ALL_BLOCK_TYPES_ALLOWED,
    allPlans,
  }
}
