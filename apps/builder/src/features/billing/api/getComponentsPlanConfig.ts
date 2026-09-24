import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import prisma from '@typebot.io/lib/prisma'
import { isReadWorkspaceFobidden } from '@typebot.io/db-rules/isReadWorkspaceFobidden'
import { TRPCError } from '@trpc/server'
import { getComponentsPlanConfigForWorkspace } from '../helpers/getComponentsPlanConfigForWorkspace'

const planComponentSummarySchema = z.object({
  planKey: z.string(),
  maxComponents: z.number().nullable(),
  allowedBlockTypes: z.array(z.string()),
})

export const getComponentsPlanConfig = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/billing/componentsPlanConfig',
      protect: true,
      summary: "Get the workspace's plan-based component limits",
      tags: ['Billing'],
    },
  })
  .input(z.object({ workspaceId: z.string() }))
  .output(
    z.object({
      currentPlanKey: z.string().nullable(),
      maxComponents: z.number().nullable(),
      allowedBlockTypes: z.array(z.string()),
      allPlans: z.array(planComponentSummarySchema),
    })
  )
  .query(async ({ input: { workspaceId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      select: { id: true, members: { select: { userId: true } } },
    })
    if (!workspace || isReadWorkspaceFobidden(workspace, user))
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

    return getComponentsPlanConfigForWorkspace(workspace.id)
  })
