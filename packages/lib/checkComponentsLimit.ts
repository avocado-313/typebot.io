import { env } from '@typebot.io/env'

export interface ComponentsLimitResponse {
  maxComponents: number | null
  error?: string
}

// Resolves the max number of components (blocks) a workspace's typebots may use, via
// the Hub. Mirrors checkGroupLimits.ts's Hub URL/signature/ngrok conventions, but
// fails open to `null` (unlimited) on any error rather than a hardcoded number —
// PlanComponentConfig (the local migration table) only supplies the block-type
// allowlist now; the count limit itself is live from the Hub.
export const checkComponentsLimit = async (
  workspaceId: string
): Promise<ComponentsLimitResponse> => {
  try {
    const hubUrl = env.NEXT_PUBLIC_HUB_URL || 'https://bot.avocad0.dev'

    const response = await fetch(`${hubUrl}/api/v1/item/${workspaceId}/limit`, {
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
      return { maxComponents: null, error: 'cannot call the api' }
    }

    const data = await response.json()
    const limit = data.data?.limit

    return { maxComponents: typeof limit === 'number' ? limit : null }
  } catch (error) {
    return {
      maxComponents: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
