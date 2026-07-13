import prisma from '@typebot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { BotAuditAction, WorkspaceRole } from '@typebot.io/prisma'
import {
  Typebot,
  TypebotV6,
  resultsTablePreferencesSchema,
  typebotV5Schema,
  typebotV6Schema,
} from '@typebot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import { preprocessTypebot } from '@typebot.io/schemas/features/typebot/helpers/preprocessTypebot'
import { migrateTypebot } from '@typebot.io/migrations/migrateTypebot'
import { duplicateTypebotIntoWorkspace } from './helpers/duplicateTypebotIntoWorkspace'

const omittedProps = {
  id: true,
  whatsAppCredentialsId: true,
  riskLevel: true,
  isClosed: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  customDomain: true,
  workspaceId: true,
  resultsTablePreferencesSchema: true,
  selectedThemeTemplateId: true,
  publicId: true,
} as const

const importingTypebotSchema = z.preprocess(
  preprocessTypebot,
  z.discriminatedUnion('version', [
    typebotV6Schema
      .omit(omittedProps)
      .extend({
        resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
        selectedThemeTemplateId: z.string().nullish(),
      })
      .openapi({
        title: 'Typebot V6',
      }),
    typebotV5Schema._def.schema
      .omit(omittedProps)
      .extend({
        resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
        selectedThemeTemplateId: z.string().nullish(),
      })
      .openapi({
        title: 'Typebot V5',
      }),
  ])
)

type ImportingTypebot = z.infer<typeof importingTypebotSchema>

const migrateImportingTypebot = (
  typebot: ImportingTypebot
): Promise<TypebotV6> => {
  const fullTypebot = {
    ...typebot,
    id: 'dummy id',
    workspaceId: 'dummy workspace id',
    resultsTablePreferences: typebot.resultsTablePreferences ?? null,
    selectedThemeTemplateId: typebot.selectedThemeTemplateId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customDomain: null,
    isClosed: false,
    isArchived: false,
    whatsAppCredentialsId: null,
    publicId: null,
    riskLevel: null,
  } satisfies Typebot
  return migrateTypebot(fullTypebot)
}

export const importTypebot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/typebots/import',
      protect: true,
      summary: 'Import a typebot',
      tags: ['Typebot'],
    },
  })
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          '[Where to find my workspace ID?](../how-to#how-to-find-my-workspaceid)'
        ),
      typebot: importingTypebotSchema,
    })
  )
  .output(
    z.object({
      typebot: typebotV6Schema,
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { typebot, workspaceId } = input
    const { user, authType, tokenId, ip, userAgent } = ctx
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, members: true },
    })
    const userRole = getUserRoleInWorkspace(
      user.id,
      workspace?.members,
      undefined // Skip email check for import API to avoid type issues
    )
    if (
      userRole === undefined ||
      userRole === WorkspaceRole.GUEST ||
      !workspace
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Workspace not found',
      })

    const migratedTypebot = await migrateImportingTypebot(typebot)

    // Enforces the 5-bot and group limits and runs the sanitize/create pipeline.
    const parsedNewTypebot = await duplicateTypebotIntoWorkspace({
      migratedTypebot,
      targetWorkspaceId: workspaceId,
      actor: { authType, userId: user.id, tokenId, ip, userAgent },
      auditAction: BotAuditAction.DUPLICATE,
    })

    return { typebot: parsedNewTypebot }
  })
