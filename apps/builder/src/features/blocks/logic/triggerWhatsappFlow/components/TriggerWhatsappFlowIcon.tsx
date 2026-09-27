import { featherIconsBaseProps } from '@/components/icons'
import { Icon, IconProps } from '@chakra-ui/react'
import React from 'react'

export const TriggerWhatsappFlowIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" {...featherIconsBaseProps} {...props}>
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </Icon>
)
