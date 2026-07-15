import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Typebot } from '@typebot.io/schemas'
import { z } from 'zod'
import { isWriteTypebotForbidden } from '../helpers/isWriteTypebotForbidden'
import { archiveResults } from '@typebot.io/results/archiveResults'
import { setAuditActorOnTx } from './helpers/botAudit'
import { hubUnlinkChannel } from './helpers/hubUnlinkChannel'
import { snapshotTypebotToBackup } from './helpers/snapshotTypebotToBackup'

export const deleteTypebot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/typebots/{typebotId}',
      protect: true,
      summary: 'Delete a typebot',
      tags: ['Typebot'],
    },
  })
  .input(
    z.object({
      typebotId: z
        .string()
        .describe(
          "[Where to find my bot's ID?](../how-to#how-to-find-my-typebotid)"
        ),
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
          groups: true,
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
        (await isWriteTypebotForbidden(existingTypebot, user, {
          allowSuperAdmin: true,
        }))
      )
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Typebot not found' })

      const { success } = await archiveResults(prisma)({
        typebot: {
          groups: existingTypebot.groups,
        } as Pick<Typebot, 'groups'>,
        resultsFilter: { typebotId },
      })
      if (!success)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to archive results',
        })

      // Snapshot the live bot into the backup workspace BEFORE archiving so the deletion
      // stays recoverable. Best-effort — never blocks the delete.
      await snapshotTypebotToBackup(typebotId)

      // Interactive transaction so the SET LOCAL GUCs reach the archive trigger on the
      // same connection: the `typebot_archive_audit` trigger reads them and writes the
      // attributed ARCHIVE row into BotAuditLog.
      await prisma.$transaction(async (tx) => {
        await setAuditActorOnTx(tx, {
          source:
            authType === 'api_token'
              ? 'rest.DELETE /v1/typebots/{typebotId}'
              : 'trpc.deleteTypebot',
          actor: { authType, userId: user.id, tokenId, ip, userAgent },
        })
        await tx.publicTypebot.deleteMany({
          where: { typebotId },
        })
        await tx.typebot.updateMany({
          where: { id: typebotId },
          data: { isArchived: true, publicId: null, customDomain: null },
        })
      })

      // Keep the Hub in sync: clear this (now-deleted) bot's pointers from any channel
      // referencing it (the workspace link is kept). Best-effort — never fails the delete.
      const unlink = await hubUnlinkChannel({ botId: typebotId })
      if (!unlink.ok)
        console.error(
          `deleteTypebot: Hub unlink failed for ${typebotId}: ${unlink.error}`
        )

      return {
        message: 'success',
      }
    }
  )
