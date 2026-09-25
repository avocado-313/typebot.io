import { TypingBubble } from '@/components'
import { isMobile } from '@/utils/isMobileSignal'
import { For, createSignal, onCleanup, onMount } from 'solid-js'
import { clsx } from 'clsx'
import { EmbedBubbleBlock } from '@typebot.io/schemas'
import { defaultEmbedBubbleContent } from '@typebot.io/schemas/features/blocks/bubbles/embed/constants'
import { isNotEmpty } from '@typebot.io/lib/utils'
import { FilePreview } from '@/features/blocks/inputs/fileUpload/components/FilePreview'
import { PlateElement } from '../../textBubble/components/plate/PlateBlock'

type Props = {
  content: EmbedBubbleBlock['content']
  onTransitionEnd?: (ref?: HTMLDivElement) => void
  onCompleted?: (data?: string) => void
}

let typingTimeout: NodeJS.Timeout

export const showAnimationDuration = 400

export const EmbedBubble = (props: Props) => {
  let ref: HTMLDivElement | undefined
  const [isTyping, setIsTyping] = createSignal(
    props.onTransitionEnd ? true : false
  )

  const handleMessage = (
    event: MessageEvent<{ name?: string; data?: string }>
  ) => {
    if (
      props.content?.waitForEvent?.isEnabled &&
      isNotEmpty(event.data.name) &&
      event.data.name === props.content?.waitForEvent.name
    ) {
      props.onCompleted?.(
        props.content.waitForEvent.saveDataInVariableId && event.data.data
          ? event.data.data
          : undefined
      )
      window.removeEventListener('message', handleMessage)
    }
  }

  onMount(() => {
    typingTimeout = setTimeout(() => {
      setIsTyping(false)
      if (props.content?.waitForEvent?.isEnabled) {
        window.addEventListener('message', handleMessage)
      }
      setTimeout(() => {
        props.onTransitionEnd?.(ref)
      }, showAnimationDuration)
    }, 2000)
  })

  onCleanup(() => {
    if (typingTimeout) clearTimeout(typingTimeout)
    window.removeEventListener('message', handleMessage)
  })

  const isDocument = isNotEmpty(props.content?.fileName)

  return (
    <div
      class={clsx(
        'flex flex-col',
        isDocument ? undefined : 'w-full',
        props.onTransitionEnd ? 'animate-fade-in' : undefined
      )}
      ref={ref}
    >
      <div class="flex w-full items-center">
        <div class="flex relative z-10 items-start typebot-host-bubble max-w-full w-full">
          <div
            class="flex items-center absolute px-4 py-2 bubble-typing z-10 "
            style={{
              width: isTyping() ? '64px' : '100%',
              height: isTyping() ? '32px' : '100%',
            }}
          >
            {isTyping() && <TypingBubble />}
          </div>
          {isDocument ? (
            <a
              href={props.content?.url}
              target="_blank"
              rel="noopener noreferrer"
              download={props.content?.fileName}
              class={clsx(
                'z-10',
                isTyping() ? (isMobile() ? 'h-8' : 'h-9') : 'p-4'
              )}
            >
              <div
                class={clsx(
                  'text-fade-in',
                  isTyping() ? 'opacity-0' : 'opacity-100'
                )}
              >
                <FilePreview file={{ name: props.content!.fileName! }} />
              </div>
            </a>
          ) : (
            <div
              class={clsx(
                'p-4 z-20 text-fade-in w-full',
                isTyping() ? 'opacity-0' : 'opacity-100 p-4'
              )}
              style={{
                height: isTyping()
                  ? isMobile()
                    ? '32px'
                    : '36px'
                  : `${
                      props.content?.height ?? defaultEmbedBubbleContent.height
                    }px`,
              }}
            >
              <iframe
                id="embed-bubble-content"
                src={props.content?.url}
                class={'w-full h-full '}
              />
            </div>
          )}
        </div>
      </div>
      {!isTyping() && (props.content?.caption?.length ?? 0) > 0 && (
        <div
          class={clsx(
            'flex relative z-10 items-start typebot-host-bubble max-w-full mt-1'
          )}
        >
          <div class="overflow-hidden text-fade-in mx-4 my-2 whitespace-pre-wrap slate-html-container relative text-ellipsis">
            <For each={props.content?.caption}>
              {(element) => <PlateElement element={element} />}
            </For>
          </div>
        </div>
      )}
    </div>
  )
}
