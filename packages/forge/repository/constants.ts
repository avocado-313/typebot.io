// Do not edit this file manually
import { ForgedBlock } from './types'

export const forgedBlockIds = [
  'openai',
  'cal-com',
  'chat-node',
  'qr-code',
  'dify-ai',
  'mistral',
  'elevenlabs',
  'anthropic',
  'together-ai',
  'open-router',
  'nocodb',
  'assign-chat',
  'close-chat',
] as const satisfies ForgedBlock['type'][]
