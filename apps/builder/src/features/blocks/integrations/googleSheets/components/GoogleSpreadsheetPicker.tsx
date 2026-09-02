import { FileIcon } from '@/components/icons'
import { trpc } from '@/lib/trpc'
import { Button, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { env } from '@typebot.io/env'
import React, { useEffect, useState } from 'react'
import { GoogleSheetsLogo } from './GoogleSheetsLogo'
import { isDefined } from '@typebot.io/lib'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any

type Props = {
  spreadsheetId?: string
  credentialsId: string
  workspaceId: string
  onSpreadsheetIdSelect: (spreadsheetId: string) => void
}

export const GoogleSpreadsheetPicker = ({
  spreadsheetId,
  workspaceId,
  credentialsId,
  onSpreadsheetIdSelect,
}: Props) => {
  const [isPickerInitialized, setIsPickerInitialized] = useState(false)

  const { data } = trpc.sheets.getAccessToken.useQuery({
    workspaceId,
    credentialsId,
  })
  const { data: spreadsheetData, status } =
    trpc.sheets.getSpreadsheetName.useQuery(
      {
        workspaceId,
        credentialsId,
        spreadsheetId: spreadsheetId as string,
      },
      { enabled: !!spreadsheetId }
    )

  useEffect(() => {
    loadScript('gapi', 'https://apis.google.com/js/api.js', () => {
      window.gapi.load('picker', () => {
        setIsPickerInitialized(true)
      })
    })
  }, [])

  const loadScript = (
    id: string,
    src: string,
    callback: { (): void; (): void; (): void }
  ) => {
    const existingScript = document.getElementById(id)
    if (existingScript) {
      callback()
      return
    }
    const script = document.createElement('script')
    script.type = 'text/javascript'

    script.onload = function () {
      callback()
    }

    script.src = src
    document.head.appendChild(script)
  }

  /**
   * The origin the Picker must declare to Google.
   *
   * Google validates the Picker against the origin of the TOP-LEVEL page, not
   * the frame that opens it. Left unset, gapi infers our own frame's origin —
   * fine when the builder is the top-level page, but wrong when it is embedded
   * (the app shell at app.azeer.com iframes the builder). The handshake then
   * fails and the Picker renders as an empty dialog with no error.
   *
   * window.top.location.origin would throw across origins, so the top-level
   * origin is read from ancestorOrigins (Chromium/WebKit; outermost entry is
   * last) and falls back to the referrer, which is the embedding page's URL
   * (Firefox has no ancestorOrigins).
   *
   * Whichever origin this returns must also be allowed on the browser API key
   * used by setDeveloperKey, or Google rejects it as an invalid developer key.
   */
  const getPickerOrigin = () => {
    if (window.self === window.top) return window.location.origin

    const ancestors = window.location.ancestorOrigins
    if (ancestors && ancestors.length > 0)
      return ancestors[ancestors.length - 1]

    if (document.referrer)
      try {
        return new URL(document.referrer).origin
      } catch {
        // Malformed referrer — fall through to our own origin.
      }

    return window.location.origin
  }

  const createPicker = () => {
    if (!data) return
    if (!isPickerInitialized) throw new Error('Google Picker not inited')

    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.SPREADSHEETS)
      .setOrigin(getPickerOrigin())
      .setOAuthToken(data.accessToken)
      .setDeveloperKey(env.NEXT_PUBLIC_GOOGLE_API_KEY)
      .setCallback(pickerCallback)
      .build()

    picker.setVisible(true)
  }

  const pickerCallback = (data: { action: string; docs: { id: string }[] }) => {
    if (data.action !== 'picked') return
    const spreadsheetId = data.docs[0]?.id
    if (!spreadsheetId) return
    onSpreadsheetIdSelect(spreadsheetId)
  }

  if (spreadsheetData && spreadsheetData.name !== '')
    return (
      <Flex justifyContent="space-between">
        <HStack spacing={2}>
          <GoogleSheetsLogo />
          <Text fontWeight="semibold">{spreadsheetData.name}</Text>
        </HStack>
        <IconButton
          size="sm"
          icon={<FileIcon />}
          onClick={createPicker}
          isLoading={!isPickerInitialized}
          aria-label={'Pick another spreadsheet'}
        />
      </Flex>
    )
  return (
    <Button
      onClick={createPicker}
      isLoading={
        !isPickerInitialized ||
        (isDefined(spreadsheetId) && status === 'loading')
      }
    >
      Pick a spreadsheet
    </Button>
  )
}
