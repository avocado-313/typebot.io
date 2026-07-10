import prisma from '@typebot.io/lib/prisma'
import { adminProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { typebotSchema } from '@typebot.io/schemas'
import { migrateTypebot } from '@typebot.io/migrations/migrateTypebot'
import { BotAuditAction } from '@typebot.io/prisma'
import { parseWorkspaceDefaultPlan } from '@/features/workspace/helpers/parseWorkspaceDefaultPlan'
import { duplicateTypebotIntoWorkspace } from './helpers/duplicateTypebotIntoWorkspace'
import { publishDuplicatedTypebot } from './helpers/publishDuplicatedTypebot'
import { hubLinkChannel } from './helpers/hubLinkChannel'
import { logBotAudit } from './helpers/botAudit'
import { createId } from '@paralleldrive/cuid2'
import { generateId } from '@typebot.io/lib'
import { trackEvents } from '@typebot.io/telemetry/trackEvents'

/**
 * Admin-only: duplicate a bot into a business's Typebot workspace (or a newly created one),
 * auto-publish it, and point the business's Hub channel (hub.typebot_channel) at the new bot
 * so the flow is actually served. Authoritatively gated by adminProcedure.
 */
export const linkBotToBusiness = adminProcedure
  .input(
    z
      .object({
        sourceTypebotId: z.string(),
        businessId: z.string().min(1),
        targetWorkspaceId: z.string().optional(),
        newWorkspaceName: z.string().min(1).optional(),
        newName: z.string().min(1).optional(),
        // Optional: email of the user who should be the primary member when creating a new workspace
        memberEmail: z.string().email().optional(),
      })
      .refine(
        (data) => !!data.targetWorkspaceId !== !!data.newWorkspaceName,
        'Provide exactly one of targetWorkspaceId or newWorkspaceName'
      )
  )
  .output(
    z.object({
      typebot: z.object({
        id: z.string(),
        name: z.string(),
        publicId: z.string().nullable(),
      }),
      workspaceId: z.string(),
      workspaceCreated: z.boolean(),
      businessId: z.string(),
      published: z.boolean(),
      hubLinked: z.boolean(),
      hubError: z.string().optional(),
      auditLogId: z.string(),
    })
  )
  .mutation(
    async ({
      input: {
        sourceTypebotId,
        businessId,
        targetWorkspaceId,
        newWorkspaceName,
        newName,
        memberEmail,
      },
      ctx: { user, authType, tokenId, ip, userAgent },
    }) => {
      const sourceRow = await prisma.typebot.findFirst({
        where: { id: sourceTypebotId },
      })
      if (!sourceRow?.id)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Typebot not found' })

      let migratedTypebot
      try {
        migratedTypebot = await migrateTypebot(typebotSchema.parse(sourceRow))
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse source typebot',
          cause: err,
        })
      }

      // Resolve the target workspace: use the provided one, or create a fresh workspace
      // owned by the admin.
      let workspaceId: string
      let workspaceCreated = false
      if (targetWorkspaceId) {
        const workspace = await prisma.workspace.findUnique({
          where: { id: targetWorkspaceId },
          select: { id: true, businessId: true },
        })
        if (!workspace)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Target workspace not found',
          })
        workspaceId = workspace.id
        // Associate the workspace with this business if it isn't already, so future bots
        // created here inherit it. Don't clobber an existing (possibly different) business.
        if (!workspace.businessId) {
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
        }
      } else {
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

        // Build members array: admin user + optional member
        const members: { role: 'ADMIN'; userId: string }[] = [
          { role: 'ADMIN', userId: user.id },
        ]

        // Add memberEmail user if provided and different from admin user
        if (memberUserId && memberUserId !== user.id) {
          members.push({ role: 'ADMIN', userId: memberUserId })
        }

        const created = await prisma.workspace.create({
          data: {
            name: newWorkspaceName as string,
            plan: parseWorkspaceDefaultPlan(memberEmail || user.email || ''),
            members: { create: members },
            businessId,
          },
          select: { id: true },
        })
        workspaceId = created.id
        workspaceCreated = true
      }

      const actor = { authType, userId: user.id, tokenId, ip, userAgent }

      const parsedNewTypebot = await duplicateTypebotIntoWorkspace({
        migratedTypebot,
        targetWorkspaceId: workspaceId,
        actor,
        name: newName,
        businessId,
        // auditAction omitted so the helper does not log; we log LINK below to capture the id.
      })

      // Auto-publish so the Hub can serve the bot (it routes chats via public_id).
      const publicId = await publishDuplicatedTypebot(parsedNewTypebot)
      console.log(
        `linkBotToBusiness: published bot ${parsedNewTypebot.id} with publicId "${publicId}" for business ${businessId}`
      )

      // Point the business's Hub channel at the new bot.
      const hub = await hubLinkChannel({
        businessId,
        botId: parsedNewTypebot.id,
        workspaceId,
        publicId,
        botName: parsedNewTypebot.name,
      })

      const auditLog = await logBotAudit({
        botId: parsedNewTypebot.id,
        workspaceId,
        action: BotAuditAction.LINK,
        actor,
        source: 'trpc.linkBotToBusiness',
        metadata: {
          sourceBotId: sourceTypebotId,
          businessId,
          workspaceCreated,
          published: true,
          hubLinked: hub.ok,
          ...(hub.error ? { hubError: hub.error } : {}),
        },
      })

      return {
        typebot: {
          id: parsedNewTypebot.id,
          name: parsedNewTypebot.name,
          publicId,
        },
        workspaceId,
        workspaceCreated,
        businessId,
        published: true,
        hubLinked: hub.ok,
        hubError: hub.error,
        auditLogId: auditLog?.id ?? '',
      }
    }
  )
