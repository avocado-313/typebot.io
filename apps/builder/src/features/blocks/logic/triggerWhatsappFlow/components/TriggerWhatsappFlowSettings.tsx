import { TextInput, Textarea } from '@/components/inputs'
import { Select } from '@/components/inputs/Select'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { TableList, TableListItemProps } from '@/components/TableList'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { trpc } from '@/lib/trpc'
import {
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Stack,
  Tag,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { createId } from '@paralleldrive/cuid2'
import { useTranslate } from '@tolgee/react'
import { TriggerWhatsappFlowBlock } from '@typebot.io/schemas'
import {
  TriggerWhatsappFlowResponseMapping,
  TriggerWhatsappFlowVariableMapping,
} from '@typebot.io/schemas/features/blocks/logic/triggerWhatsappFlow/schema'
import {
  whatsappFlowBodyMaxLength,
  whatsappFlowCtaMaxLength,
} from '@typebot.io/schemas/features/blocks/logic/triggerWhatsappFlow/constants'
import React, { useMemo } from 'react'
import { TriggerWhatsappFlowIcon } from './TriggerWhatsappFlowIcon'
import { FlowResponseMappingInputs } from './FlowResponseMappingInputs'

type Props = {
  options: TriggerWhatsappFlowBlock['options']
  onOptionsChange: (options: TriggerWhatsappFlowBlock['options']) => void
}

export const TriggerWhatsappFlowSettings = ({
  options,
  onOptionsChange,
}: Props) => {
  const { t } = useTranslate()
  const { workspace } = useWorkspace()
  const iconBg = useColorModeValue('purple.50', 'whiteAlpha.100')
  const iconColor = useColorModeValue('purple.500', 'purple.300')

  const { data: flowsData, isLoading: isLoadingFlows } =
    trpc.triggerWhatsappFlow.listWhatsappFlows.useQuery(
      { workspaceId: workspace?.id as string },
      { enabled: !!workspace?.id }
    )

  const { data: variablesData, isLoading: isLoadingVariables } =
    trpc.triggerWhatsappFlow.getWhatsappFlowVariables.useQuery(
      {
        workspaceId: workspace?.id as string,
        flowId: options?.flowId as string,
      },
      { enabled: !!workspace?.id && !!options?.flowId }
    )

  const { data: outputsData, isLoading: isLoadingOutputs } =
    trpc.triggerWhatsappFlow.getWhatsappFlowOutputs.useQuery(
      {
        workspaceId: workspace?.id as string,
        flowId: options?.flowId as string,
      },
      { enabled: !!workspace?.id && !!options?.flowId }
    )

  const ResponseMappingInputs = useMemo(
    () =>
      function Component(
        props: TableListItemProps<TriggerWhatsappFlowResponseMapping>
      ) {
        return (
          <FlowResponseMappingInputs
            {...props}
            fields={outputsData?.fields ?? []}
            isLoading={isLoadingOutputs}
          />
        )
      },
    [outputsData, isLoadingOutputs]
  )

  const updateFlow = (flowId: string | undefined, item?: { label: string }) => {
    if (flowId === options?.flowId) return
    // A new flow declares its own fields — mappings against the previous
    // flow's field names would silently point at nothing.
    onOptionsChange({
      ...options,
      flowId,
      flowName: item?.label,
      variableMapping: [],
      responseVariableMapping: [],
    })
  }

  const updateBody = (body: string) => onOptionsChange({ ...options, body })
  const updateCta = (cta: string) => onOptionsChange({ ...options, cta })
  const updateResponseVariableMapping = (
    responseVariableMapping: TriggerWhatsappFlowResponseMapping[]
  ) => onOptionsChange({ ...options, responseVariableMapping })

  const updateFieldMapping = (
    fieldName: string,
    fieldType: string,
    variable?: { id: string }
  ) => {
    const existingMapping = options?.variableMapping ?? []
    const withoutField = existingMapping.filter(
      (mapping) => mapping.fieldName !== fieldName
    )
    const newMapping: TriggerWhatsappFlowVariableMapping[] = variable
      ? [
          ...withoutField,
          {
            id:
              existingMapping.find((mapping) => mapping.fieldName === fieldName)
                ?.id ?? createId(),
            fieldName,
            fieldType,
            variableId: variable.id,
          },
        ]
      : withoutField
    onOptionsChange({ ...options, variableMapping: newMapping })
  }

  return (
    <Stack spacing={5}>
      <HStack spacing={3}>
        <Flex
          boxSize="32px"
          align="center"
          justify="center"
          rounded="md"
          bg={iconBg}
          color={iconColor}
          flexShrink={0}
        >
          <TriggerWhatsappFlowIcon boxSize="16px" />
        </Flex>
        <Text fontSize="lg" fontWeight="semibold">
          {t('blocks.logic.triggerWhatsappFlow.title')}
        </Text>
      </HStack>

      <FormControl as={Stack} spacing={2}>
        <FormLabel mb="0">
          {t('blocks.logic.triggerWhatsappFlow.flow.label')}
        </FormLabel>
        <Select
          selectedItem={options?.flowId}
          items={(flowsData?.flows ?? []).map((flow) => ({
            label: flow.name,
            value: flow.id,
          }))}
          onSelect={updateFlow}
          placeholder={
            isLoadingFlows
              ? t('blocks.logic.triggerWhatsappFlow.flow.loading')
              : t('blocks.logic.triggerWhatsappFlow.flow.placeholder')
          }
        />
        <FormHelperText mt="0">
          {t('blocks.logic.triggerWhatsappFlow.flow.helperText')}
        </FormHelperText>
      </FormControl>

      {options?.flowId && (
        <>
          <Textarea
            label={t('blocks.logic.triggerWhatsappFlow.body.label')}
            defaultValue={options?.body}
            placeholder={t('blocks.logic.triggerWhatsappFlow.body.placeholder')}
            maxLength={whatsappFlowBodyMaxLength}
            minH="120px"
            onChange={updateBody}
          />
          <TextInput
            label={t('blocks.logic.triggerWhatsappFlow.cta.label')}
            defaultValue={options?.cta}
            placeholder={t('blocks.logic.triggerWhatsappFlow.cta.placeholder')}
            maxLength={whatsappFlowCtaMaxLength}
            onChange={updateCta}
          />
          <Text fontSize="sm" color="gray.500">
            {t('blocks.logic.triggerWhatsappFlow.footer')}
          </Text>

          <Divider />

          <Text fontSize="sm" fontWeight="semibold">
            {t('blocks.logic.triggerWhatsappFlow.variables.label')}
          </Text>
          {isLoadingVariables && (
            <Text fontSize="sm" color="gray.500">
              {t('blocks.logic.triggerWhatsappFlow.variables.loading')}
            </Text>
          )}
          {!isLoadingVariables && variablesData?.fields.length === 0 && (
            <Text fontSize="sm" color="gray.500">
              {t('blocks.logic.triggerWhatsappFlow.variables.empty')}
            </Text>
          )}
          {variablesData?.fields.map((field) => (
            <Stack
              key={field.name}
              p="4"
              rounded="md"
              borderWidth="1px"
              spacing="2"
            >
              <Stack direction="row" align="center" spacing="2">
                <Text fontWeight="medium" fontSize="sm">
                  {field.name}
                </Text>
                <Tag size="sm">{field.type}</Tag>
              </Stack>
              <VariableSearchInput
                initialVariableId={
                  options?.variableMapping?.find(
                    (mapping) => mapping.fieldName === field.name
                  )?.variableId
                }
                onSelectVariable={(variable) =>
                  updateFieldMapping(field.name, field.type, variable)
                }
                placeholder={t(
                  'blocks.logic.triggerWhatsappFlow.variables.search'
                )}
              />
            </Stack>
          ))}

          <Divider />

          <Stack spacing={2}>
            <Text fontSize="sm" fontWeight="semibold">
              {t('blocks.logic.triggerWhatsappFlow.responses.label')}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {t('blocks.logic.triggerWhatsappFlow.responses.helperText')}
            </Text>
          </Stack>
          {/* Keyed by flow so switching flows remounts the list with the
              cleared mapping instead of keeping the previous flow's rows. */}
          <TableList<TriggerWhatsappFlowResponseMapping>
            key={options.flowId}
            initialItems={options?.responseVariableMapping}
            onItemsChange={updateResponseVariableMapping}
            addLabel={t('blocks.logic.triggerWhatsappFlow.responses.add')}
          >
            {(props) => <ResponseMappingInputs {...props} />}
          </TableList>
        </>
      )}
    </Stack>
  )
}
