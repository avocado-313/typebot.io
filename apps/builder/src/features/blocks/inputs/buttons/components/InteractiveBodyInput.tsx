import { VariablesButton } from '@/features/variables/components/VariablesButton'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Stack,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react'
import { Variable } from '@typebot.io/schemas'
import { env } from '@typebot.io/env'
import React, { useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

// WhatsApp formatting markers. WhatsApp has no underline, so the third
// action is strikethrough.
const formats = [
  { marker: '*', label: 'B', ariaLabel: 'Bold', style: { fontWeight: 'bold' } },
  {
    marker: '_',
    label: 'I',
    ariaLabel: 'Italic',
    style: { fontStyle: 'italic' },
  },
  {
    marker: '~',
    label: 'S',
    ariaLabel: 'Strikethrough',
    style: { textDecoration: 'line-through' },
  },
] as const

type Props = {
  label: string
  placeholder?: string
  defaultValue?: string
  maxLength: number
  errorText?: string
  onChange: (value: string) => void
}

export const InteractiveBodyInput = ({
  label,
  placeholder,
  defaultValue,
  maxLength,
  errorText,
  onChange: _onChange,
}: Props) => {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState(defaultValue ?? '')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const toolbarColor = useColorModeValue('gray.600', 'gray.300')
  const onChange = useDebouncedCallback(
    _onChange,
    env.NEXT_PUBLIC_E2E_TEST ? 0 : 1000
  )

  useEffect(
    () => () => {
      onChange.flush()
    },
    [onChange]
  )

  const changeValue = (newValue: string, caret?: number) => {
    const truncated = newValue.slice(0, maxLength)
    setValue(truncated)
    onChange(truncated)
    if (caret === undefined) return
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(caret, caret)
    })
  }

  const getSelection = () => ({
    start: inputRef.current?.selectionStart ?? value.length,
    end: inputRef.current?.selectionEnd ?? value.length,
  })

  const wrapSelection = (marker: string) => {
    const { start, end } = getSelection()
    const selected = value.slice(start, end)
    changeValue(
      value.slice(0, start) + marker + selected + marker + value.slice(end),
      end + marker.length * (selected ? 2 : 1)
    )
  }

  const insertVariable = (variable: Pick<Variable, 'name'>) => {
    const { start, end } = getSelection()
    const token = `{{${variable.name}}}`
    changeValue(
      value.slice(0, start) + token + value.slice(end),
      start + token.length
    )
  }

  return (
    <FormControl as={Stack} spacing={2}>
      <FormLabel mb="0">{label}</FormLabel>
      <Box borderWidth="1px" borderColor={borderColor} rounded="md">
        <HStack
          spacing={1}
          p={1.5}
          borderBottomWidth="1px"
          borderColor={borderColor}
        >
          <VariablesButton size="sm" onSelectVariable={insertVariable} />
          {formats.map((format) => (
            <Button
              key={format.marker}
              aria-label={format.ariaLabel}
              size="sm"
              variant="ghost"
              color={toolbarColor}
              sx={format.style}
              // Keep the textarea selection while clicking the toolbar.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => wrapSelection(format.marker)}
            >
              {format.label}
            </Button>
          ))}
        </HStack>
        <Textarea
          ref={inputRef}
          variant="unstyled"
          px={3}
          py={2}
          minH="160px"
          resize="vertical"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => changeValue(e.target.value)}
        />
      </Box>
      <FormHelperText mt="0" color={errorText ? 'red.400' : undefined}>
        {errorText && <>{errorText} · </>}
        {value.length.toLocaleString()} / {maxLength.toLocaleString()}
      </FormHelperText>
    </FormControl>
  )
}
