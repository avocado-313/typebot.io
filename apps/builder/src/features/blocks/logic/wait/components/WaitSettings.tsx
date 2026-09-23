import { Stack } from '@chakra-ui/react'
import React from 'react'
import { TextInput } from '@/components/inputs'
import { WaitBlock } from '@typebot.io/schemas'

type Props = {
  options: WaitBlock['options']
  onOptionsChange: (options: WaitBlock['options']) => void
}

export const WaitSettings = ({ options, onOptionsChange }: Props) => {
  const handleSecondsChange = (secondsToWaitFor: string | undefined) => {
    onOptionsChange({ ...options, secondsToWaitFor })
  }

  return (
    <Stack spacing={4}>
      <TextInput
        label="Seconds to wait for:"
        defaultValue={options?.secondsToWaitFor}
        onChange={handleSecondsChange}
      />
    </Stack>
  )
}
