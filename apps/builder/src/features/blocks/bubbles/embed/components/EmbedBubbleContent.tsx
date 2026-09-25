import { useTranslate } from '@tolgee/react'
import { Flex, Stack, Text } from '@chakra-ui/react'
import { EmbedBubbleBlock } from '@typebot.io/schemas'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { useTypebot } from '@/features/editor/providers/TypebotProvider'
import { PlateBlock } from '@/features/blocks/bubbles/textBubble/components/plate/PlateBlock'

type Props = {
  block: EmbedBubbleBlock
}

export const EmbedBubbleContent = ({ block }: Props) => {
  const { typebot } = useTypebot()
  const { t } = useTranslate()
  if (!block.content?.url)
    return <Text color="gray.500">{t('clickToEdit')}</Text>
  const hasCaption = (block.content?.caption?.length ?? 0) > 0
  return (
    <Stack>
      <Text>
        {block.content.fileName ??
          t('editor.blocks.bubbles.embed.node.show.text')}
      </Text>
      {typebot &&
        block.content.waitForEvent?.isEnabled &&
        block.content.waitForEvent.saveDataInVariableId && (
          <SetVariableLabel
            variables={typebot.variables}
            variableId={block.content.waitForEvent.saveDataInVariableId}
          />
        )}
      {hasCaption && (
        <Flex flexDir="column" className="slate-html-container">
          {block.content?.caption?.map((element, idx) => (
            <PlateBlock key={idx} element={element} />
          ))}
        </Flex>
      )}
    </Stack>
  )
}
