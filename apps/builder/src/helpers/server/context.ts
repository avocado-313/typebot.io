import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { inferAsyncReturnType } from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import prisma from '@typebot.io/lib/prisma'

export type AuthType = 'api_token' | 'session'

export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  const user = await getAuthenticatedUser(opts.req, opts.res)

  // Attribution metadata for the bot audit trail (see deleteTypebot/restoreTypebot).
  const bearerToken = opts.req.headers['authorization']?.slice(7)
  const authType: AuthType = bearerToken ? 'api_token' : 'session'
  const tokenId =
    bearerToken && user
      ? (
          await prisma.apiToken.findFirst({
            where: { token: bearerToken, ownerId: user.id },
            select: { id: true },
          })
        )?.id
      : undefined

  const forwardedFor = opts.req.headers['x-forwarded-for']
  const ip =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(',')[0]
      ?.trim() ??
    opts.req.socket?.remoteAddress ??
    undefined
  const userAgent = opts.req.headers['user-agent'] ?? undefined

  return {
    user,
    authType,
    tokenId,
    ip,
    userAgent,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
