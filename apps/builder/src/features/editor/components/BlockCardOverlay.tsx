import { StackProps, HStack, useColorModeValue } from '@chakra-ui/react'
import { BlockIcon } from './BlockIcon'
import { BlockLabel } from './BlockLabel'
import { BlockV6 } from '@typebot.io/schemas'
import { useBlockCardBgColor } from './BlockCardLayout'

export const BlockCardOverlay = ({
  type,
  icon,
  label,
  ...props
}: StackProps & {
  type: BlockV6['type']
  icon?: JSX.Element
  label?: JSX.Element
}) => {
  return (
    <HStack
      borderWidth="1px"
      rounded="lg"
      cursor={'grabbing'}
      w="147px"
      transition="none"
      pointerEvents="none"
      px="4"
      py="2"
      borderColor={useColorModeValue('gray.200', 'gray.800')}
      bgColor={useBlockCardBgColor(type)}
      shadow="xl"
      zIndex={2}
      {...props}
    >
      {icon ?? <BlockIcon type={type} />}
      {label ?? <BlockLabel type={type} />}
    </HStack>
  )
}
