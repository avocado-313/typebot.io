import { env } from '@typebot.io/env'

export type SmartAssignmentRule = {
  id: string
  name: string
  type: string
  group_type: string
  status: string
}

export type HubAgent = {
  id: number
  name: string
  email: string
  image?: string
}

export type HubTeam = {
  id: number
  name: string
  email?: string
  members_count: number
}

/**
 * Fetches a list scoped to the business a Typebot workspace is linked to,
 * through the Avocado Hub (the same trust boundary the builder already uses in
 * `checkGroupLimits`). Must run server-side: it attaches the shared
 * `X-API-SIGNATURE` secret and keys off the workspace id — never call it from the
 * browser. Returns an empty list on any failure so the settings UI degrades
 * gracefully to "nothing found".
 */
const fetchWorkspaceListFromHub = async <T>(
  workspaceId: string,
  resource: 'smart-assignment-rules' | 'agents' | 'teams'
): Promise<T[]> => {
  try {
    const hubUrl = env.NEXT_PUBLIC_HUB_URL || 'https://bot.avocad0.dev'

    const response = await fetch(
      `${hubUrl}/api/v1/item/${workspaceId}/${resource}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(hubUrl.includes('ngrok') && {
            'ngrok-skip-browser-warning': '69420',
          }),
          ...(env.NEXT_PUBLIC_HUB_API_SIGNATURE && {
            'X-API-SIGNATURE': env.NEXT_PUBLIC_HUB_API_SIGNATURE,
          }),
        },
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return (data?.data as T[]) ?? []
  } catch {
    return []
  }
}

export const fetchSmartAssignmentRules = (workspaceId: string) =>
  fetchWorkspaceListFromHub<SmartAssignmentRule>(
    workspaceId,
    'smart-assignment-rules'
  )

export const fetchAgents = (workspaceId: string) =>
  fetchWorkspaceListFromHub<HubAgent>(workspaceId, 'agents')

export const fetchTeams = (workspaceId: string) =>
  fetchWorkspaceListFromHub<HubTeam>(workspaceId, 'teams')
