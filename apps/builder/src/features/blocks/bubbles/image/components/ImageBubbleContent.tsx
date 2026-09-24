import { useTranslate } from '@tolgee/react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { ImageBubbleBlock } from '@typebot.io/schemas'
import { ImagePreview } from '@/components/ImageUploadContent/ImagePreview'
import { PlateBlock } from '@/features/blocks/bubbles/textBubble/components/plate/PlateBlock'

type Props = {
  block: ImageBubbleBlock
}

export const ImageBubbleContent = ({ block }: Props) => {
  const { t } = useTranslate()
  const hasCaption = (block.content?.caption?.length ?? 0) > 0
  return !block.content?.url ? (
    <Text color={'gray.500'}>{t('clickToEdit')}</Text>
  ) : (
    <Box w="full">
      <ImagePreview url={block.content.url} alt="Group image" />
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
