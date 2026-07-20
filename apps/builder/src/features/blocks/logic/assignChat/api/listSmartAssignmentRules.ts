import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { fetchSmartAssignmentRules } from './helpers/fetchSmartAssignmentRules'

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
    // Verify the caller is a member of the workspace before exposing its rules.
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      include: { members: true },
    })
    if (!workspace || isReadWorkspaceFobidden(workspace, user))
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

    const rules = await fetchSmartAssignmentRules(workspaceId)
    return { rules }
  })
