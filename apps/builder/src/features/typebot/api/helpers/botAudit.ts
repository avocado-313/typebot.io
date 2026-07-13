import prisma from '@typebot.io/lib/prisma'
import { BotAuditAction, BotAuditActor, Prisma } from '@typebot.io/prisma'
import type { AuthType } from '@/helpers/server/context'

export type AuditActor = {
  authType?: AuthType
  userId?: string
  tokenId?: string
  ip?: string
  userAgent?: string
}

const resolveActorType = (actor: AuditActor): BotAuditActor =>
  actor.authType === 'api_token'
    ? BotAuditActor.API_TOKEN
    : actor.userId
    ? BotAuditActor.USER
    : BotAuditActor.SYSTEM

const buildMetadata = (
  actor: AuditActor,
  metadata?: Record<string, unknown>
) => ({
  ...(metadata ?? {}),
  ...(actor.ip ? { ip: actor.ip } : {}),
  ...(actor.userAgent ? { userAgent: actor.userAgent } : {}),
  ...(actor.tokenId ? { tokenId: actor.tokenId } : {}),
})

/**
 * Sets transaction-local GUCs so the `typebot_archive_audit` Postgres trigger can attribute
 * the isArchived transition it is about to record. MUST be called on an interactive
 * transaction client (prisma.$transaction(async (tx) => ...)) so the SET LOCAL shares the
 * same connection as the UPDATE that follows. `set_config(_, _, true)` is the parameterized,
 * injection-safe form of `SET LOCAL`.
 */
export const setAuditActorOnTx = async (
  tx: Prisma.TransactionClient,
  {
    source,
    actor,
    metadata,
  }: { source: string; actor: AuditActor; metadata?: Record<string, unknown> }
) => {
  const meta = buildMetadata(actor, metadata)
  // Best-effort: attribution must never break the operation it is annotating.
  try {
    await tx.$queryRawUnsafe(
      `SELECT set_config('app.actor_id', $1, true),
              set_config('app.actor_type', $2, true),
              set_config('app.source', $3, true),
              set_config('app.metadata', $4, true)`,
      actor.userId ?? '',
      resolveActorType(actor),
      source,
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    )
  } catch (err) {
    console.error('setAuditActorOnTx failed:', err)
  }
}

/**
 * Direct-insert an audit row for a non-isArchived event (DUPLICATE / LINK / PROMOTE /
 * FALLBACK_HIT). ARCHIVE / UNARCHIVE rows must NOT be written this way — they are authored
 * solely by the Postgres trigger to avoid double-logging.
 */
export const logBotAudit = async (
  data: {
    botId: string
    workspaceId: string
    action: Exclude<
      BotAuditAction,
      typeof BotAuditAction.ARCHIVE | typeof BotAuditAction.UNARCHIVE
    >
    actor: AuditActor
    source: string
    metadata?: Record<string, unknown>
  },
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ id: string } | null> => {
  // Best-effort: a failure to record the audit row must never fail the bot operation
  // (create/duplicate/link) it is annotating.
  try {
    return await client.botAuditLog.create({
      data: {
        botId: data.botId,
        workspaceId: data.workspaceId,
        action: data.action,
        actorType: resolveActorType(data.actor),
        actorId: data.actor.userId ?? null,
        source: data.source,
        metadata: buildMetadata(
          data.actor,
          data.metadata
        ) as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
  } catch (err) {
    console.error(
      `logBotAudit failed (${data.action} for bot ${data.botId}):`,
      err
    )
    return null
  }
}
