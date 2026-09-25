import {
  StackProps,
  HStack,
  IconButton,
  Spacer,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  MARK_BOLD,
  MARK_ITALIC,
  MARK_UNDERLINE,
} from '@udecode/plate-basic-marks'
import { getPluginType, useEditorRef } from '@udecode/plate-core'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  UserIcon,
} from '@/components/icons'
import { MarkToolbarButton } from './plate/MarkToolbarButton'
import { getHelpDocUrl } from '@/features/graph/helpers/getHelpDocUrl'
import { HelpDocLink } from '@/features/graph/components/nodes/block/HelpDocLink'
import { BubbleBlockType } from '@typebot.io/schemas/features/blocks/bubbles/constants'

type Props = {
  onVariablesButtonClick: () => void
} & StackProps

export const TextEditorToolBar = ({
  onVariablesButtonClick,
  ...props
}: Props) => {
  const editor = useEditorRef()
  const helpDocUrl = getHelpDocUrl(BubbleBlockType.TEXT)

  const handleVariablesButtonMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onVariablesButtonClick()
  }
  return (
    <HStack
      bgColor={useColorModeValue('white', 'gray.850')}
      borderTopRadius="md"
      p={2}
      w="full"
      boxSizing="border-box"
      borderBottomWidth={1}
      {...props}
    >
      <IconButton
        aria-label="Insert variable"
        size="sm"
        onMouseDown={handleVariablesButtonMouseDown}
        icon={<UserIcon />}
      />
      <span data-testid="bold-button">
        <MarkToolbarButton
          nodeType={getPluginType(editor, MARK_BOLD)}
          icon={<BoldIcon />}
          aria-label="Toggle bold"
        />
      </span>
      <span data-testid="italic-button">
        <MarkToolbarButton
          nodeType={getPluginType(editor, MARK_ITALIC)}
          icon={<ItalicIcon />}
          aria-label="Toggle italic"
        />
      </span>
      <span data-testid="underline-button">
        <MarkToolbarButton
          nodeType={getPluginType(editor, MARK_UNDERLINE)}
          icon={<UnderlineIcon />}
          aria-label="Toggle underline"
        />
      </span>
      {helpDocUrl && (
        <>
          <Spacer />
          <HelpDocLink
            helpDocUrl={helpDocUrl}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </>
      )}
    </HStack>
  )
}
