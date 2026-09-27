import { ForgedBlock } from '@typebot.io/forge-repository/types'
import { BlockV6 } from '@typebot.io/schemas'
import { HStack } from '@chakra-ui/react'
import { BlockIcon } from '../editor/components/BlockIcon'
import { BlockLabel } from '../editor/components/BlockLabel'
import { useForgedBlock } from './hooks/useForgedBlock'
import { BlockCardLayout } from '../editor/components/BlockCardLayout'
import { useComponentLockState } from '../editor/hooks/useComponentLockState'
import { LockedIcon } from '@/components/icons'

export const ForgedBlockCard = (props: {
  type: ForgedBlock['type']
  onMouseDown: (e: React.MouseEvent, type: BlockV6['type']) => void
}) => {
  const { blockDef } = useForgedBlock(props.type)
  const { isDisabled, tooltip: lockTooltip } = useComponentLockState(props.type)

  return (
    <BlockCardLayout
      {...props}
      isDisabled={isDisabled}
      tooltip={
        lockTooltip ?? (blockDef?.fullName ? blockDef.fullName : undefined)
      }
    >
      <BlockIcon type={props.type} />
      <HStack flex="1" justifyContent="space-between">
        <BlockLabel type={props.type} />
        {isDisabled && <LockedIcon flexShrink={0} color="gray.400" />}
      </HStack>
    </BlockCardLayout>
  )
}
