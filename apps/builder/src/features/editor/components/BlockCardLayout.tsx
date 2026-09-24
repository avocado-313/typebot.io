import { useBlockDnd } from '@/features/graph/providers/GraphDndProvider'
import { Tooltip, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import { BlockV6 } from '@typebot.io/schemas'
import { ReactNode, useState, useEffect } from 'react'

type Props = {
  type: BlockV6['type']
  tooltip?: ReactNode
  isDisabled?: boolean
  isPressed?: boolean
  children: React.ReactNode
  onMouseDown: (e: React.MouseEvent, type: BlockV6['type']) => void
}

export const BlockCardLayout = ({
  type,
  onMouseDown,
  tooltip,
  isDisabled,
  isPressed,
  children,
}: Props) => {
  const { draggedBlockType } = useBlockDnd()
  const [isMouseDown, setIsMouseDown] = useState(false)

  useEffect(() => {
    setIsMouseDown(isPressed ?? draggedBlockType === type)
  }, [draggedBlockType, type, isPressed])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDisabled) return
    onMouseDown(e, type)
  }

  const borderColor = useColorModeValue('gray.200', 'gray.800')
  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const hoverStyle = useColorModeValue(
    { shadow: 'md' },
    { bgColor: 'gray.800' }
  )

  return (
    <Tooltip label={tooltip} placement="top" rounded="md" p="3">
      <Flex pos="relative">
        <HStack
          borderWidth="1px"
          borderColor={borderColor}
          rounded="lg"
          flex="1"
          cursor={isDisabled ? 'not-allowed' : 'grab'}
          opacity={isDisabled ? '0.5' : isMouseDown ? '0.4' : '1'}
          onMouseDown={handleMouseDown}
          bgColor={bgColor}
          px="4"
          py="2"
          _hover={isDisabled ? undefined : hoverStyle}
          transition="box-shadow 200ms, background-color 200ms"
        >
          {!isMouseDown ? children : null}
        </HStack>
      </Flex>
    </Tooltip>
  )
}
