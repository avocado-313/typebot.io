import { DropdownList } from '@/components/DropdownList'
import { TextInput } from '@/components/inputs'
import { Select } from '@/components/inputs/Select'
import { Stack } from '@chakra-ui/react'
import { useTranslate } from '@tolgee/react'
import { AssignChatBlock } from '@typebot.io/schemas'
import {
  assignChatType,
  assignChatTypeOptions,
} from '@typebot.io/schemas/features/blocks/logic/assignChat/constants'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { trpc } from '@/lib/trpc'

type Props = {
  options: AssignChatBlock['options']
  onOptionsChange: (options: AssignChatBlock['options']) => void
}

export const AssignChatSettings = ({ options, onOptionsChange }: Props) => {
  const { t } = useTranslate()
  const { workspace } = useWorkspace()

  const isSmartAssignment =
    options?.assignType === assignChatType.SMART_ASSIGNMENT

  const { data: rulesData, isLoading: isLoadingRules } =
    trpc.assignChat.listSmartAssignmentRules.useQuery(
      { workspaceId: workspace?.id as string },
      { enabled: !!workspace?.id && isSmartAssignment }
    )

  const handleEmailChange = (email: string) =>
    onOptionsChange({
      assignType: options?.assignType,
      email,
    })

  const updateAssignChatType = (type: assignChatType) =>
    onOptionsChange({
      assignType: type,
    })

  const updateRule = (ruleId: string | undefined, item?: { label: string }) =>
    onOptionsChange({
      assignType: options?.assignType,
      ruleId,
      ruleName: item?.label,
    })

  return (
    <Stack spacing={4}>
      <DropdownList
        label={t('blocks.logic.assignChat.assignType')}
        moreInfoTooltip={t('blocks.logic.assignChat.assignType.tooltip')}
        currentItem={options?.assignType}
        onItemSelect={(_, item) => item && updateAssignChatType(item.value)}
        items={assignChatTypeOptions.map((option: assignChatType) => ({
          value: option,
          label: t('blocks.logic.assignChat.' + option),
        }))}
      />
      {(options?.assignType === assignChatType.AGENT ||
        options?.assignType === assignChatType.TEAM) && (
        <TextInput
          label={t('blocks.logic.assignChat.assigneeEmailName')}
          defaultValue={options?.email}
          placeholder={t(
            'blocks.logic.assignChat.assigneeEmailName.placeholder'
          )}
          type="email"
          onChange={handleEmailChange}
        />
      )}
      {isSmartAssignment && (
        <Select
          selectedItem={options?.ruleId}
          items={(rulesData?.rules ?? []).map((rule) => ({
            label: rule.name,
            value: rule.id,
          }))}
          onSelect={updateRule}
          placeholder={
            isLoadingRules
              ? t('blocks.logic.assignChat.rule.loading')
              : t('blocks.logic.assignChat.rule.placeholder')
          }
        />
      )}
    </Stack>
  )
}
