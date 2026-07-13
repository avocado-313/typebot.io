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
  FormControl,
  FormLabel,
  FormHelperText,
} from '@chakra-ui/react'
import React, { FormEvent, useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (businessId: string, memberEmail?: string) => Promise<void>
}

export const CreateWorkspaceModal = ({ isOpen, onClose, onSubmit }: Props) => {
  const [businessId, setBusinessId] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const canSubmit = businessId.trim().length > 0

  const resetAndClose = () => {
    setBusinessId('')
    setMemberEmail('')
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || isCreating) return
    setIsCreating(true)
    try {
      await onSubmit(
        businessId.trim(),
        memberEmail.trim() || undefined
      )
      resetAndClose()
    } catch (error) {
      // Error is already shown via toast by the mutation
      console.error('Failed to create workspace:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create workspace</ModalHeader>
        <ModalCloseButton />
        <ModalBody as="form" onSubmit={submit}>
          <Stack spacing="4">
            <FormControl isRequired>
              <FormLabel>Business ID</FormLabel>
              <Input
                autoFocus
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Hub platform business id"
              />
              <FormHelperText>
                Bots created in this workspace inherit this business id.
              </FormHelperText>
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
                Email of the user who should be a member of this workspace. If the user doesn&apos;t exist, they will be created.
              </FormHelperText>
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
            isLoading={isCreating}
            onClick={submit}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
