import { BlockIndices, ChoiceInputBlock } from '@typebot.io/schemas'
import React from 'react'
import { Image, Link, Stack, Tag, Text, Wrap } from '@chakra-ui/react'
import { useTypebot } from '@/features/editor/providers/TypebotProvider'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { ItemNodesList } from '@/features/graph/components/nodes/item/ItemNodesList'
import { useTranslate } from '@tolgee/react'
import { ExternalLinkIcon } from '@/components/icons'
import { headerType } from '@typebot.io/schemas/features/blocks/inputs/choice/constants'

type Props = {
  block: ChoiceInputBlock
  indices: BlockIndices
}

const containsVariables = (value: string): boolean =>
  value.includes('{{') && value.includes('}}')

const InteractiveHeader = ({
  type,
  header,
}: {
  type?: headerType
  header: string
}) => {
  switch (type) {
    case headerType.TEXT:
      return (
        <Text fontWeight="semibold" noOfLines={2}>
          {header}
        </Text>
      )
    case headerType.IMAGE:
      return (
        <Image
          pointerEvents="none"
          src={containsVariables(header) ? '/images/dynamic-image.png' : header}
          alt="Header image"
          rounded="md"
          objectFit="cover"
        />
      )
    case headerType.VIDEO:
      return containsVariables(header) ? (
        <Image
          src="/images/dynamic-image.png"
          alt="Dynamic video thumbnail"
          rounded="md"
        />
      ) : (
        <video
          key={header}
          controls={true}
          style={{ width: '100%', height: '100%', borderRadius: '10px' }}
        >
          <source src={header} />
        </video>
      )
    case headerType.DOCUMENT:
      return (
        <Link href={header} isExternal>
          View header <ExternalLinkIcon mx="2px" />
        </Link>
      )
    default:
      return null
  }
}

const InteractiveBlock = ({ block }: Pick<Props, 'block'>) => {
  const { t } = useTranslate()
  const interactiveData = block.options?.interactiveData

  return (
    <Stack spacing={1} w="full">
      {interactiveData?.header && (
        <InteractiveHeader
          type={interactiveData.headerType}
          header={interactiveData.header}
        />
      )}
      <Text
        color={interactiveData?.body ? 'inherit' : 'gray.500'}
        noOfLines={4}
        whiteSpace="pre-wrap"
      >
        {interactiveData?.body ||
          t('blocks.inputs.settings.interactive.body.placeholder')}
      </Text>
      {interactiveData?.footer && (
        <Text fontSize="xs" color="gray.500" noOfLines={1}>
          {interactiveData.footer}
        </Text>
      )}
    </Stack>
  )
}

export const ButtonsBlockNode = ({ block, indices }: Props) => {
  const { typebot } = useTypebot()
  const { t } = useTranslate()
  const dynamicVariableName = typebot?.variables.find(
    (variable) => variable.id === block.options?.dynamicVariableId
  )?.name

  return (
    <Stack w="full" spacing={3}>
      {block.options?.isInteractive ? <InteractiveBlock block={block} /> : null}
      {block.options?.dynamicVariableId ? (
        <Wrap spacing={1}>
          <Text>{t('blocks.inputs.button.variables.display.label')}</Text>
          <Tag bg="orange.400" color="white">
            {dynamicVariableName}
          </Tag>
          <Text>{t('blocks.inputs.button.variables.buttons.label')}</Text>
        </Wrap>
      ) : (
        <ItemNodesList block={block} indices={indices} />
      )}
      {block.options?.variableId ? (
        <SetVariableLabel
          variableId={block.options.variableId}
          variables={typebot?.variables}
        />
      ) : null}
    </Stack>
  )
}
