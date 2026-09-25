import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { fetchTeams } from './helpers/fetchFromHub'
import { assertWorkspaceReadable } from './helpers/assertWorkspaceReadable'

const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  membersCount: z.number(),
})

export const listTeams = authenticatedProcedure
  .input(z.object({ workspaceId: z.string() }))
  .output(z.object({ teams: z.array(teamSchema) }))
  .query(async ({ input: { workspaceId }, ctx: { user } }) => {
    await assertWorkspaceReadable(workspaceId, user)
    const teams = await fetchTeams(workspaceId)
    return {
      teams: teams.map((team) => ({
        id: String(team.id),
        name: team.name,
        email: team.email || undefined,
        membersCount: team.members_count ?? 0,
      })),
    }
  })
