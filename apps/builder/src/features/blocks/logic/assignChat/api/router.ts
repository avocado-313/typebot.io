import { router } from '@/helpers/server/trpc'
import { listSmartAssignmentRules } from './listSmartAssignmentRules'
import { listAgents } from './listAgents'
import { listTeams } from './listTeams'

export const assignChatRouter = router({
  listSmartAssignmentRules,
  listAgents,
  listTeams,
})
