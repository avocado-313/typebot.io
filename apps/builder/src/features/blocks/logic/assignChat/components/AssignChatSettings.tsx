import { DropdownList } from '@/components/DropdownList'
import { Select } from '@/components/inputs/Select'
import { FormControl, FormLabel, Stack, Text } from '@chakra-ui/react'
import { useTranslate } from '@tolgee/react'
import { AssignChatBlock } from '@typebot.io/schemas'
import {
  assignChatType,
  selectableAssignChatTypeOptions,
} from '@typebot.io/schemas/features/blocks/logic/assignChat/constants'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { trpc } from '@/lib/trpc'
import { AssigneeItem, AssigneePicker } from './AssigneePicker'

type Props = {
  options: AssignChatBlock['options']
  onOptionsChange: (options: AssignChatBlock['options']) => void
}

export const AssignChatSettings = ({ options, onOptionsChange }: Props) => {
  const { t } = useTranslate()
  const { workspace } = useWorkspace()
  const workspaceId = workspace?.id as string

  const assignType = options?.assignType
  const isAgent = assignType === assignChatType.AGENT
  const isTeam = assignType === assignChatType.TEAM
  const isSmartAssignment = assignType === assignChatType.SMART_ASSIGNMENT
  const isLegacyHandover = assignType === assignChatType.HANDOVER

  const { data: agentsData, isLoading: isLoadingAgents } =
    trpc.assignChat.listAgents.useQuery(
      { workspaceId },
      { enabled: !!workspace?.id && isAgent }
    )

  const { data: teamsData, isLoading: isLoadingTeams } =
    trpc.assignChat.listTeams.useQuery(
      { workspaceId },
      { enabled: !!workspace?.id && isTeam }
    )

  const { data: rulesData, isLoading: isLoadingRules } =
    trpc.assignChat.listSmartAssignmentRules.useQuery(
      { workspaceId },
      { enabled: !!workspace?.id && isSmartAssignment }
    )

  const agents = agentsData?.agents ?? []
  const teams = teamsData?.teams ?? []

  const agentItems: AssigneeItem[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.email,
    image: agent.image,
  }))

  const teamItems: AssigneeItem[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    description: t('blocks.logic.assignChat.team.membersCount', {
      count: team.membersCount,
    }),
  }))

  // Blocks created before the picker only stored an email: match it so the
  // current assignee still shows as selected.
  const findSelectedId = (list: { id: string; email?: string }[]) => {
    if (options?.assigneeId) return options.assigneeId
    const email = options?.email?.trim().toLowerCase()
    if (!email) return undefined
    return list.find((item) => item.email?.toLowerCase() === email)?.id
  }

  const updateAssignChatType = (type: assignChatType) =>
    onOptionsChange({
      assignType: type,
    })

  const selectAgent = (item: AssigneeItem) => {
    const agent = agents.find((a) => a.id === item.id)
    onOptionsChange({
      assignType: assignChatType.AGENT,
      assigneeId: item.id,
      assigneeName: item.name,
      email: agent?.email,
    })
  }

  const selectTeam = (item: AssigneeItem) => {
    const team = teams.find((t) => t.id === item.id)
    onOptionsChange({
      assignType: assignChatType.TEAM,
      assigneeId: item.id,
      assigneeName: item.name,
      email: team?.email,
    })
  }

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
        currentItem={isLegacyHandover ? undefined : assignType}
        placeholder={t('blocks.logic.assignChat.assignType.placeholder')}
        onItemSelect={(_, item) => item && updateAssignChatType(item.value)}
        items={selectableAssignChatTypeOptions.map(
          (option: assignChatType) => ({
            value: option,
            label: t('blocks.logic.assignChat.' + option),
          })
        )}
      />
      {isLegacyHandover && (
        <Text fontSize="sm" color="orange.400">
          {t('blocks.logic.assignChat.handover.deprecated')}
        </Text>
      )}
      {isAgent && (
        <AssigneePicker
          variant="agent"
          label={t('blocks.logic.assignChat.agent')}
          searchPlaceholder={t('blocks.logic.assignChat.agent.search')}
          emptyLabel={t('blocks.logic.assignChat.agent.empty')}
          items={agentItems}
          isLoading={isLoadingAgents}
          selectedId={findSelectedId(agents)}
          onSelect={selectAgent}
        />
      )}
      {isTeam && (
        <AssigneePicker
          variant="team"
          label={t('blocks.logic.assignChat.team')}
          searchPlaceholder={t('blocks.logic.assignChat.team.search')}
          emptyLabel={t('blocks.logic.assignChat.team.empty')}
          items={teamItems}
          isLoading={isLoadingTeams}
          selectedId={findSelectedId(teams)}
          onSelect={selectTeam}
        />
      )}
      {isSmartAssignment && (
        <FormControl as={Stack} spacing={2}>
          <FormLabel mb="0">
            {t('blocks.logic.assignChat.rule.label')}
          </FormLabel>
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
        </FormControl>
      )}
      <Text fontSize="sm" color="gray.500">
        {t('blocks.logic.assignChat.footer')}
      </Text>
    </Stack>
  )
}
