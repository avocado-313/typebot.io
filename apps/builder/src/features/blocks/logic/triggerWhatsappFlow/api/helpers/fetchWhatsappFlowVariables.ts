import { env } from '@typebot.io/env'

export type WhatsappFlowVariable = {
  name: string
  type: string
  example?: unknown
}

export type WhatsappFlowOutput = {
  name: string
  type: string
  screen?: string
}

/**
 * Fetches a per-flow field list through the Avocado Hub. Same trust boundary
 * as `fetchWhatsappFlows`. Returns an empty list on any failure so the
 * settings UI degrades gracefully to "no fields found" rather than breaking
 * the block's settings panel.
 */
const fetchWhatsappFlowFields = async <T>(
  workspaceId: string,
  flowId: string,
  resource: 'variables' | 'outputs'
): Promise<T[]> => {
  try {
    const hubUrl = env.NEXT_PUBLIC_HUB_URL || 'https://bot.avocad0.dev'

    const response = await fetch(
      `${hubUrl}/api/v1/item/${workspaceId}/whatsapp-flows/${flowId}/${resource}`,
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

// The entry screen's data fields — what a caller must supply to open the flow.
export const fetchWhatsappFlowVariables = (
  workspaceId: string,
  flowId: string
) =>
  fetchWhatsappFlowFields<WhatsappFlowVariable>(
    workspaceId,
    flowId,
    'variables'
  )

// The keys of the flow's completion payload (`nfm_reply.response_json`),
// across every terminal screen.
export const fetchWhatsappFlowOutputs = (workspaceId: string, flowId: string) =>
  fetchWhatsappFlowFields<WhatsappFlowOutput>(workspaceId, flowId, 'outputs')
