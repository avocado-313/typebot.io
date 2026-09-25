import { HStack } from '@chakra-ui/react'
import React from 'react'
import { BlockIcon } from './BlockIcon'
import { BlockLabel } from './BlockLabel'
import { LockedIcon } from '@/components/icons'
import { useTranslate } from '@tolgee/react'
import { BubbleBlockType } from '@typebot.io/schemas/features/blocks/bubbles/constants'
import { InputBlockType } from '@typebot.io/schemas/features/blocks/inputs/constants'
import { IntegrationBlockType } from '@typebot.io/schemas/features/blocks/integrations/constants'
import { LogicBlockType } from '@typebot.io/schemas/features/blocks/logic/constants'
import { BlockV6 } from '@typebot.io/schemas'
import { BlockCardLayout } from './BlockCardLayout'
import { ForgedBlockCard } from '@/features/forge/ForgedBlockCard'
import { isForgedBlockType } from '@typebot.io/schemas/features/blocks/forged/helpers'
import { ForgedBlock } from '@typebot.io/forge-repository/types'
import { useComponentLockState } from '../hooks/useComponentLockState'
import { inputBlockCardLabelColor } from '../constants'

export const isInputBlockType = (type: BlockV6['type']) =>
  (Object.values(InputBlockType) as string[]).includes(type)

type Props = {
  type: BlockV6['type']
  tooltip?: string
  isDisabled?: boolean
  children: React.ReactNode
  onMouseDown: (e: React.MouseEvent, type: BlockV6['type']) => void
}

export const BlockCard = (
  props: Pick<Props, 'type' | 'onMouseDown'>
): JSX.Element => {
  const { t } = useTranslate()
  // Called unconditionally (Rules of Hooks) even though the forged-block branch
  // below doesn't use the result — ForgedBlockCard computes its own lock state.
  const { isDisabled, tooltip: lockTooltip } = useComponentLockState(props.type)

  if (isForgedBlockType(props.type)) {
    return <ForgedBlockCard type={props.type} onMouseDown={props.onMouseDown} />
  }

  const defaultTooltip = getBlockCardTooltip(props.type, t)

  return (
    <BlockCardLayout
      {...props}
      isDisabled={isDisabled}
      tooltip={lockTooltip ?? defaultTooltip}
    >
      <BlockIcon type={props.type} />
      <HStack flex="1" justifyContent="space-between">
        <BlockLabel
          type={props.type}
          color={
            isInputBlockType(props.type) ? inputBlockCardLabelColor : undefined
          }
        />
        {isDisabled && <LockedIcon flexShrink={0} color="gray.400" />}
      </HStack>
    </BlockCardLayout>
  )
}

const getBlockCardTooltip = (
  type: Exclude<BlockV6['type'], ForgedBlock['type']>,
  t: (key: string) => string
): string | undefined => {
  switch (type) {
    case BubbleBlockType.TEXT:
      return t('blocks.bubbles.text.blockCard.tooltip')
    case BubbleBlockType.IMAGE:
      return t('blocks.bubbles.image.blockCard.tooltip')
    case BubbleBlockType.VIDEO:
      return t('blocks.bubbles.video.blockCard.tooltip')
    case BubbleBlockType.EMBED:
      return t('blocks.bubbles.embed.blockCard.tooltip')
    case BubbleBlockType.AUDIO:
      return t('blocks.bubbles.audio.blockCard.tooltip')
    case InputBlockType.TEXT:
      return t('blocks.inputs.text.blockCard.tooltip')
    case InputBlockType.NUMBER:
      return t('blocks.inputs.number.blockCard.tooltip')
    case InputBlockType.EMAIL:
      return t('blocks.inputs.email.blockCard.tooltip')
    case InputBlockType.URL:
      return t('blocks.inputs.url.blockCard.tooltip')
    case InputBlockType.DATE:
      return t('blocks.inputs.date.blockCard.tooltip')
    case InputBlockType.PHONE:
      return t('blocks.inputs.phone.blockCard.tooltip')
    case InputBlockType.CHOICE:
      return t('blocks.inputs.buttons.blockCard.tooltip')
    case InputBlockType.PICTURE_CHOICE:
      return t('blocks.inputs.pictureChoice.blockCard.tooltip')
    case InputBlockType.PAYMENT:
      return t('blocks.inputs.payment.blockCard.tooltip')
    case InputBlockType.RATING:
      return t('blocks.inputs.rating.blockCard.tooltip')
    case InputBlockType.FILE:
      return t('blocks.inputs.fileUpload.blockCard.tooltip')
    case LogicBlockType.SET_VARIABLE:
      return t('editor.blockCard.logicBlock.tooltip.setVariable.label')
    case LogicBlockType.CONDITION:
      return t('editor.blockCard.logicBlock.tooltip.condition.label')
    case LogicBlockType.REDIRECT:
      return t('editor.blockCard.logicBlock.tooltip.redirect.label')
    case LogicBlockType.SCRIPT:
      return t('editor.blockCard.logicBlock.tooltip.code.label')
    case LogicBlockType.TYPEBOT_LINK:
      return t('editor.blockCard.logicBlock.tooltip.typebotLink.label')
    case LogicBlockType.WAIT:
      return t('editor.blockCard.logicBlock.tooltip.wait.label')
    case LogicBlockType.JUMP:
      return t('editor.blockCard.logicBlock.tooltip.jump.label')
    case LogicBlockType.GLOBAL_JUMP:
      return t('editor.blockCard.logicBlock.tooltip.globalJump.label')
    case LogicBlockType.AB_TEST:
      return t('editor.blockCard.logicBlock.tooltip.abTest.label')
    case LogicBlockType.ASSIGN_CHAT:
      return t('editor.blockCard.logicBlock.tooltip.assignChat.label')
    case LogicBlockType.CLOSE_CHAT:
      return t('editor.blockCard.logicBlock.tooltip.closeChat.label')
    case LogicBlockType.WEBHOOK:
      return t('editor.blockCard.logicBlock.tooltip.webhook.label')
    case LogicBlockType.TRIGGER_WHATSAPP_FLOW:
      return t('editor.blockCard.logicBlock.tooltip.triggerWhatsappFlow.label')
    case IntegrationBlockType.GOOGLE_SHEETS:
      return t('blocks.integrations.googleSheets.blockCard.tooltip')
    case IntegrationBlockType.GOOGLE_ANALYTICS:
      return t('blocks.integrations.googleAnalytics.blockCard.tooltip')
    case IntegrationBlockType.WEBHOOK:
      return t('blocks.integrations.webhook.blockCard.tooltip')
    case IntegrationBlockType.EMAIL:
      return t('blocks.integrations.sendEmail.blockCard.tooltip')
    case IntegrationBlockType.ZAPIER:
      return t('blocks.integrations.zapier.blockCard.tooltip')
    case IntegrationBlockType.MAKE_COM:
      return t('blocks.integrations.makeCom.blockCard.tooltip')
    case IntegrationBlockType.PABBLY_CONNECT:
      return t('blocks.integrations.pabblyConnect.blockCard.tooltip')
    case IntegrationBlockType.CHATWOOT:
      return t('blocks.integrations.chatwoot.blockCard.tooltip')
    case IntegrationBlockType.OPEN_AI:
      return t('blocks.integrations.openAi.blockCard.tooltip')
    case IntegrationBlockType.PIXEL:
      return t('blocks.integrations.pixel.blockCard.tooltip')
  }
}
