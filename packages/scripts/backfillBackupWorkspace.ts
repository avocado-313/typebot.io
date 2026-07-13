import { config } from 'dotenv'
import { join } from 'path'
import { Prisma, PrismaClient } from '@typebot.io/prisma'

// Load env from the repo root .env (DATABASE_URL, BACKUP_WORKSPACE_ID). Override
// DATABASE_URL / BACKUP_WORKSPACE_ID to target another environment.
config({ path: join(__dirname, '../../.env') })

/**
 * One-time (repeatable) backfill: copies every active (non-archived) bot into the backup
 * ("azeer admin") workspace as a snapshot, keyed by backupOfTypebotId. Idempotent — re-running
 * updates existing backup copies instead of creating duplicates. Ongoing coverage for newly
 * deleted bots is handled by deleteTypebot's snapshot-before-archive.
 */
const backfillBackupWorkspace = async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }
  console.log(`Backfilling backups on DB host: ${new URL(dbUrl).host}`)

  const prisma = new PrismaClient()

  // Resolve the backup workspace: prefer BACKUP_WORKSPACE_ID when it still exists, else fall
  // back to the "azeer admin" workspace by name. This self-heals if the workspace was
  // deleted + recreated (which changes its id).
  let backupWorkspaceId = process.env.BACKUP_WORKSPACE_ID
  if (backupWorkspaceId) {
    const exists = await prisma.workspace.findUnique({
      where: { id: backupWorkspaceId },
      select: { id: true },
    })
    if (!exists) backupWorkspaceId = undefined
  }
  if (!backupWorkspaceId) {
    const byName = await prisma.workspace.findFirst({
      where: { name: 'azeer admin' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    backupWorkspaceId = byName?.id
  }
  if (!backupWorkspaceId) {
    console.error(
      'No backup workspace found — run db:seedBackupWorkspace first (or set BACKUP_WORKSPACE_ID).'
    )
    process.exit(1)
  }
  console.log(`Backup workspace: ${backupWorkspaceId}`)

  const sources = await prisma.typebot.findMany({
    where: {
      isArchived: { not: true },
      workspaceId: { not: backupWorkspaceId },
    },
  })
  console.log(`Found ${sources.length} active bots to back up.`)

  let created = 0
  let updated = 0
  let failed = 0

  for (const source of sources) {
    const content = {
      version: source.version ?? '6',
      // Backup copies are named "<name>-<businessId>" so they're identifiable per business.
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

    try {
      const existing = await prisma.typebot.findFirst({
        where: {
          workspaceId: backupWorkspaceId,
          backupOfTypebotId: source.id,
        },
        select: { id: true },
      })
      if (existing) {
        await prisma.typebot.update({
          where: { id: existing.id },
          data: { ...content, isArchived: false },
        })
        updated++
      } else {
        await prisma.typebot.create({
          data: {
            ...content,
            workspaceId: backupWorkspaceId,
            backupOfTypebotId: source.id,
            isArchived: false,
          },
        })
        created++
      }
    } catch (err) {
      failed++
      console.error(`  ✗ backup failed for bot ${source.id} (${source.name}):`, err)
    }
  }

  console.log(
    `\nBackfill complete: ${created} created, ${updated} updated, ${failed} failed (of ${sources.length}).`
  )
}

backfillBackupWorkspace().then(() => process.exit(0))
