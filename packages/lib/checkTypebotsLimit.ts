import { env } from '@typebot.io/env'

export const isWorkspaceExcludedFromTypebotsLimit = (
  workspaceId: string
): boolean =>
  env.TYPEBOTS_LIMIT_EXCLUDED_WORKSPACE_IDS?.includes(workspaceId) ?? false
