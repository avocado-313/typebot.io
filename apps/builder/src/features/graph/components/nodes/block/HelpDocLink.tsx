import { BuoyIcon } from '@/components/icons'
import { Button, ButtonProps, Link } from '@chakra-ui/react'
import { useTranslate } from '@tolgee/react'

type Props = {
  helpDocUrl: string
} & Omit<ButtonProps, 'children'>

export const HelpDocLink = ({ helpDocUrl, ...props }: Props) => {
  const { t } = useTranslate()
  return (
    <Button
      as={Link}
      leftIcon={<BuoyIcon />}
      size="xs"
      variant="ghost"
      href={helpDocUrl}
      isExternal
      {...props}
    >
      {t('howToUse')}
    </Button>
  )
}
