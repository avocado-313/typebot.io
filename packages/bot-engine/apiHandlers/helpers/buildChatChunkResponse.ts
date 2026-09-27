import { isDefined, isNotDefined } from '@typebot.io/lib/utils'
import { filterPotentiallySensitiveLogs } from '../../logs/filterPotentiallySensitiveLogs'
import { parseDynamicTheme } from '../../parseDynamicTheme'
import { computeCurrentProgress } from '../../computeCurrentProgress'
import { continueBotFlow } from '../../continueBotFlow'
import { convertMessageToWhatsAppMessage } from '../../whatsapp/convertMessageToWhatsAppMessage'

/**
 * Shapes the result of a resumed or freshly-started flow into the same
 * envelope `continueChat` returns, so a webhook caller can relay `messages`
 * to the end user exactly as it would for any other chat turn.
 */
export const buildChatChunkResponse = ({
  sessionId,
  messages,
  input,
  clientSideActions,
  newSessionState,
  logs,
  lastMessageNewFormat,
}: Pick<
  Awaited<ReturnType<typeof continueBotFlow>>,
  | 'messages'
  | 'input'
  | 'clientSideActions'
  | 'newSessionState'
  | 'logs'
  | 'lastMessageNewFormat'
> & { sessionId: string }) => {
  const isPreview = isNotDefined(newSessionState.typebotsQueue[0].resultId)

  const isEnded =
    newSessionState.progressMetadata &&
    !input?.id &&
    (clientSideActions?.filter((c) => c.expectsDedicatedReply).length ?? 0) ===
      0

  return {
    sessionId,
    messages,
    // Pre-converted to the exact WhatsApp Cloud API message shape (e.g. a document's
    // name lives at `.document.filename`, not `.content.fileName` like `messages`
    // does), for callers (the Hub) that relay straight to the Cloud API instead of
    // re-deriving it from the generic bubble block shape.
    whatsAppMessages: messages
      .map(convertMessageToWhatsAppMessage)
      .filter(isDefined),
    input,
    clientSideActions,
    dynamicTheme: parseDynamicTheme(newSessionState),
    logs: isPreview ? logs : logs?.filter(filterPotentiallySensitiveLogs),
    lastMessageNewFormat,
    progress: newSessionState.progressMetadata
      ? isEnded
        ? 100
        : computeCurrentProgress({
            typebotsQueue: newSessionState.typebotsQueue,
            progressMetadata: newSessionState.progressMetadata,
            currentInputBlockId: input?.id,
          })
      : undefined,
  }
}
