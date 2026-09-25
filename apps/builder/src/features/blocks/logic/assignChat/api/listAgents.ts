import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { fetchAgents } from './helpers/fetchFromHub'
import { assertWorkspaceReadable } from './helpers/assertWorkspaceReadable'

const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().optional(),
})

export const listAgents = authenticatedProcedure
  .input(z.object({ workspaceId: z.string() }))
  .output(z.object({ agents: z.array(agentSchema) }))
  .query(async ({ input: { workspaceId }, ctx: { user } }) => {
    await assertWorkspaceReadable(workspaceId, user)
    const agents = await fetchAgents(workspaceId)
    return {
      agents: agents.map((agent) => ({
        id: String(agent.id),
        name: agent.name,
        email: agent.email,
        image: agent.image ?? undefined,
      })),
    }
  })
