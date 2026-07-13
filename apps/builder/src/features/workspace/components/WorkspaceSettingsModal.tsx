import {
  Modal,
  ModalOverlay,
  ModalContent,
  Stack,
  Text,
  Button,
  Flex,
} from '@chakra-ui/react'
import { useState } from 'react'
import { SettingsIcon, HardDriveIcon } from '@/components/icons'
import { User } from '@typebot.io/prisma'
import { WorkspaceInApp } from '../WorkspaceProvider'
import packageJson from '../../../../../../package.json'
import { UserPreferencesForm } from '@/features/account/components/UserPreferencesForm'
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm'
import { useUser } from '@/features/account/hooks/useUser'
import { useTranslate } from '@tolgee/react'
import { useParentModal } from '@/features/graph/providers/ParentModalProvider'

type Props = {
  isOpen: boolean
  user: User
  workspace: WorkspaceInApp
  defaultTab?: SettingsTab
  onClose: () => void
}

type SettingsTab =
  | 'my-account'
  | 'user-settings'
  | 'workspace-settings'
  | 'members'
  | 'billing'
  | 'credentials'

export const WorkspaceSettingsModal = ({
  isOpen,
  user,
  defaultTab,
  onClose,
}: Props) => {
  const { t } = useTranslate()
  const { ref } = useParentModal()
  const { user: sessionUser } = useUser()
  const [selectedTab, setSelectedTab] = useState<SettingsTab>(
    defaultTab ?? 'user-settings'
  )

  const isAdmin = sessionUser?.isAdmin ?? false

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent minH="600px" flexDir="row" ref={ref}>
        <Stack
          spacing={8}
          w="180px"
          py="6"
          borderRightWidth={1}
          justifyContent="space-between"
        >
          <Stack spacing={8}>
            <Stack>
              <Text pl="4" color="gray.500">
                {user.email}
              </Text>

              <Button
                variant={selectedTab === 'user-settings' ? 'solid' : 'ghost'}
                leftIcon={<SettingsIcon />}
                size="sm"
                justifyContent="flex-start"
                pl="4"
                onClick={() => setSelectedTab('user-settings')}
              >
                {t('workspace.settings.modal.menu.preferences.label')}
              </Button>
            </Stack>
            {isAdmin && (
              <Stack>
                <Text pl="4" color="gray.500">
                  {t('workspace.settings.modal.menu.workspace.label')}
                </Text>
                <Button
                  variant={
                    selectedTab === 'workspace-settings' ? 'solid' : 'ghost'
                  }
                  leftIcon={<HardDriveIcon />}
                  size="sm"
                  justifyContent="flex-start"
                  pl="4"
                  onClick={() => setSelectedTab('workspace-settings')}
                >
                  {t('workspace.settings.modal.menu.settings.label')}
                </Button>
              </Stack>
            )}
          </Stack>

          <Flex justify="center" pt="10">
            <Text color="gray.500" fontSize="xs">
              {t('workspace.settings.modal.menu.version.label', {
                version: packageJson.version,
              })}
            </Text>
          </Flex>
        </Stack>

        {isOpen && (
          <Flex flex="1" p="10">
            {selectedTab === 'workspace-settings' && isAdmin ? (
              <WorkspaceSettingsForm onClose={onClose} />
            ) : (
              <UserPreferencesForm />
            )}
          </Flex>
        )}
      </ModalContent>
    </Modal>
  )
}
