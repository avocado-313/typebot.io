import React from 'react'
import { Tag, Text } from '@chakra-ui/react'
import { AssignChatBlock } from '@typebot.io/schemas'
import { assignChatType } from '@typebot.io/schemas/features/blocks/logic/assignChat/constants'
import { useTranslate } from '@tolgee/react'

type Props = {
  options: AssignChatBlock['options']
}

export const AssignChatNodeContent = ({ options }: Props) => {
  const { t } = useTranslate()
  const assignType: assignChatType | undefined = options?.assignType

  const target =
    assignType === assignChatType.SMART_ASSIGNMENT
      ? options?.ruleName
      : options?.assigneeName || options?.email

  // Agent/team without a pick shows nothing; rule-based types fall back to
  // their type label so the node still tells what it does.
  const label =
    target ||
    (assignType === assignChatType.SMART_ASSIGNMENT ||
    assignType === assignChatType.HANDOVER
      ? t('blocks.logic.assignChat.' + assignType)
      : undefined)

  return (
    <Text color="currentcolor" noOfLines={2}>
      {t('blocks.logic.assignChat.assignTo')} {label && <Tag>{label}</Tag>}
    </Text>
  )
}
