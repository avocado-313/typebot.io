import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Workspace, workspaceSchema } from '@typebot.io/schemas'
import { z } from 'zod'
import { parseWorkspaceDefaultPlan } from '../helpers/parseWorkspaceDefaultPlan'
import { trackEvents } from '@typebot.io/telemetry/trackEvents'
import { createId } from '@paralleldrive/cuid2'
import { generateId } from '@typebot.io/lib'

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
  .input(
    z.object({
      icon: z.string().optional(),
      name: z.string(),
      // Required: the Hub business this workspace belongs to. Bots created in it inherit it.
      businessId: z.string().min(1),
      // Optional: email of the user who should be the primary member of this workspace
      memberEmail: z.string().email().optional(),
    })
  )
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
  .mutation(
    async ({
      input: { name, icon, businessId, memberEmail },
      ctx: { user },
    }) => {
      // Check if this businessId is already associated with another workspace
      const existingWorkspaceWithBusiness = await prisma.workspace.findFirst({
        where: { businessId },
        select: { id: true },
      })

      if (existingWorkspaceWithBusiness) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This business is already associated with another workspace',
        })
      }

      // If memberEmail is provided, find or create the user
      let memberUserId: string | undefined
      if (memberEmail) {
        let memberUser = await prisma.user.findUnique({
          where: { email: memberEmail },
          select: { id: true },
        })

        // Create user if they don't exist
        if (!memberUser) {
          memberUser = await prisma.user.create({
            data: {
              id: createId(),
              email: memberEmail,
              apiTokens: {
                create: { name: 'Default', token: generateId(24) },
              },
              onboardingCategories: [],
            },
            select: { id: true },
          })

          await trackEvents([
            {
              name: 'User created',
              userId: memberUser.id,
              data: {
                email: memberEmail,
              },
            },
          ])
        }

        memberUserId = memberUser.id
      }

      const existingWorkspaceNames = (await prisma.workspace.findMany({
        where: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
        select: { name: true },
      })) as Pick<Workspace, 'name'>[]

      if (existingWorkspaceNames.some((workspace) => workspace.name === name))
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workspace with same name already exists',
        })

      const plan = parseWorkspaceDefaultPlan(memberEmail || user.email || '')

      // Build members array: authenticated user + optional member
      const members: { role: 'ADMIN'; userId: string }[] = [
        { role: 'ADMIN', userId: user.id },
      ]

      // Add memberEmail user if provided and different from authenticated user
      if (memberUserId && memberUserId !== user.id) {
        members.push({ role: 'ADMIN', userId: memberUserId })
      }

      const newWorkspace = (await prisma.workspace.create({
        data: {
          name,
          icon,
          members: { create: members },
          plan,
          businessId,
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
    }
  )
