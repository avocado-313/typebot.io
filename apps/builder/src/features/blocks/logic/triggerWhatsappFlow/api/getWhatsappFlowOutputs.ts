import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { fetchWhatsappFlowOutputs } from './helpers/fetchWhatsappFlowVariables'

const whatsappFlowOutputSchema = z.object({
  name: z.string(),
  type: z.string(),
  screen: z.string().optional(),
})

export const getWhatsappFlowOutputs = authenticatedProcedure
  .input(z.object({ workspaceId: z.string(), flowId: z.string() }))
  .output(z.object({ fields: z.array(whatsappFlowOutputSchema) }))
  .query(async ({ input: { workspaceId, flowId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      include: { members: true },
    })
    if (!workspace || isReadWorkspaceFobidden(workspace, user))
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

    const fields = await fetchWhatsappFlowOutputs(workspaceId, flowId)
    return { fields }
  })
