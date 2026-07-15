import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  Input,
  Select,
  FormControl,
  FormLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  HStack,
} from '@chakra-ui/react'
import React, { FormEvent, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { trpc } from '@/lib/trpc'

type Mode = 'existing' | 'new'

type Props = {
  sourceTypebotId: string
  sourceTypebotName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const LinkBotToBusinessModal = ({
  sourceTypebotId,
  sourceTypebotName,
  isOpen,
  onClose,
  onSuccess,
}: Props) => {
  const { showToast } = useToast()
  const [mode, setMode] = useState<Mode>('existing')
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [newName, setNewName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')

  const { data: workspacesData, isLoading: isLoadingWorkspaces } =
    trpc.workspace.listWorkspaces.useQuery(undefined, { enabled: isOpen })
  const workspaces = workspacesData?.workspaces ?? []

  const { mutate, isLoading } = trpc.typebot.linkBotToBusiness.useMutation({
    onError: (error) => {
      showToast({ description: error.message })
    },
    onSuccess: (data) => {
      if (data.hubLinked)
        showToast({
          status: 'success',
          title: 'Bot linked to business',
          description: `Published and pointed the business's channel at the new bot in workspace ${
            data.workspaceId
          }${data.workspaceCreated ? ' (created)' : ''}.`,
        })
      else
        showToast({
          status: 'error',
          title: 'Bot duplicated & published, but Hub link failed',
          description: `The bot exists in workspace ${
            data.workspaceId
          }, but the Hub channel was not updated: ${
            data.hubError ?? 'unknown error'
          }. You can retry the link.`,
        })
      resetAndClose()
      onSuccess?.()
    },
  })

  const resetAndClose = () => {
    setTargetWorkspaceId('')
    setNewWorkspaceName('')
    setBusinessId('')
    setNewName('')
    setMemberEmail('')
    setMode('existing')
    onClose()
  }

  const canSubmit =
    businessId.trim().length > 0 &&
    (mode === 'existing'
      ? targetWorkspaceId.trim().length > 0
      : newWorkspaceName.trim().length > 0)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    mutate({
      sourceTypebotId,
      businessId: businessId.trim(),
      targetWorkspaceId:
        mode === 'existing' ? targetWorkspaceId.trim() : undefined,
      newWorkspaceName: mode === 'new' ? newWorkspaceName.trim() : undefined,
      newName: newName.trim() || undefined,
      memberEmail:
        mode === 'new' && memberEmail.trim() ? memberEmail.trim() : undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Link &quot;{sourceTypebotName}&quot; to a business
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody as="form" onSubmit={submit}>
          <Stack spacing="4">
            <RadioGroup
              value={mode}
              onChange={(value) => setMode(value as Mode)}
            >
              <HStack spacing="6">
                <Radio value="existing">Existing workspace</Radio>
                <Radio value="new">Create new workspace</Radio>
              </HStack>
            </RadioGroup>

            {mode === 'existing' ? (
              <FormControl isRequired>
                <FormLabel>Target workspace</FormLabel>
                <Select
                  value={targetWorkspaceId}
                  onChange={(e) => setTargetWorkspaceId(e.target.value)}
                  placeholder={
                    isLoadingWorkspaces
                      ? 'Loading workspaces…'
                      : 'Select a workspace'
                  }
                  isDisabled={isLoadingWorkspaces}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} — {workspace.id}
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  The bot is duplicated into this workspace.
                </FormHelperText>
              </FormControl>
            ) : (
              <>
                <FormControl isRequired>
                  <FormLabel>New workspace name</FormLabel>
                  <Input
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Member Email (Optional)</FormLabel>
                  <Input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                  <FormHelperText>
                    Email of the user who should be a member of this workspace.
                    If the user doesn&apos;t exist, they will be created.
                  </FormHelperText>
                </FormControl>
              </>
            )}

            <FormControl isRequired>
              <FormLabel>Business ID</FormLabel>
              <Input
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Hub platform business id (uuid)"
              />
              <FormHelperText>
                The business whose channel will be pointed at the new bot.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>New bot name (optional)</FormLabel>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={sourceTypebotName}
              />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr="3" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            colorScheme="orange"
            isDisabled={!canSubmit}
            isLoading={isLoading}
            onClick={submit}
          >
            Link
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
