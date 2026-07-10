import prisma from '@typebot.io/lib/prisma'
import { adminProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'

/**
 * Admin-only listing of archived (soft-deleted) bots, powering the "Archived bots" recovery
 * page. The normal listTypebots endpoint filters archived bots out; this is the opposite
 * view. Ordered by updatedAt desc (≈ archive time) so recently-deleted bots surface first.
 */
export const listArchivedTypebots = adminProcedure
  .input(
    z.object({
      workspaceId: z.string().optional(),
    })
  )
  .output(
    z.object({
      typebots: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          icon: z.string().nullable(),
          workspaceId: z.string(),
          workspaceName: z.string(),
          archivedAt: z.date(),
          createdAt: z.date(),
        })
      ),
    })
  )
  .query(async ({ input: { workspaceId } }) => {
    const typebots = await prisma.typebot.findMany({
      where: {
        isArchived: true,
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        icon: true,
        workspaceId: true,
        updatedAt: true,
        createdAt: true,
        workspace: { select: { name: true } },
      },
    })

    return {
      typebots: typebots.map((typebot) => ({
        id: typebot.id,
        name: typebot.name,
        icon: typebot.icon ?? null,
        workspaceId: typebot.workspaceId,
        workspaceName: typebot.workspace?.name ?? '',
        archivedAt: typebot.updatedAt,
        createdAt: typebot.createdAt,
      })),
    }
  })
