import { env } from '@typebot.io/env'

/**
 * Server-side call to the Hub to point a business's typebot_channel at a bot. Reuses the
 * same Hub base URL + X-API-SIGNATURE auth pattern as checkGroupLimits. Best-effort: returns
 * a status object rather than throwing, so a Hub outage doesn't lose the (already created +
 * published) duplicate bot — the link can be retried.
 */
export const hubLinkChannel = async (params: {
  businessId: string
  botId: string
  workspaceId: string
  publicId: string | null
  botName: string
}): Promise<{ ok: boolean; error?: string }> => {
  const hubUrl = env.NEXT_PUBLIC_HUB_URL || 'https://bot.avocad0.dev'
  const payload = {
    business_id: params.businessId,
    bot_id: params.botId,
    workspace_id: params.workspaceId,
    public_id: params.publicId ?? '',
    bot_name: params.botName,
  }
  console.log(
    `hubLinkChannel: sending link to Hub for business ${payload.business_id} - botId: ${payload.bot_id}, workspaceId: ${payload.workspace_id}, publicId: "${payload.public_id}"`
  )
  if (!payload.public_id)
    console.warn(
      `hubLinkChannel: public_id is EMPTY for bot ${payload.bot_id} - the Hub channel will not be able to route messages`
    )
  try {
    const response = await fetch(`${hubUrl}/api/v1/chatbot/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hubUrl.includes('ngrok') && {
          'ngrok-skip-browser-warning': '69420',
        }),
        ...(env.NEXT_PUBLIC_HUB_API_SIGNATURE && {
          'X-API-SIGNATURE': env.NEXT_PUBLIC_HUB_API_SIGNATURE,
        }),
      },
      body: JSON.stringify(payload),
    })
    console.log(
      `hubLinkChannel: Hub responded ${response.status} for bot ${payload.bot_id}`
    )
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Hub responded ${response.status}: ${text.slice(0, 200)}`,
      }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
