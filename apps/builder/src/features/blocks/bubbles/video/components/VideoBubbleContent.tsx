import { useTranslate } from '@tolgee/react'
import { Box, Flex, Text, Image } from '@chakra-ui/react'
import { VideoBubbleBlock } from '@typebot.io/schemas'
import {
  VideoBubbleContentType,
  embedBaseUrls,
} from '@typebot.io/schemas/features/blocks/bubbles/video/constants'
import { PlateBlock } from '@/features/blocks/bubbles/textBubble/components/plate/PlateBlock'

type Props = {
  block: VideoBubbleBlock
}

export const VideoBubbleContent = ({ block }: Props) => {
  const { t } = useTranslate()
  if (!block.content?.url || !block.content.type)
    return <Text color="gray.500">{t('clickToEdit')}</Text>
  const containsVariables =
    block.content?.url?.includes('{{') && block.content.url.includes('}}')
  const hasCaption = (block.content?.caption?.length ?? 0) > 0
  const caption = hasCaption && (
    <Flex flexDir="column" className="slate-html-container" mt={1}>
      {block.content?.caption?.map((element, idx) => (
        <PlateBlock key={idx} element={element} />
      ))}
    </Flex>
  )
  switch (block.content.type) {
    case VideoBubbleContentType.URL:
      return (
        <Box w="full">
          <Box w="full" h="120px" pos="relative">
            {containsVariables ? (
              <Image
                src="/images/dynamic-image.png"
                alt="Dynamic video thumbnail"
                rounded="md"
              />
            ) : (
              <video
                key={block.content.url}
                controls={block.content?.areControlsDisplayed}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  borderRadius: '10px',
                }}
              >
                <source src={block.content.url} />
              </video>
            )}
          </Box>
          {caption}
        </Box>
      )
    case VideoBubbleContentType.GUMLET:
    case VideoBubbleContentType.VIMEO:
    case VideoBubbleContentType.YOUTUBE: {
      const baseUrl = embedBaseUrls[block.content.type]
      return (
        <Box w="full">
          <Box w="full" h="120px" pos="relative">
            <iframe
              src={`${baseUrl}/${block.content.id}`}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: '0',
                top: '0',
                borderRadius: '10px',
                pointerEvents: 'none',
              }}
            />
          </Box>
          {caption}
        </Box>
      )
    }
    case VideoBubbleContentType.TIKTOK: {
      return (
        <Box w="full">
          <Box w="full" h="300px" pos="relative">
            <iframe
              src={`https://www.tiktok.com/embed/v2/${block.content.id}`}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: '0',
                top: '0',
                borderRadius: '10px',
                pointerEvents: 'none',
              }}
            />
          </Box>
          {caption}
        </Box>
      )
    }
  }
}
