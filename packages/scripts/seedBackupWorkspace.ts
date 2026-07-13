import { config } from 'dotenv'
import { join } from 'path'
import { Plan, PrismaClient } from '@typebot.io/prisma'

// Load env from the repo root .env (DATABASE_URL, ADMIN_EMAIL). Runs before the client is
// instantiated inside the function below. Override DATABASE_URL to target another env.
config({ path: join(__dirname, '../../.env') })

const BACKUP_WORKSPACE_NAME = 'azeer admin'

/**
 * Creates (or reports) the system backup workspace that holds duplicates of Hub-linked bots.
 * Run once per environment, then paste the printed id into the BACKUP_WORKSPACE_ID env var
 * (builder) and TYPEBOT_BACKUP_WORKSPACE_ID (Hub). Idempotent: re-running reports the
 * existing workspace instead of creating a second one.
 *
 * Env (DATABASE_URL, ADMIN_EMAIL) is loaded by the package.json command via dotenv-cli.
 * Defaults to the repo root .env (local). To target another environment, run with a
 * different DATABASE_URL, e.g. `DATABASE_URL=<prod-url> pnpm db:seedBackupWorkspace`.
 */
export const seedBackupWorkspace = async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }
  console.log(`Seeding backup workspace on DB host: ${new URL(dbUrl).host}`)

  const prisma = new PrismaClient()

  const adminEmail = process.env.ADMIN_EMAIL?.split(',')[0]?.trim()
  if (!adminEmail) {
    console.error(
      'ADMIN_EMAIL is not set — cannot determine the backup workspace owner.'
    )
    process.exit(1)
  }

  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true },
  })
  if (!admin) {
    console.error(`No user found for ADMIN_EMAIL "${adminEmail}".`)
    process.exit(1)
  }

  const existing = await prisma.workspace.findFirst({
    where: {
      name: BACKUP_WORKSPACE_NAME,
      members: { some: { userId: admin.id, role: 'ADMIN' } },
    },
    select: { id: true },
  })
  if (existing) {
    console.log(
      `Backup workspace already exists: ${existing.id}\n` +
        `Set BACKUP_WORKSPACE_ID=${existing.id} (builder) and TYPEBOT_BACKUP_WORKSPACE_ID=${existing.id} (Hub).`
    )
    return
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: BACKUP_WORKSPACE_NAME,
      plan: Plan.UNLIMITED,
      members: { create: [{ role: 'ADMIN', userId: admin.id }] },
    },
    select: { id: true },
  })

  console.log(
    `Created backup workspace: ${workspace.id}\n` +
      `Now set BACKUP_WORKSPACE_ID=${workspace.id} (builder) and TYPEBOT_BACKUP_WORKSPACE_ID=${workspace.id} (Hub).`
  )
}

seedBackupWorkspace().then(() => process.exit(0))
