import { env } from '@typebot.io/env'

export const isWorkspaceExcludedFromBotLimit = (workspaceId: string) =>
  env.BOT_LIMIT_EXCLUDED_WORKSPACE_IDS?.some((id) => id === workspaceId) ??
  false
