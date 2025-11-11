import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import {
  edgeSchema,
  settingsSchema,
  themeSchema,
  variableSchema,
  parseGroups,
  startEventSchema,
} from '@typebot.io/schemas'
import { z } from 'zod'
import { isWriteTypebotForbidden } from '../helpers/isWriteTypebotForbidden'
import { Plan } from '@typebot.io/prisma'
import { InputBlockType } from '@typebot.io/schemas/features/blocks/inputs/constants'
import { computeRiskLevel } from '@typebot.io/radar'
import { env } from '@typebot.io/env'
import { trackEvents } from '@typebot.io/telemetry/trackEvents'
import { parseTypebotPublishEvents } from '@/features/telemetry/helpers/parseTypebotPublishEvents'

export const publishTypebot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/typebots/{typebotId}/publish',
      protect: true,
      summary: 'Publish a typebot',
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
  .mutation(async ({ input: { typebotId }, ctx: { user } }) => {
    console.log('🚀 [PUBLISH START] TypebotId:', typebotId, 'UserId:', user.id)

    const existingTypebot = await prisma.typebot.findFirst({
      where: {
        id: typebotId,
      },
      include: {
        collaborators: true,
        publishedTypebot: true,
        workspace: {
          select: {
            plan: true,
            isVerified: true,
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
      },
    })

    console.log('📊 [TYPEBOT FOUND]', {
      exists: !!existingTypebot,
      id: existingTypebot?.id,
      name: existingTypebot?.name,
      hasPublishedVersion: !!existingTypebot?.publishedTypebot,
      riskLevel: existingTypebot?.riskLevel,
      workspacePlan: existingTypebot?.workspace.plan,
      workspaceVerified: existingTypebot?.workspace.isVerified,
      workspaceSuspended: existingTypebot?.workspace.isSuspended,
      workspacePastDue: existingTypebot?.workspace.isPastDue,
    })

    const isWriteForbidden = existingTypebot
      ? await isWriteTypebotForbidden(existingTypebot, user)
      : false
    console.log('🔒 [PERMISSION CHECK]', {
      isWriteForbidden,
      userId: user.id,
    })

    if (!existingTypebot?.id || isWriteForbidden) {
      console.error('❌ [BLOCKED] Typebot not found or write forbidden')
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Typebot not found' })
    }

    const hasFileUploadBlocks = parseGroups(existingTypebot.groups, {
      typebotVersion: existingTypebot.version,
    }).some((group) =>
      group.blocks.some((block) => block.type === InputBlockType.FILE)
    )

    console.log('📁 [FILE UPLOAD CHECK]', {
      hasFileUploadBlocks,
      workspacePlan: existingTypebot.workspace.plan,
      isFreePlan: existingTypebot.workspace.plan === Plan.FREE,
    })

    if (hasFileUploadBlocks && existingTypebot.workspace.plan === Plan.FREE) {
      console.error('❌ [BLOCKED] File upload blocks on FREE plan')
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "File upload blocks can't be published on the free plan",
      })
    }

    const typebotWasVerified =
      existingTypebot.riskLevel === -1 || existingTypebot.workspace.isVerified

    console.log('🔍 [VERIFICATION CHECK]', {
      typebotWasVerified,
      riskLevelIsNegativeOne: existingTypebot.riskLevel === -1,
      workspaceIsVerified: existingTypebot.workspace.isVerified,
      currentRiskLevel: existingTypebot.riskLevel,
    })

    if (
      !typebotWasVerified &&
      existingTypebot.riskLevel &&
      existingTypebot.riskLevel > 80
    ) {
      console.error('❌ [BLOCKED] Risk level too high (pre-check)', {
        riskLevel: existingTypebot.riskLevel,
        threshold: 80,
      })
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          'Radar detected a potential malicious typebot. This bot is being manually reviewed by Fraud Prevention team.',
      })
    }

    console.log('🎯 [COMPUTING RISK LEVEL]', {
      typebotWasVerified,
      willComputeRisk: !typebotWasVerified,
    })

    const riskLevel = typebotWasVerified
      ? 0
      : computeRiskLevel(existingTypebot, {
          debug: env.NODE_ENV === 'development',
        })

    console.log('📈 [RISK LEVEL COMPUTED]', {
      newRiskLevel: riskLevel,
      oldRiskLevel: existingTypebot.riskLevel,
      changed: riskLevel !== existingTypebot.riskLevel,
      willUpdate: riskLevel > 0 && riskLevel !== existingTypebot.riskLevel,
    })

    if (riskLevel > 0 && riskLevel !== existingTypebot.riskLevel) {
      console.log('⚠️ [RISK LEVEL CHANGED]', {
        from: existingTypebot.riskLevel,
        to: riskLevel,
        willSendWebhook:
          env.MESSAGE_WEBHOOK_URL && riskLevel !== 100 && riskLevel > 60,
        willBlock: riskLevel > 80,
      })

      if (env.MESSAGE_WEBHOOK_URL && riskLevel !== 100 && riskLevel > 60) {
        console.log('📤 [SENDING WEBHOOK] Suspicious typebot notification')
        await fetch(env.MESSAGE_WEBHOOK_URL, {
          method: 'POST',
          body: `⚠️ Suspicious typebot to be reviewed: ${existingTypebot.name} (${env.NEXTAUTH_URL}/typebots/${existingTypebot.id}/edit) (workspace: ${existingTypebot.workspaceId})`,
        }).catch((err) => {
          console.error('❌ [WEBHOOK FAILED]', err)
        })
      }

      console.log('💾 [UPDATING RISK LEVEL IN DB]')
      await prisma.typebot.updateMany({
        where: {
          id: existingTypebot.id,
        },
        data: {
          riskLevel,
        },
      })
      console.log('✅ [RISK LEVEL UPDATED]')

      if (riskLevel > 80) {
        console.error('❌ [BLOCKED] Risk level too high (post-compute)', {
          riskLevel,
          threshold: 80,
          hasPublishedVersion: !!existingTypebot.publishedTypebot,
        })

        if (existingTypebot.publishedTypebot) {
          console.log('🗑️ [DELETING PUBLISHED VERSION]')
          await prisma.publicTypebot.deleteMany({
            where: {
              id: existingTypebot.publishedTypebot.id,
            },
          })
          console.log('✅ [PUBLISHED VERSION DELETED]')
        }

        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Radar detected a potential malicious typebot. This bot is being manually reviewed by Fraud Prevention team.',
        })
      }
    }

    console.log('📊 [PARSING PUBLISH EVENTS]')
    const publishEvents = await parseTypebotPublishEvents({
      existingTypebot,
      userId: user.id,
      hasFileUploadBlocks,
    })
    console.log('✅ [PUBLISH EVENTS PARSED]', {
      eventCount: publishEvents.length,
    })

    try {
      if (existingTypebot.publishedTypebot) {
        console.log('🔄 [UPDATING EXISTING PUBLISHED TYPEBOT]', {
          publicTypebotId: existingTypebot.publishedTypebot.id,
        })

        await prisma.publicTypebot.updateMany({
          where: {
            id: existingTypebot.publishedTypebot.id,
          },
          data: {
            version: existingTypebot.version,
            edges: z.array(edgeSchema).parse(existingTypebot.edges),
            groups: parseGroups(existingTypebot.groups, {
              typebotVersion: existingTypebot.version,
            }),
            events:
              (existingTypebot.version === '6'
                ? z.tuple([startEventSchema])
                : z.null()
              ).parse(existingTypebot.events) ?? undefined,
            settings: settingsSchema.parse(existingTypebot.settings),
            variables: z.array(variableSchema).parse(existingTypebot.variables),
            theme: themeSchema.parse(existingTypebot.theme),
          },
        })
        console.log('✅ [PUBLISHED TYPEBOT UPDATED]')
      } else {
        console.log('➕ [CREATING NEW PUBLISHED TYPEBOT]')

        const createdPublicTypebot = await prisma.publicTypebot.create({
          data: {
            version: existingTypebot.version,
            typebotId: existingTypebot.id,
            edges: z.array(edgeSchema).parse(existingTypebot.edges),
            groups: parseGroups(existingTypebot.groups, {
              typebotVersion: existingTypebot.version,
            }),
            events:
              (existingTypebot.version === '6'
                ? z.tuple([startEventSchema])
                : z.null()
              ).parse(existingTypebot.events) ?? undefined,
            settings: settingsSchema.parse(existingTypebot.settings),
            variables: z.array(variableSchema).parse(existingTypebot.variables),
            theme: themeSchema.parse(existingTypebot.theme),
          },
        })

        console.log('✅ [PUBLISHED TYPEBOT CREATED]', {
          publicTypebotId: createdPublicTypebot?.id,
        })

        if (!createdPublicTypebot?.id) {
          console.error('❌ [FAILED] No ID generated for public typebot')
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create public typebot - no ID generated',
          })
        }
      }
    } catch (error) {
      console.error(
        '❌ [PUBLISH FAILED] Error during typebot publication:',
        error
      )
      throw error
    }

    console.log('📡 [TRACKING EVENTS]')
    await trackEvents([
      ...publishEvents,
      {
        name: 'Typebot published',
        workspaceId: existingTypebot.workspaceId,
        typebotId: existingTypebot.id,
        userId: user.id,
        data: {
          name: existingTypebot.name,
          isFirstPublish: existingTypebot.publishedTypebot ? undefined : true,
        },
      },
    ])
    console.log('✅ [EVENTS TRACKED]')

    console.log('🎉 [PUBLISH SUCCESS] Typebot published successfully')
    return { message: 'success' }
  })
