import React, { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { CheckIcon, UsersIcon } from '@/components/icons'

export type AssigneeItem = {
  id: string
  name: string
  // Secondary line: the agent's email or the team's member count.
  description?: string
  image?: string
}

type Props = {
  label: string
  searchPlaceholder: string
  emptyLabel: string
  items: AssigneeItem[]
  isLoading: boolean
  selectedId?: string
  variant: 'agent' | 'team'
  onSelect: (item: AssigneeItem) => void
}

export const AssigneePicker = ({
  label,
  searchPlaceholder,
  emptyLabel,
  items,
  isLoading,
  selectedId,
  variant,
  onSelect,
}: Props) => {
  const [search, setSearch] = useState('')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const hoverBgColor = useColorModeValue('gray.50', 'whiteAlpha.50')
  const selectedBgColor = useColorModeValue('purple.50', 'whiteAlpha.100')
  const iconBgColor = useColorModeValue('purple.50', 'whiteAlpha.100')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    )
  }, [items, search])

  return (
    <FormControl as={Stack} spacing={2}>
      <FormLabel mb="0">{label}</FormLabel>
      <Input
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        rounded="md"
        maxH="280px"
        overflowY="auto"
      >
        {isLoading ? (
          <Flex justify="center" py={4}>
            <Spinner size="sm" />
          </Flex>
        ) : filteredItems.length === 0 ? (
          <Text px={3} py={3} fontSize="sm" color={mutedColor}>
            {emptyLabel}
          </Text>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = item.id === selectedId
            return (
              <Flex
                key={item.id}
                as="button"
                type="button"
                w="full"
                align="center"
                gap={3}
                px={3}
                py={2}
                textAlign="left"
                borderTopWidth={index === 0 ? 0 : '1px'}
                borderColor={borderColor}
                bg={isSelected ? selectedBgColor : undefined}
                boxShadow={
                  isSelected
                    ? 'inset 0 0 0 1px var(--chakra-colors-purple-400)'
                    : undefined
                }
                _hover={{ bg: isSelected ? selectedBgColor : hoverBgColor }}
                aria-pressed={isSelected}
                onClick={() => onSelect(item)}
              >
                {variant === 'agent' ? (
                  <Avatar
                    size="sm"
                    name={item.name}
                    src={item.image}
                    bg={iconBgColor}
                    color="purple.400"
                  />
                ) : (
                  <Flex
                    boxSize="32px"
                    flexShrink={0}
                    align="center"
                    justify="center"
                    rounded="md"
                    bg={iconBgColor}
                  >
                    <UsersIcon color="purple.400" />
                  </Flex>
                )}
                <Stack spacing={0} flex={1} minW={0}>
                  <Text noOfLines={1}>{item.name}</Text>
                  {item.description && (
                    <Text fontSize="sm" color={mutedColor} noOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </Stack>
                {isSelected && <CheckIcon color="purple.400" />}
              </Flex>
            )
          })
        )}
      </Box>
    </FormControl>
  )
}
