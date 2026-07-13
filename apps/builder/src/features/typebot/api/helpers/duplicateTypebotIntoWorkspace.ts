import prisma from '@typebot.io/lib/prisma'
import { BotAuditAction, Plan } from '@typebot.io/prisma'
import { TypebotV6, typebotV6Schema } from '@typebot.io/schemas'
import { TRPCError } from '@trpc/server'
import { getBackupWorkspaceId } from './getBackupWorkspaceId'
import { checkGroupLimits } from '@typebot.io/lib'
import { trackEvents } from '@typebot.io/telemetry/trackEvents'
import {
  sanitizeFolderId,
  sanitizeGroups,
  sanitizeSettings,
  sanitizeVariables,
} from '../../helpers/sanitizers'
import { logBotAudit, type AuditActor } from './botAudit'
import { snapshotTypebotToBackup } from './snapshotTypebotToBackup'

/**
 * Creates a copy of an already-migrated typebot into a target workspace, running the same
 * sanitize pipeline the import endpoint uses. Shared by importTypebot (Duplicate) and the
 * admin linkBotToBusiness flow.
 *
 * The hardcoded 5-bot limit is enforced for every real workspace and is bypassed ONLY for
 * the system backup workspace (env.BACKUP_WORKSPACE_ID), which must hold many copies.
 */
export const duplicateTypebotIntoWorkspace = async ({
  migratedTypebot,
  targetWorkspaceId,
  actor,
  name,
  businessId,
  enforceBotLimit = true,
  auditAction,
  auditSource,
}: {
  migratedTypebot: TypebotV6
  targetWorkspaceId: string
  actor: AuditActor
  name?: string
  businessId?: string
  enforceBotLimit?: boolean
  auditAction?: typeof BotAuditAction.DUPLICATE | typeof BotAuditAction.LINK
  auditSource?: string
}) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
    select: { id: true, plan: true, businessId: true },
  })
  if (!workspace)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

  const backupWorkspaceId = await getBackupWorkspaceId()
  const isBackupWorkspace =
    !!backupWorkspaceId && targetWorkspaceId === backupWorkspaceId

  if (enforceBotLimit && !isBackupWorkspace) {
    const existingTypebotCount = await prisma.typebot.count({
      where: {
        workspaceId: targetWorkspaceId,
        isArchived: { not: true },
      },
    })
    if (existingTypebotCount >= 5)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Maximum limit of 5 typebots reached for this workspace',
      })
  }

  const groups = (
    migratedTypebot.groups
      ? await sanitizeGroups(targetWorkspaceId)(migratedTypebot.groups)
      : []
  ) as TypebotV6['groups']

  // The backup workspace has unlimited groups too — skip the API-driven group-limit check.
  if (groups.length > 0 && !isBackupWorkspace) {
    const limits = await checkGroupLimits(targetWorkspaceId)
    if (limits.maxGroups > 0 && groups.length > limits.maxGroups)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Typebot has ${groups.length} groups, but the maximum allowed is ${limits.maxGroups}. Please reduce the number of groups first.`,
      })
  }

  const newTypebot = await prisma.typebot.create({
    data: {
      version: '6',
      workspaceId: targetWorkspaceId,
      name: name ?? migratedTypebot.name,
      icon: migratedTypebot.icon,
      selectedThemeTemplateId: migratedTypebot.selectedThemeTemplateId,
      groups,
      events: migratedTypebot.events ?? undefined,
      theme: migratedTypebot.theme ? migratedTypebot.theme : {},
      settings: migratedTypebot.settings
        ? sanitizeSettings(migratedTypebot.settings, workspace.plan, 'create')
        : workspace.plan === Plan.FREE
        ? {
            general: {
              isBrandingEnabled: true,
            },
          }
        : {},
      folderId: await sanitizeFolderId({
        folderId: migratedTypebot.folderId,
        workspaceId: workspace.id,
      }),
      variables: migratedTypebot.variables
        ? sanitizeVariables({
            variables: migratedTypebot.variables,
            groups,
          })
        : [],
      edges: migratedTypebot.edges ?? [],
      resultsTablePreferences:
        migratedTypebot.resultsTablePreferences ?? undefined,
      // Inherit the workspace's business when the caller doesn't specify one.
      businessId: businessId ?? workspace.businessId ?? undefined,
    } satisfies Partial<TypebotV6> & { businessId?: string },
  })

  const parsedNewTypebot = typebotV6Schema.parse(newTypebot)

  if (actor.userId)
    await trackEvents([
      {
        name: 'Typebot created',
        workspaceId: parsedNewTypebot.workspaceId,
        typebotId: parsedNewTypebot.id,
        userId: actor.userId,
        data: {
          name: newTypebot.name,
        },
      },
    ])

  if (auditAction)
    await logBotAudit({
      botId: parsedNewTypebot.id,
      workspaceId: parsedNewTypebot.workspaceId,
      action: auditAction,
      actor,
      source:
        auditSource ??
        (auditAction === BotAuditAction.LINK
          ? 'trpc.linkBotToBusiness'
          : 'trpc.importTypebot'),
      metadata: { sourceBotName: migratedTypebot.name },
    })

  // Mirror the new copy into the backup workspace (no-op if the target IS the backup
  // workspace). Best-effort.
  await snapshotTypebotToBackup(parsedNewTypebot.id)

  return parsedNewTypebot
}
