import { HStack, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from '@tolgee/react'
import { TriggerWhatsappFlowBlock } from '@typebot.io/schemas'
import React from 'react'
import { TriggerWhatsappFlowIcon } from './TriggerWhatsappFlowIcon'

type Props = {
  options: TriggerWhatsappFlowBlock['options']
}

export const TriggerWhatsappFlowNodeContent = ({ options }: Props) => {
  const { t } = useTranslate()
  const flowNameColor = useColorModeValue('purple.500', 'purple.300')
  const buttonBorderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Stack spacing={2} w="full" minW={0}>
      {options?.flowName ? (
        <Text color={flowNameColor} fontWeight="medium" noOfLines={1}>
          {options.flowName}
        </Text>
      ) : (
        <Text color="gray.500" fontStyle="italic" noOfLines={1}>
          {t('blocks.logic.triggerWhatsappFlow.node.selectFlow')}
        </Text>
      )}
      <Text color="gray.500" noOfLines={3} whiteSpace="pre-wrap">
        {options?.body ||
          t('blocks.logic.triggerWhatsappFlow.body.placeholder')}
      </Text>
      <HStack
        justify="center"
        spacing={2}
        py={2}
        px={3}
        borderWidth="1px"
        borderColor={buttonBorderColor}
        rounded="md"
        color="gray.500"
      >
        <TriggerWhatsappFlowIcon boxSize="14px" flexShrink={0} />
        <Text noOfLines={1}>
          {options?.cta || t('blocks.logic.triggerWhatsappFlow.node.openFlow')}
        </Text>
      </HStack>
    </Stack>
  )
}
