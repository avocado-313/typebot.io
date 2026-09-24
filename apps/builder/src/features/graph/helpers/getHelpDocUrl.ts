import { env } from '@typebot.io/env'
import { ForgedBlockDefinition } from '@typebot.io/forge-repository/types'
import { BlockWithOptions } from '@typebot.io/schemas'
import { BubbleBlockType } from '@typebot.io/schemas/features/blocks/bubbles/constants'
import { InputBlockType } from '@typebot.io/schemas/features/blocks/inputs/constants'
import { IntegrationBlockType } from '@typebot.io/schemas/features/blocks/integrations/constants'
import { LogicBlockType } from '@typebot.io/schemas/features/blocks/logic/constants'

export const getHelpDocUrl = (
  blockType: BlockWithOptions['type'] | BubbleBlockType,
  blockDef?: ForgedBlockDefinition
): string | undefined => {
  if (!env.NEXT_PUBLIC_KB_BASE_URL) return blockDef?.docsUrl
  const baseUrl = env.NEXT_PUBLIC_KB_BASE_URL
  switch (blockType) {
    case BubbleBlockType.TEXT:
      return `${baseUrl}/editor/blocks/bubbles/text`
    case BubbleBlockType.IMAGE:
      return `${baseUrl}/editor/blocks/bubbles/image`
    case BubbleBlockType.VIDEO:
      return `${baseUrl}/editor/blocks/bubbles/video`
    case BubbleBlockType.EMBED:
      return `${baseUrl}/editor/blocks/bubbles/embed`
    case BubbleBlockType.AUDIO:
      return `${baseUrl}/editor/blocks/bubbles/audio`
    case LogicBlockType.TYPEBOT_LINK:
      return `${baseUrl}/editor/blocks/logic/typebot-link`
    case LogicBlockType.SET_VARIABLE:
      return `${baseUrl}/editor/blocks/logic/set-variable`
    case LogicBlockType.REDIRECT:
      return `${baseUrl}/editor/blocks/logic/redirect`
    case LogicBlockType.SCRIPT:
      return `${baseUrl}/editor/blocks/logic/script`
    case LogicBlockType.WAIT:
      return `${baseUrl}/editor/blocks/logic/wait`
    case LogicBlockType.CONDITION:
      return `${baseUrl}/editor/blocks/logic/condition`
    case LogicBlockType.JUMP:
      return `${baseUrl}/editor/blocks/logic/jump`
    case LogicBlockType.GLOBAL_JUMP:
      return `${baseUrl}/editor/blocks/logic/global-jump`
    case LogicBlockType.ASSIGN_CHAT:
      return `${baseUrl}/editor/blocks/logic/assign-chat`
    case LogicBlockType.CLOSE_CHAT:
      return `${baseUrl}/editor/blocks/logic/close-chat`
    case LogicBlockType.AB_TEST:
      return `${baseUrl}/editor/blocks/logic/ab-test`
    case LogicBlockType.WEBHOOK:
      return `${baseUrl}/editor/blocks/logic/webhook`
    case LogicBlockType.TRIGGER_WHATSAPP_FLOW:
      return `${baseUrl}/editor/blocks/logic/trigger-whatsapp-flow`
    case InputBlockType.TEXT:
      return `${baseUrl}/editor/blocks/inputs/text`
    case InputBlockType.NUMBER:
      return `${baseUrl}/editor/blocks/inputs/number`
    case InputBlockType.EMAIL:
      return `${baseUrl}/editor/blocks/inputs/email`
    case InputBlockType.URL:
      return `${baseUrl}/editor/blocks/inputs/website`
    case InputBlockType.DATE:
      return `${baseUrl}/editor/blocks/inputs/date`
    case InputBlockType.PHONE:
      return `${baseUrl}/editor/blocks/inputs/phone-number`
    case InputBlockType.CHOICE:
      return `${baseUrl}/editor/blocks/inputs/buttons`
    case InputBlockType.PICTURE_CHOICE:
      return `${baseUrl}/editor/blocks/inputs/picture-choice`
    case InputBlockType.PAYMENT:
      return `${baseUrl}/editor/blocks/inputs/payment`
    case InputBlockType.RATING:
      return `${baseUrl}/editor/blocks/inputs/rating`
    case InputBlockType.FILE:
      return `${baseUrl}/editor/blocks/inputs/file-upload`
    case IntegrationBlockType.GOOGLE_SHEETS:
      return `${baseUrl}/editor/blocks/integrations/google-sheets`
    case IntegrationBlockType.GOOGLE_ANALYTICS:
      return `${baseUrl}/editor/blocks/integrations/google-analytics`
    case IntegrationBlockType.WEBHOOK:
      return `${baseUrl}/editor/blocks/integrations/webhook`
    case IntegrationBlockType.EMAIL:
      return `${baseUrl}/editor/blocks/integrations/send-email`
    case IntegrationBlockType.ZAPIER:
      return `${baseUrl}/editor/blocks/integrations/zapier`
    case IntegrationBlockType.MAKE_COM:
      return `${baseUrl}/editor/blocks/integrations/make-com`
    case IntegrationBlockType.PABBLY_CONNECT:
      return `${baseUrl}/editor/blocks/integrations/pabbly-connect`
    case IntegrationBlockType.CHATWOOT:
      return `${baseUrl}/editor/blocks/integrations/chatwoot`
    case IntegrationBlockType.PIXEL:
      return `${baseUrl}/editor/blocks/integrations/meta-pixel`
    case IntegrationBlockType.OPEN_AI:
      return `${baseUrl}/editor/blocks/integrations/openai`
    default:
      return blockDef?.docsUrl
  }
}
