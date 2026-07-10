import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isWriteTypebotForbidden } from '../helpers/isWriteTypebotForbidden'
import { setAuditActorOnTx } from './helpers/botAudit'
import { getBackupWorkspaceId } from './helpers/getBackupWorkspaceId'

export const restoreTypebot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'PATCH',
      path: '/v1/typebots/{typebotId}/restore',
      protect: true,
      summary: 'Restore an archived typebot',
      tags: ['Typebot'],
    },
  })
  .input(
    z.object({
      typebotId: z.string(),
    })
  )
  .output(
    z.object({
      message: z.literal('success'),
    })
  )
  .mutation(
    async ({
      input: { typebotId },
      ctx: { user, authType, tokenId, ip, userAgent },
    }) => {
      const existingTypebot = await prisma.typebot.findFirst({
        where: {
          id: typebotId,
        },
        select: {
          id: true,
          workspaceId: true,
          isArchived: true,
          workspace: {
            select: {
              isSuspended: true,
              isPastDue: true,
              members: {
                select: {
                  userId: true,
                  role: true,
                },
              },
            },
          },
          collaborators: {
            select: {
              userId: true,
              type: true,
            },
          },
        },
      })
      if (
        !existingTypebot?.id ||
        (await isWriteTypebotForbidden(existingTypebot, user))
      )
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Typebot not found' })

      if (!existingTypebot.isArchived)
        return {
          message: 'success' as const,
        }

      // Same 5-bot limit as createTypebot.ts — restoring re-adds a visible bot. The backup
      // workspace is exempt so it can hold many restored copies.
      const backupWorkspaceId = await getBackupWorkspaceId()
      if (existingTypebot.workspaceId !== backupWorkspaceId) {
        const existingTypebotCount = await prisma.typebot.count({
          where: {
            workspaceId: existingTypebot.workspaceId,
            isArchived: { not: true },
          },
        })
        if (existingTypebotCount >= 5)
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Maximum limit of 5 typebots reached for this workspace',
          })
      }

      // Interactive transaction so the SET LOCAL GUCs reach the archive trigger, which
      // records the attributed UNARCHIVE row. publicId/customDomain are intentionally NOT
      // restored (they were nulled on archive; reusing them risks a unique-constraint clash).
      await prisma.$transaction(async (tx) => {
        await setAuditActorOnTx(tx, {
          source:
            authType === 'api_token'
              ? 'rest.PATCH /v1/typebots/{typebotId}/restore'
              : 'trpc.restoreTypebot',
          actor: { authType, userId: user.id, tokenId, ip, userAgent },
        })
        await tx.typebot.updateMany({
          where: { id: typebotId },
          data: { isArchived: false },
        })
      })

      return {
        message: 'success' as const,
      }
    }
  )
