import { env } from '@typebot.io/env'

/**
 * Server-side call telling the Hub that a bot (botId) or a whole workspace (workspaceId)
 * was deleted, so it clears the corresponding typebot data from any channel referencing it.
 * The Hub keeps the WhatsApp/Meta channel binding in both cases, and a bot-level unlink also
 * keeps the workspace link so the business can re-link another bot. Best-effort and no-op
 * when no Hub URL is configured, so it never blocks or fails a deletion — and local/dev
 * environments without a Hub don't call production.
 */
export const hubUnlinkChannel = async (target: {
  botId?: string
  workspaceId?: string
}): Promise<{ ok: boolean; error?: string }> => {
  if (!env.NEXT_PUBLIC_HUB_URL) return { ok: true }
  const hubUrl = env.NEXT_PUBLIC_HUB_URL
  try {
    const response = await fetch(`${hubUrl}/api/v1/chatbot/unlink`, {
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
      body: JSON.stringify({
        ...(target.botId ? { bot_id: target.botId } : {}),
        ...(target.workspaceId ? { workspace_id: target.workspaceId } : {}),
      }),
    })
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
