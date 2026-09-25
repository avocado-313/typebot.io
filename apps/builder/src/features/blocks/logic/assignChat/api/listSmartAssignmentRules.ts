import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { fetchSmartAssignmentRules } from './helpers/fetchFromHub'
import { assertWorkspaceReadable } from './helpers/assertWorkspaceReadable'

const smartAssignmentRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  group_type: z.string(),
  status: z.string(),
})

export const listSmartAssignmentRules = authenticatedProcedure
  .input(z.object({ workspaceId: z.string() }))
  .output(z.object({ rules: z.array(smartAssignmentRuleSchema) }))
  .query(async ({ input: { workspaceId }, ctx: { user } }) => {
    await assertWorkspaceReadable(workspaceId, user)
    const rules = await fetchSmartAssignmentRules(workspaceId)
    return { rules }
  })
