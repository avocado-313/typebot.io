import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isAdminWriteWorkspaceForbidden } from '../helpers/isAdminWriteWorkspaceForbidden'

/**
 * Associates a workspace with a Hub business, but only when it isn't already associated.
 * Idempotent and non-clobbering: if the workspace already has a businessId it's returned
 * unchanged. Used by the Hub chatbot/setup flow to backfill "old" workspaces created before
 * businessId existed — when a business re-enters the builder, Hub pushes its businessId here.
 */
export const setWorkspaceBusinessId = authenticatedProcedure
  .meta({
    openapi: {
      method: 'PATCH',
      path: '/v1/workspaces/{workspaceId}/business',
      protect: true,
      summary: 'Associate a workspace with a business (only if not already set)',
      tags: ['Workspace'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      businessId: z.string().min(1),
    })
  )
  .output(
    z.object({
      businessId: z.string().nullable(),
    })
  )
  .mutation(async ({ input: { workspaceId, businessId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      select: { id: true, businessId: true, members: true },
    })

    if (!workspace || isAdminWriteWorkspaceForbidden(workspace, user))
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No workspaces found' })

    // Already associated — never overwrite an existing (possibly different) business.
    if (workspace.businessId) return { businessId: workspace.businessId }

    // Check if another workspace already has this businessId
    const existingWorkspaceWithBusiness = await prisma.workspace.findFirst({
      where: { businessId, id: { not: workspace.id } },
      select: { id: true },
    })
    
    if (existingWorkspaceWithBusiness) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This business is already associated with another workspace',
      })
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { businessId },
    })

    return { businessId }
  })
