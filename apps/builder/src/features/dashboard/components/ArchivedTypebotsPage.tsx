import { Seo } from '@/components/Seo'
import { useUser } from '@/features/account/hooks/useUser'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import {
  Stack,
  VStack,
  HStack,
  Wrap,
  WrapItem,
  Spinner,
  Text,
  Heading,
  Button,
  Tag,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { DashboardHeader } from './DashboardHeader'
import { EmojiOrImageIcon } from '@/components/EmojiOrImageIcon'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/useToast'

export const ArchivedTypebotsPage = () => {
  const router = useRouter()
  const { user } = useUser()
  const { workspace } = useWorkspace()
  const { showToast } = useToast()
  const [restoringId, setRestoringId] = useState<string>()

  const { data, isLoading, refetch } =
    trpc.typebot.listArchivedTypebots.useQuery(
      { workspaceId: workspace?.id },
      { enabled: !!workspace?.id && !!user?.isAdmin }
    )

  const { mutate: restoreTypebot } = trpc.typebot.restoreTypebot.useMutation({
    onError: (error) => {
      showToast({ description: error.message })
      setRestoringId(undefined)
    },
    onSuccess: () => {
      showToast({ status: 'success', title: 'Bot restored' })
      setRestoringId(undefined)
      refetch()
    },
  })

  const handleRestore = (typebotId: string) => {
    setRestoringId(typebotId)
    restoreTypebot({ typebotId })
  }

  if (user && !user.isAdmin)
    return (
      <Stack minH="100vh">
        <DashboardHeader />
        <VStack pt="10" spacing="4">
          <Text>You do not have access to this page.</Text>
          <Button onClick={() => router.push('/typebots')}>
            Back to dashboard
          </Button>
        </VStack>
      </Stack>
    )

  const typebots = data?.typebots ?? []

  return (
    <Stack minH="100vh">
      <Seo title="Archived bots" />
      <DashboardHeader />
      <Stack maxW="1000px" w="full" mx="auto" px="4" spacing="6" pt="4">
        <HStack justify="space-between">
          <Heading fontSize="2xl">Archived bots</Heading>
          <Button variant="outline" onClick={() => router.push('/typebots')}>
            Back to dashboard
          </Button>
        </HStack>
        <Text color="gray.500">
          Soft-deleted bots for {workspace?.name ?? 'this workspace'}. Restoring
          re-adds a bot to the dashboard (subject to the 5-bot limit); it does not
          re-publish it.
        </Text>

        {isLoading ? (
          <VStack pt="10">
            <Spinner />
          </VStack>
        ) : typebots.length === 0 ? (
          <Text pt="4">No archived bots in this workspace. 🎉</Text>
        ) : (
          <Wrap spacing="4" pb="10">
            {typebots.map((typebot) => (
              <WrapItem key={typebot.id}>
                <Stack
                  w="225px"
                  h="270px"
                  borderWidth="1px"
                  rounded="lg"
                  p="4"
                  justify="space-between"
                  align="center"
                >
                  <VStack spacing="3" pt="6">
                    <EmojiOrImageIcon icon={typebot.icon} boxSize="35px" />
                    <Text textAlign="center" noOfLines={3} fontWeight="medium">
                      {typebot.name}
                    </Text>
                    <Tag size="sm">
                      archived{' '}
                      {new Date(typebot.archivedAt).toLocaleDateString()}
                    </Tag>
                  </VStack>
                  <Button
                    colorScheme="orange"
                    w="full"
                    isLoading={restoringId === typebot.id}
                    isDisabled={!!restoringId && restoringId !== typebot.id}
                    onClick={() => handleRestore(typebot.id)}
                  >
                    Restore
                  </Button>
                </Stack>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Stack>
    </Stack>
  )
}
