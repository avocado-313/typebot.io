import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Workspace, workspaceSchema } from '@typebot.io/schemas'
import { z } from 'zod'
import { parseWorkspaceDefaultPlan } from '../helpers/parseWorkspaceDefaultPlan'
import { trackEvents } from '@typebot.io/telemetry/trackEvents'

export const createWorkspace = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/workspaces',
      protect: true,
      summary: 'Create workspace',
      tags: ['Workspace'],
    },
  })
  .input(z.object({ icon: z.string().optional(), name: z.string() }))
  .output(
    z.object({
      workspace: workspaceSchema.omit({
        chatsLimitFirstEmailSentAt: true,
        chatsLimitSecondEmailSentAt: true,
        storageLimitFirstEmailSentAt: true,
        storageLimitSecondEmailSentAt: true,
        customChatsLimit: true,
        customSeatsLimit: true,
        customStorageLimit: true,
        additionalChatsIndex: true,
        additionalStorageIndex: true,
        isQuarantined: true,
      }),
    })
  )
  .mutation(async ({ input: { name, icon }, ctx: { user } }) => {
    const existingWorkspacesWithSameName = (await prisma.workspace.findMany({
      where: {
        name,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      select: { version: true },
    })) as Pick<Workspace, 'version'>[]

    const nextVersion =
      existingWorkspacesWithSameName.length === 0
        ? 1
        : Math.max(
          ...existingWorkspacesWithSameName.map(
            (workspace) => workspace.version ?? 1
          )
        ) + 1

    const plan = parseWorkspaceDefaultPlan(user.email ?? '')

    const newWorkspace = (await prisma.workspace.create({
      data: {
        name,
        version: nextVersion,
        icon,
        members: { create: [{ role: 'ADMIN', userId: user.id }] },
        plan,
      },
    })) as Workspace

    await trackEvents([
      {
        name: 'Workspace created',
        workspaceId: newWorkspace.id,
        userId: user.id,
        data: {
          name,
          plan,
        },
      },
    ])

    return {
      workspace: newWorkspace,
    }
  })
