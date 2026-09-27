import { Select } from '@/components/inputs/Select'
import { TableListItemProps } from '@/components/TableList'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { FormControl, FormLabel, Stack } from '@chakra-ui/react'
import { useTranslate } from '@tolgee/react'
import { Variable } from '@typebot.io/schemas'
import { TriggerWhatsappFlowResponseMapping } from '@typebot.io/schemas/features/blocks/logic/triggerWhatsappFlow/schema'
import React from 'react'
import { formatFlowFieldName } from '../helpers/formatFlowFieldName'

export type FlowOutputField = {
  name: string
  type: string
  screen?: string
}

export const FlowResponseMappingInputs = ({
  item,
  onItemChange,
  fields,
  isLoading,
}: TableListItemProps<TriggerWhatsappFlowResponseMapping> & {
  fields: FlowOutputField[]
  isLoading: boolean
}) => {
  const { t } = useTranslate()

  const items = fields.map((field) => ({
    label: formatFlowFieldName(field.name),
    value: field.name,
  }))
  // A field saved before the flow was edited must stay visible so the mapping
  // can be seen and changed, rather than silently looking empty.
  if (item.fieldName && !fields.some((field) => field.name === item.fieldName))
    items.push({
      label: formatFlowFieldName(item.fieldName),
      value: item.fieldName,
    })

  const updateFieldName = (fieldName: string | undefined) =>
    onItemChange({ ...item, fieldName })
  const updateVariable = (variable?: Variable) =>
    onItemChange({ ...item, variableId: variable?.id })

  return (
    <Stack p="4" rounded="md" flex="1" borderWidth="1px">
      <FormControl>
        <FormLabel>
          {t('blocks.logic.triggerWhatsappFlow.responses.field.label')}
        </FormLabel>
        <Select
          selectedItem={item.fieldName}
          items={items}
          onSelect={updateFieldName}
          placeholder={
            isLoading
              ? t('blocks.logic.triggerWhatsappFlow.responses.field.loading')
              : fields.length === 0
              ? t('blocks.logic.triggerWhatsappFlow.responses.field.empty')
              : t(
                  'blocks.logic.triggerWhatsappFlow.responses.field.placeholder'
                )
          }
        />
      </FormControl>
      <FormControl>
        <FormLabel>
          {t('blocks.logic.triggerWhatsappFlow.responses.variable.label')}
        </FormLabel>
        <VariableSearchInput
          onSelectVariable={updateVariable}
          placeholder={t('blocks.logic.triggerWhatsappFlow.variables.search')}
          initialVariableId={item.variableId}
        />
      </FormControl>
    </Stack>
  )
}
