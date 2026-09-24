import { TextInput } from '@/components/inputs'
import { MoreInfoTooltip } from '@/components/MoreInfoTooltip'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { FormControl, FormLabel, Stack } from '@chakra-ui/react'
import { ChoiceInputBlock, Variable } from '@typebot.io/schemas'
import React from 'react'
import { SwitchWithRelatedSettings } from '@/components/SwitchWithRelatedSettings'
import {
  defaultChoiceInputOptions,
  interactiveButtonType,
} from '@typebot.io/schemas/features/blocks/inputs/choice/constants'
import { useTranslate } from '@tolgee/react'
import { ButtonsBlockInteractiveSettings } from './ButtonsBlockInteractiveSettings'

type Props = {
  options?: ChoiceInputBlock['options']
  onOptionsChange: (options: ChoiceInputBlock['options']) => void
}

export const ButtonsBlockSettings = ({ options, onOptionsChange }: Props) => {
  const { t } = useTranslate()
  const setOptions = (partialOptions: ChoiceInputBlock['options']) =>
    onOptionsChange({
      ...partialOptions,
      isInteractive: true,
      interactiveButtonType: interactiveButtonType.REPLY,
    })
  const updateIsMultiple = (isMultipleChoice: boolean) =>
    setOptions({ ...options, isMultipleChoice })
  const updateIsSearchable = (isSearchable: boolean) =>
    setOptions({ ...options, isSearchable })
  const updateButtonLabel = (buttonLabel: string) =>
    setOptions({ ...options, buttonLabel })
  const updateSearchInputPlaceholder = (searchInputPlaceholder: string) =>
    setOptions({ ...options, searchInputPlaceholder })
  const updateSaveVariable = (variable?: Variable) =>
    setOptions({ ...options, variableId: variable?.id })
  const updateDynamicDataVariable = (variable?: Variable) =>
    setOptions({ ...options, dynamicVariableId: variable?.id })

  return (
    <Stack spacing={4}>
      <SwitchWithRelatedSettings
        label={t('blocks.inputs.settings.multipleChoice.label')}
        initialValue={
          options?.isMultipleChoice ??
          defaultChoiceInputOptions.isMultipleChoice
        }
        onCheckChange={updateIsMultiple}
      >
        <TextInput
          label={t('blocks.inputs.settings.submitButton.label')}
          defaultValue={
            options?.buttonLabel ?? t('blocks.inputs.settings.buttonText.label')
          }
          onChange={updateButtonLabel}
        />
      </SwitchWithRelatedSettings>
      <SwitchWithRelatedSettings
        label={t('blocks.inputs.settings.isSearchable.label')}
        initialValue={
          options?.isSearchable ?? defaultChoiceInputOptions.isSearchable
        }
        onCheckChange={updateIsSearchable}
      >
        <TextInput
          label={t('blocks.inputs.settings.input.placeholder.label')}
          defaultValue={
            options?.searchInputPlaceholder ??
            t('blocks.inputs.settings.input.filterOptions.label')
          }
          onChange={updateSearchInputPlaceholder}
        />
      </SwitchWithRelatedSettings>
      <ButtonsBlockInteractiveSettings
        options={options}
        onOptionsChange={setOptions}
      />
      <FormControl>
        <FormLabel>
          {t('blocks.inputs.button.settings.dynamicData.label')}{' '}
          <MoreInfoTooltip>
            {t('blocks.inputs.button.settings.dynamicData.infoText.label')}
          </MoreInfoTooltip>
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.dynamicVariableId}
          onSelectVariable={updateDynamicDataVariable}
        />
      </FormControl>
      <Stack>
        <FormLabel mb="0" htmlFor="variable">
          {t('blocks.inputs.settings.saveAnswer.label')}
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.variableId}
          onSelectVariable={updateSaveVariable}
        />
      </Stack>
    </Stack>
  )
}
