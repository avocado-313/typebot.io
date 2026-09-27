import { HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { useTypebot } from '../providers/TypebotProvider'
import { countComponents } from '@/features/typebot/helpers/componentsLimit'

// "X / Y components used" — live count next to the board menu, matching the design
// mockup. Reads from the same TypebotContext config createBlock's own check uses, so
// this is always in sync with what's actually enforced.
export const ComponentsUsageBadge = () => {
  const { typebot, componentsPlanConfig } = useTypebot()
  const bgColor = useColorModeValue('white', 'gray.900')

  if (!typebot || componentsPlanConfig.maxComponents === null) return null

  const currentCount = countComponents(typebot)

  return (
    <HStack
      rounded="md"
      shadow="lg"
      px="3"
      h="32px"
      bgColor={bgColor}
      spacing="1"
    >
      <Text fontSize="sm" fontWeight="medium">
        {currentCount}
      </Text>
      <Text fontSize="sm" color="gray.500">
        / {componentsPlanConfig.maxComponents} components used
      </Text>
    </HStack>
  )
}
