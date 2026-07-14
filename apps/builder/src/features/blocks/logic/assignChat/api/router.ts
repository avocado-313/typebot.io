import { router } from '@/helpers/server/trpc'
import { listSmartAssignmentRules } from './listSmartAssignmentRules'

export const assignChatRouter = router({
  listSmartAssignmentRules,
})
