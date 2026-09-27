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
  switch (blockType) {
    case BubbleBlockType.TEXT:
      return '/help/blocks/bubbles/text'
    case BubbleBlockType.IMAGE:
      return '/help/blocks/bubbles/image'
    case BubbleBlockType.VIDEO:
      return '/help/blocks/bubbles/video'
    case BubbleBlockType.EMBED:
      return '/help/blocks/bubbles/embed'
    case BubbleBlockType.AUDIO:
      return '/help/blocks/bubbles/audio'
    case LogicBlockType.TYPEBOT_LINK:
      return '/help/blocks/logic/bot-link'
    case LogicBlockType.SET_VARIABLE:
      return '/help/blocks/logic/set-variable'
    case LogicBlockType.REDIRECT:
      return '/help/blocks/logic/redirect'
    case LogicBlockType.SCRIPT:
      return '/help/blocks/logic/script'
    case LogicBlockType.WAIT:
      return '/help/blocks/logic/wait'
    case LogicBlockType.CONDITION:
      return '/help/blocks/logic/condition'
    case LogicBlockType.JUMP:
      return '/help/blocks/logic/jump'
    case LogicBlockType.AB_TEST:
      return '/help/blocks/logic/ab-test'
    case LogicBlockType.WEBHOOK:
      return '/help/blocks/logic/webhook'
    // No article yet for these — no deploy needed to add one later, the
    // link simply starts rendering once a matching file exists under
    // apps/builder/content/help.
    case LogicBlockType.GLOBAL_JUMP:
    case LogicBlockType.ASSIGN_CHAT:
    case LogicBlockType.CLOSE_CHAT:
    case LogicBlockType.TRIGGER_WHATSAPP_FLOW:
      return blockDef?.docsUrl
    case InputBlockType.TEXT:
      return '/help/blocks/inputs/text'
    case InputBlockType.NUMBER:
      return '/help/blocks/inputs/number'
    case InputBlockType.EMAIL:
      return '/help/blocks/inputs/email'
    case InputBlockType.URL:
      return '/help/blocks/inputs/website'
    case InputBlockType.DATE:
      return '/help/blocks/inputs/date'
    case InputBlockType.PHONE:
      return '/help/blocks/inputs/phone-number'
    case InputBlockType.CHOICE:
      return '/help/blocks/inputs/buttons'
    case InputBlockType.PICTURE_CHOICE:
      return '/help/blocks/inputs/picture-choice'
    case InputBlockType.PAYMENT:
      return '/help/blocks/inputs/payment'
    case InputBlockType.RATING:
      return '/help/blocks/inputs/rating'
    case InputBlockType.FILE:
      return '/help/blocks/inputs/file-upload'
    case IntegrationBlockType.GOOGLE_SHEETS:
      return '/help/blocks/integrations/google-sheets'
    case IntegrationBlockType.GOOGLE_ANALYTICS:
      return '/help/blocks/integrations/google-analytics'
    case IntegrationBlockType.WEBHOOK:
      return '/help/blocks/integrations/webhook'
    case IntegrationBlockType.EMAIL:
      return '/help/blocks/integrations/send-email'
    case IntegrationBlockType.ZAPIER:
      return '/help/blocks/integrations/zapier'
    case IntegrationBlockType.MAKE_COM:
      return '/help/blocks/integrations/make-com'
    case IntegrationBlockType.PABBLY_CONNECT:
      return '/help/blocks/integrations/pabbly-connect'
    case IntegrationBlockType.CHATWOOT:
      return '/help/blocks/integrations/chatwoot'
    case IntegrationBlockType.PIXEL:
      return '/help/blocks/integrations/meta-pixel'
    case IntegrationBlockType.OPEN_AI:
      return '/help/blocks/integrations/openai'
    default:
      return blockDef?.docsUrl
  }
}
