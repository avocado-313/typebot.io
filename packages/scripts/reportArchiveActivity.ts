import { config } from 'dotenv'
import { join } from 'path'
import { PrismaClient } from '@typebot.io/prisma'

// Load env from the repo root .env. Override DATABASE_URL to target another environment.
config({ path: join(__dirname, '../../.env') })

const prisma = new PrismaClient()

const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 30)

/**
 * Diagnosis report for the "mass auto-archiving" incident. Reads the BotAuditLog trigger
 * output and answers: how many bots were archived, by whom, and — critically — whether any
 * archiving came from raw SQL (actorType = 'SQL'), which is the smoking gun for an
 * out-of-band process rather than a user/API action.
 *
 * Run: WINDOW_DAYS=30 pnpm --filter @typebot.io/scripts db:reportArchiveActivity
 */
export const reportArchiveActivity = async () => {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)

  console.log(`\n=== Archive activity in the last ${WINDOW_DAYS} days ===\n`)

  const byActor = await prisma.botAuditLog.groupBy({
    by: ['actorType'],
    where: { action: 'ARCHIVE', createdAt: { gte: since } },
    _count: { _all: true },
  })
  console.log('Archives by actor type:')
  if (byActor.length === 0) console.log('  (none)')
  for (const row of byActor)
    console.log(`  ${row.actorType.padEnd(10)} ${row._count._all}`)

  const perDay = await prisma.$queryRaw<
    { day: Date; actor_type: string; count: bigint }[]
  >`
    SELECT date_trunc('day', "createdAt") AS day, "actorType" AS actor_type, count(*) AS count
    FROM "BotAuditLog"
    WHERE "action" = 'ARCHIVE' AND "createdAt" >= ${since}
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2
  `
  console.log('\nPer-day archives (day | actor | count):')
  if (perDay.length === 0) console.log('  (none)')
  for (const row of perDay)
    console.log(
      `  ${row.day.toISOString().slice(0, 10)}  ${row.actor_type.padEnd(
        10
      )} ${row.count}`
    )

  // The smoking gun: archives with no app attribution (raw SQL / Prisma Studio / external).
  const sqlArchives = await prisma.botAuditLog.findMany({
    where: {
      action: 'ARCHIVE',
      actorType: 'SQL',
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { botId: true, workspaceId: true, createdAt: true, source: true },
  })
  console.log(
    `\n⚠️  Out-of-band (SQL) archives — the smoking gun (${sqlArchives.length}, showing up to 50):`
  )
  if (sqlArchives.length === 0)
    console.log('  (none — all archiving is attributed to a user or API token)')
  for (const row of sqlArchives)
    console.log(
      `  ${row.createdAt.toISOString()}  bot=${row.botId}  workspace=${row.workspaceId}`
    )

  console.log('')
}

reportArchiveActivity().then(() => process.exit(0))
