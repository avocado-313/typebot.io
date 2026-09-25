import { useTranslate } from '@tolgee/react'
import { ChoiceInputBlock, Variable } from '@typebot.io/schemas'
import {
  headerType,
  interactiveButtonType,
  interactiveLimits,
  interactiveListHeaderTypes,
  interactiveReplyHeaderTypes,
} from '@typebot.io/schemas/features/blocks/inputs/choice/constants'
import {
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { DropdownList } from '@/components/DropdownList'
import { TextInput } from '@/components/inputs'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { ListIcon } from '@/components/icons'
import React, { useState } from 'react'
import { ButtonsInputIcon } from './ButtonsIcon'
import { InteractiveBodyInput } from './InteractiveBodyInput'

type Props = {
  type: interactiveButtonType
  options?: ChoiceInputBlock['options']
  onOptionsChange: (options: ChoiceInputBlock['options']) => void
}

export const ButtonsBlockInteractiveSettings = ({
  type,
  options,
  onOptionsChange,
}: Props) => {
  const { t } = useTranslate()
  const iconBg = useColorModeValue('purple.50', 'whiteAlpha.100')
  const iconColor = useColorModeValue('purple.500', 'purple.300')
  const [headerError, setHeaderError] = useState<string>('')
  const [bodyError, setBodyError] = useState<string>('')
  const isList = type === interactiveButtonType.LIST
  const currentHeaderType =
    options?.interactiveData?.headerType ?? headerType.NONE

  const validateHeader = (value: string) => {
    if (currentHeaderType === headerType.TEXT) {
      setHeaderError(
        value.trim()
          ? ''
          : t('blocks.inputs.settings.interactive.error.required')
      )
      return
    }
    try {
      new URL(value)
      setHeaderError('')
    } catch {
      setHeaderError(t('blocks.inputs.settings.interactive.error.invalid'))
    }
  }

  const updateInteractiveData = (
    interactiveData: NonNullable<ChoiceInputBlock['options']>['interactiveData']
  ) =>
    onOptionsChange({
      ...options,
      interactiveData: { ...options?.interactiveData, ...interactiveData },
    })

  const updateHeaderType = (newHeaderType: headerType) => {
    setHeaderError('')
    updateInteractiveData({ headerType: newHeaderType })
  }
  const updateHeader = (header: string) => {
    updateInteractiveData({ header })
    validateHeader(header)
  }
  const updateBody = (body: string) => {
    updateInteractiveData({ body })
    setBodyError(
      body.trim() ? '' : t('blocks.inputs.settings.interactive.error.required')
    )
  }
  const updateFooter = (footer: string) => updateInteractiveData({ footer })
  const updateMenuTitle = (menuTitle: string) =>
    updateInteractiveData({ menuTitle })
  const updateSaveVariable = (variable?: Variable) =>
    onOptionsChange({ ...options, variableId: variable?.id })
  const updateDynamicDataVariable = (variable?: Variable) =>
    onOptionsChange({ ...options, dynamicVariableId: variable?.id })

  const headerTypeItems = (
    isList ? interactiveListHeaderTypes : interactiveReplyHeaderTypes
  ).map((value: headerType) => ({
    value,
    label: t('blocks.inputs.settings.interactive.headerType.' + value),
  }))

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
          {isList ? (
            <ListIcon boxSize="16px" />
          ) : (
            <ButtonsInputIcon boxSize="16px" color={iconColor} />
          )}
        </Flex>
        <Text fontSize="lg" fontWeight="semibold">
          {t(`blocks.inputs.settings.interactive.title.${type}`)}
        </Text>
      </HStack>

      {isList && (
        <TextInput
          label={t('blocks.inputs.settings.interactive.menuTitle.label')}
          placeholder={t(
            'blocks.inputs.settings.interactive.menuTitle.placeholder'
          )}
          defaultValue={options?.interactiveData?.menuTitle}
          maxLength={interactiveLimits.listButtonTextMaxLength}
          withVariableButton={false}
          onChange={updateMenuTitle}
        />
      )}

      <DropdownList
        label={t('blocks.inputs.settings.interactive.headerType.label')}
        placeholder={t(
          'blocks.inputs.settings.interactive.headerType.placeholder'
        )}
        currentItem={currentHeaderType}
        onItemSelect={(_, item) => item && updateHeaderType(item.value)}
        items={headerTypeItems}
      />

      {currentHeaderType !== headerType.NONE && (
        <TextInput
          // Remount so the field resets when switching text <-> media.
          key={currentHeaderType === headerType.TEXT ? 'text' : 'url'}
          label={t('blocks.inputs.settings.interactive.header.label')}
          placeholder={t(
            'blocks.inputs.settings.interactive.header.placeholder'
          )}
          defaultValue={options?.interactiveData?.header}
          type={currentHeaderType === headerType.TEXT ? 'text' : 'url'}
          maxLength={
            currentHeaderType === headerType.TEXT
              ? interactiveLimits.textHeaderMaxLength
              : undefined
          }
          onChange={updateHeader}
          helperText={
            headerError ||
            (currentHeaderType === headerType.TEXT
              ? undefined
              : t('blocks.inputs.settings.interactive.header.helperText.url'))
          }
        />
      )}

      <InteractiveBodyInput
        label={t('blocks.inputs.settings.interactive.body.label')}
        placeholder={t('blocks.inputs.settings.interactive.body.placeholder')}
        defaultValue={options?.interactiveData?.body}
        maxLength={interactiveLimits.bodyMaxLength}
        errorText={bodyError}
        onChange={updateBody}
      />

      <TextInput
        label={t('blocks.inputs.settings.interactive.footer.label')}
        placeholder={t('blocks.inputs.settings.interactive.footer.placeholder')}
        defaultValue={options?.interactiveData?.footer}
        maxLength={interactiveLimits.footerMaxLength}
        helperText={t('blocks.inputs.settings.interactive.footer.helperText')}
        onChange={updateFooter}
      />

      <Text fontSize="sm" color="gray.500">
        {t(`blocks.inputs.settings.interactive.limits.${type}`, {
          maxItems: interactiveLimits[type].maxItems,
          maxLength: interactiveLimits[type].itemLabelMaxLength,
        })}
      </Text>

      <FormControl as={Stack} spacing={2}>
        <FormLabel mb="0">
          {t('blocks.inputs.settings.interactive.dynamicData.label')}
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.dynamicVariableId}
          onSelectVariable={updateDynamicDataVariable}
        />
      </FormControl>

      <FormControl as={Stack} spacing={2}>
        <FormLabel mb="0">
          {t('blocks.inputs.settings.interactive.saveAnswer.label')}
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.variableId}
          onSelectVariable={updateSaveVariable}
        />
      </FormControl>
    </Stack>
  )
}
