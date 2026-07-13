import prisma from '@typebot.io/lib/prisma'
import { Prisma } from '@typebot.io/prisma'
import { getBackupWorkspaceId } from './getBackupWorkspaceId'

/**
 * Upserts a faithful snapshot copy of a bot into the backup ("azeer admin") workspace,
 * keyed by backupOfTypebotId so there is exactly one backup per source bot (re-running
 * updates the existing copy instead of piling up duplicates). Called before a bot is
 * archived so the deletion stays recoverable.
 *
 * Best-effort: never throws, so it can't block the operation it protects. Copies raw content
 * (no publicId/customDomain, to avoid unique-constraint clashes) and leaves the copy
 * unarchived so the Hub fallback can find it.
 */
export const snapshotTypebotToBackup = async (
  sourceTypebotId: string
): Promise<void> => {
  try {
    const backupWorkspaceId = await getBackupWorkspaceId()
    if (!backupWorkspaceId) return

    const source = await prisma.typebot.findFirst({
      where: { id: sourceTypebotId },
    })
    // Nothing to back up, or the bot IS a backup / already lives in the backup workspace.
    if (!source || source.workspaceId === backupWorkspaceId) return

    // Backup copies are named "<name>-<businessId>" so they're identifiable per business
    // (the business persists on the source bot even after it's unlinked).
    const content = {
      version: source.version ?? '6',
      name: source.businessId
        ? `${source.name}-${source.businessId}`
        : source.name,
      icon: source.icon,
      selectedThemeTemplateId: source.selectedThemeTemplateId,
      groups: source.groups as Prisma.InputJsonValue,
      events: (source.events ?? undefined) as Prisma.InputJsonValue,
      variables: source.variables as Prisma.InputJsonValue,
      edges: source.edges as Prisma.InputJsonValue,
      theme: source.theme as Prisma.InputJsonValue,
      settings: source.settings as Prisma.InputJsonValue,
      resultsTablePreferences: (source.resultsTablePreferences ??
        undefined) as Prisma.InputJsonValue,
    }

    const existing = await prisma.typebot.findFirst({
      where: {
        workspaceId: backupWorkspaceId,
        backupOfTypebotId: sourceTypebotId,
      },
      select: { id: true },
    })

    if (existing)
      await prisma.typebot.update({
        where: { id: existing.id },
        data: { ...content, isArchived: false },
      })
    else
      await prisma.typebot.create({
        data: {
          ...content,
          workspaceId: backupWorkspaceId,
          backupOfTypebotId: sourceTypebotId,
          isArchived: false,
        },
      })
  } catch (err) {
    console.error(
      `snapshotTypebotToBackup failed for ${sourceTypebotId}:`,
      err
    )
  }
}
