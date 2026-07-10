import prisma from '@typebot.io/lib/prisma'
import { env } from '@typebot.io/env'

export const BACKUP_WORKSPACE_NAME = 'azeer admin'

/**
 * Resolves the backup ("azeer admin") workspace id. Prefers env.BACKUP_WORKSPACE_ID when it
 * still points at an existing workspace, and otherwise falls back to looking it up by name.
 * This makes the backup config self-heal when the workspace is deleted + recreated (which
 * changes its id) — the common failure we kept hitting with a hardcoded id.
 *
 * Returns undefined when no backup workspace exists at all (backups then no-op).
 */
export const getBackupWorkspaceId = async (): Promise<string | undefined> => {
  if (env.BACKUP_WORKSPACE_ID) {
    const byId = await prisma.workspace.findUnique({
      where: { id: env.BACKUP_WORKSPACE_ID },
      select: { id: true },
    })
    if (byId) return byId.id
  }
  const byName = await prisma.workspace.findFirst({
    where: { name: BACKUP_WORKSPACE_NAME },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return byName?.id
}
