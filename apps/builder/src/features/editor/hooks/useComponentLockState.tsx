import { useTypebot } from '../providers/TypebotProvider'
import {
  countComponents,
  findUnlockingPlan,
  isBlockTypeAllowed,
  isComponentLimitReached,
} from '@/features/typebot/helpers/componentsLimit'
import { BlockV6 } from '@typebot.io/schemas'
import { HStack, Text } from '@chakra-ui/react'
import { LockedIcon } from '@/components/icons'
import { ReactNode } from 'react'

// Whether a block card should render as visible-but-locked (plan doesn't include
// this block type) or blocked-by-count (plan's included, but the component limit is
// reached) — and the tooltip content to show for either case. Read from the shared
// TypebotContext config (fetched once in TypebotProvider), so this always matches
// what the live counter and createBlock's own check are using.
export const useComponentLockState = (
  type: BlockV6['type']
): { isDisabled: boolean; tooltip?: ReactNode } => {
  const { typebot, componentsPlanConfig } = useTypebot()
  const { allowedBlockTypes, maxComponents, allPlans } = componentsPlanConfig

  const isTypeLocked = !isBlockTypeAllowed(type, allowedBlockTypes)
  const currentCount = typebot ? countComponents(typebot) : 0
  const isCountBlocked =
    !isTypeLocked && isComponentLimitReached(currentCount, maxComponents)

  if (!isTypeLocked && !isCountBlocked) return { isDisabled: false }

  const unlockingPlan = isTypeLocked
    ? findUnlockingPlan(type, allPlans)
    : undefined

  return {
    isDisabled: true,
    tooltip: (
      <HStack align="start" spacing="2" maxW="250px">
        <LockedIcon color="orange.400" mt="1" flexShrink={0} />
        <Text>
          <Text as="span" fontWeight="bold" color="orange.400">
            {isTypeLocked ? 'Not in your plan. ' : 'Component limit reached. '}
          </Text>
          {isTypeLocked
            ? unlockingPlan
              ? `Available on the ${unlockingPlan.planKey} plan. Upgrade to unlock it.`
              : 'Upgrade your plan to unlock this component.'
            : `Your plan allows up to ${maxComponents} components (${currentCount}/${maxComponents} used). Upgrade to add more.`}
        </Text>
      </HStack>
    ),
  }
}
