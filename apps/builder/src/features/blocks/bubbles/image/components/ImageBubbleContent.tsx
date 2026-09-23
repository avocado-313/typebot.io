import { useTranslate } from '@tolgee/react'
import { Box, Flex, Text, Image } from '@chakra-ui/react'
import { ImageBubbleBlock } from '@typebot.io/schemas'
import { PlateBlock } from '@/features/blocks/bubbles/textBubble/components/plate/PlateBlock'

type Props = {
  block: ImageBubbleBlock
}

export const ImageBubbleContent = ({ block }: Props) => {
  const { t } = useTranslate()
  const containsVariables =
    block.content?.url?.includes('{{') && block.content.url.includes('}}')
  const hasCaption = (block.content?.caption?.length ?? 0) > 0
  return !block.content?.url ? (
    <Text color={'gray.500'}>{t('clickToEdit')}</Text>
  ) : (
    <Box w="full">
      <Image
        pointerEvents="none"
        src={
          containsVariables ? '/images/dynamic-image.png' : block.content?.url
        }
        alt="Group image"
        rounded="md"
        objectFit="cover"
      />
      {hasCaption && (
        <Flex flexDir="column" className="slate-html-container" mt={1}>
          {block.content?.caption?.map((element, idx) => (
            <PlateBlock key={idx} element={element} />
          ))}
        </Flex>
      )}
    </Box>
  )
}
