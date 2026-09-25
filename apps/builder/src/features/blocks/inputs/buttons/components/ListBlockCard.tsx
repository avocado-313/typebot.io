import { Text, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from '@tolgee/react'
import { ListIcon } from '@/components/icons'
import { BlockCardLayout } from '@/features/editor/components/BlockCardLayout'
import { useBlockDnd } from '@/features/graph/providers/GraphDndProvider'
import { InputBlockType } from '@typebot.io/schemas/features/blocks/inputs/constants'
import { interactiveButtonType } from '@typebot.io/schemas/features/blocks/inputs/choice/constants'
import { BlockV6 } from '@typebot.io/schemas'
import { inputBlockCardLabelColor } from '@/features/editor/constants'

type Props = {
  onMouseDown: (e: React.MouseEvent, type: BlockV6['type']) => void
}

export const ListBlockCard = ({ onMouseDown }: Props) => {
  const { t } = useTranslate()
  const { draggedBlock } = useBlockDnd()
  const purple = useColorModeValue('purple.500', 'purple.300')

  const isPressed =
    draggedBlock?.type === InputBlockType.CHOICE &&
    draggedBlock?.options?.interactiveButtonType ===
      interactiveButtonType.LIST &&
    draggedBlock?.groupId === ''

  return (
    <BlockCardLayout
      type={InputBlockType.CHOICE}
      isPressed={isPressed}
      tooltip={t('blocks.inputs.list.blockCard.tooltip')}
      onMouseDown={onMouseDown}
    >
      <ListIcon color={purple} />
      <Text fontSize="sm" color={inputBlockCardLabelColor}>
        {t('editor.sidebarBlock.list.label')}
      </Text>
    </BlockCardLayout>
  )
}
