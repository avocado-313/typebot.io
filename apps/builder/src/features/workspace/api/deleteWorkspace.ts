import prisma from '@typebot.io/lib/prisma'
import { adminProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { isNotEmpty } from '@typebot.io/lib/utils'
import Stripe from 'stripe'
import { env } from '@typebot.io/env'
import { hubUnlinkChannel } from '@/features/typebot/api/helpers/hubUnlinkChannel'

export const deleteWorkspace = adminProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/workspaces/{workspaceId}',
      protect: true,
      summary: 'Delete workspace',
      tags: ['Workspace'],
    },
  })
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          '[Where to find my workspace ID?](../how-to#how-to-find-my-workspaceid)'
        ),
    })
  )
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { workspaceId } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      select: {
        id: true,
        stripeId: true,
      },
    })

    if (!workspace)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No workspaces found' })

    await prisma.workspace.deleteMany({
      where: { id: workspaceId },
    })

    // Keep the Hub in sync: the cascade above hard-deleted the workspace and every bot in
    // it, so clear the workspace link (and bot pointers) from any channel referencing it.
    // Best-effort — never fails the delete (same contract as deleteTypebot).
    const unlink = await hubUnlinkChannel({ workspaceId })
    if (!unlink.ok)
      console.error(
        `deleteWorkspace: Hub unlink failed for workspace ${workspaceId}: ${unlink.error}`
      )

    if (isNotEmpty(workspace.stripeId) && env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
      })

      const subscriptions = await stripe.subscriptions.list({
        customer: workspace.stripeId,
      })

      for (const subscription of subscriptions.data) {
        await stripe.subscriptions.cancel(subscription.id)
      }
    }

    return {
      message: 'Workspace deleted',
    }
  })
