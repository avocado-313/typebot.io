import { AudioBubbleForm } from '@/features/blocks/bubbles/audio/components/AudioBubbleForm'
import { EmbedUploadContent } from '@/features/blocks/bubbles/embed/components/EmbedUploadContent'
import { ImageBubbleSettings } from '@/features/blocks/bubbles/image/components/ImageBubbleSettings'
import { VideoUploadContent } from '@/features/blocks/bubbles/video/components/VideoUploadContent'
import { FilePathUploadProps } from '@/features/upload/api/generateUploadUrl'
import {
  Portal,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Flex,
  HStack,
  SlideFade,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  BubbleBlock,
  BubbleBlockContent,
  TextBubbleBlock,
} from '@typebot.io/schemas'
import { BubbleBlockType } from '@typebot.io/schemas/features/blocks/bubbles/constants'
import { useRef, useState } from 'react'
import { getHelpDocUrl } from '@/features/graph/helpers/getHelpDocUrl'
import { HelpDocLink } from './HelpDocLink'

type Props = {
  uploadFileProps: FilePathUploadProps
  block: Exclude<BubbleBlock, TextBubbleBlock>
  onContentChange: (content: BubbleBlockContent) => void
}

export const MediaBubblePopoverContent = (props: Props) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const handleMouseDown = (e: React.MouseEvent) => e.stopPropagation()
  const helpDocUrl = getHelpDocUrl(props.block.type)
  const helpBarBgColor = useColorModeValue('white', 'gray.800')

  return (
    <Portal>
      <PopoverContent
        onMouseDown={handleMouseDown}
        pos="relative"
        w={
          props.block.type === BubbleBlockType.IMAGE ||
          props.block.type === BubbleBlockType.EMBED
            ? '500px'
            : '400px'
        }
      >
        <PopoverArrow />
        <PopoverBody
          ref={ref}
          shadow="lg"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {helpDocUrl && (
            <Flex
              w="full"
              pos="absolute"
              top="-56px"
              height="64px"
              right={0}
              justifyContent="flex-end"
              align="center"
            >
              <SlideFade in={isHovering} unmountOnExit>
                <HStack
                  rounded="md"
                  borderWidth="1px"
                  bgColor={helpBarBgColor}
                  shadow="md"
                >
                  <HelpDocLink helpDocUrl={helpDocUrl} />
                </HStack>
              </SlideFade>
            </Flex>
          )}
          <MediaBubbleContent {...props} />
        </PopoverBody>
      </PopoverContent>
    </Portal>
  )
}

export const MediaBubbleContent = ({
  uploadFileProps,
  block,
  onContentChange,
}: Props) => {
  switch (block.type) {
    case BubbleBlockType.IMAGE: {
      return (
        <ImageBubbleSettings
          uploadFileProps={uploadFileProps}
          block={block}
          onContentChange={onContentChange}
        />
      )
    }
    case BubbleBlockType.VIDEO: {
      return (
        <VideoUploadContent
          blockId={block.id}
          uploadFileProps={uploadFileProps}
          content={block.content}
          onSubmit={onContentChange}
        />
      )
    }
    case BubbleBlockType.EMBED: {
      return (
        <EmbedUploadContent
          blockId={block.id}
          uploadFileProps={uploadFileProps}
          content={block.content}
          onSubmit={onContentChange}
        />
      )
    }
    case BubbleBlockType.AUDIO: {
      return (
        <AudioBubbleForm
          content={block.content}
          uploadFileProps={uploadFileProps}
          onContentChange={onContentChange}
        />
      )
    }
  }
}
