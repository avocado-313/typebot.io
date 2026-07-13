import { TRPCError, initTRPC } from '@trpc/server'
import { Context } from './context'
import { OpenApiMeta } from '@lilyrose2798/trpc-openapi'
import superjson from 'superjson'
import * as Sentry from '@sentry/nextjs'
import { ZodError } from 'zod'
import { env } from '@typebot.io/env'

const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      }
    },
  })

const sentryMiddleware = t.middleware(
  Sentry.Handlers.trpcMiddleware({
    attachRpcInput: true,
  })
)

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    })
  }
  return next({
    ctx: {
      user: ctx.user,
      authType: ctx.authType,
      tokenId: ctx.tokenId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  })
})

const finalMiddleware = sentryMiddleware.unstable_pipe(isAuthed)

// Super-admin gate (email allowlist, same source of truth as getUserRoleInWorkspace).
// This is the authoritative boundary for admin-only procedures — the client-side
// `session.user.isAdmin` flag only hides UI.
const isAdmin = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (!ctx.user.email || !env.ADMIN_EMAIL?.includes(ctx.user.email)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({
    ctx: {
      user: ctx.user,
      authType: ctx.authType,
      tokenId: ctx.tokenId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  })
})

const adminMiddleware = sentryMiddleware.unstable_pipe(isAdmin)

export const middleware = t.middleware

export const router = t.router
export const mergeRouters = t.mergeRouters

export const publicProcedure = t.procedure.use(sentryMiddleware)

export const authenticatedProcedure = t.procedure.use(finalMiddleware)

export const adminProcedure = t.procedure.use(adminMiddleware)
