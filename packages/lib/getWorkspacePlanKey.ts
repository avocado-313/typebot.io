import { env } from '@typebot.io/env'

export interface WorkspacePlanKeyResponse {
  planKey: string | null
  error?: string
}

// Resolves the canonical Azeer plan family (e.g. "GROWTH_PLAN") for a workspace via
// the Hub, so the builder can look up its own locally-stored component limits by that
// key (see PlanComponentConfig). Mirrors checkGroupLimits.ts: same Hub URL/signature
// convention, same isomorphic client-or-server usage, same fail-open-on-error
// contract — a null planKey means "couldn't resolve, don't restrict" rather than
// throwing, since breaking a user's ability to build/save is worse than a temporary
// under-restriction.
export const getWorkspacePlanKey = async (
  workspaceId: string
): Promise<WorkspacePlanKeyResponse> => {
  try {
    const hubUrl = env.NEXT_PUBLIC_HUB_URL || 'https://bot.avocad0.dev'

    const response = await fetch(`${hubUrl}/api/v1/item/${workspaceId}/plan`, {
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
    })

    if (!response.ok) {
      return { planKey: null, error: 'cannot call the api' }
    }

    const data = await response.json()

    return { planKey: data.data?.plan_key ?? null }
  } catch (error) {
    return {
      planKey: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
