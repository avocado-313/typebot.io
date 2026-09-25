import {
  AspectRatio,
  Box,
  Heading,
  Image,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import React from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

type Props = {
  body: string
}

const Callout = ({
  colorScheme,
  children,
}: {
  colorScheme: string
  children: React.ReactNode
}) => (
  <Box
    borderLeftWidth="4px"
    borderLeftColor={`${colorScheme}.400`}
    bgColor={useColorModeValue(`${colorScheme}.50`, `${colorScheme}.900`)}
    rounded="md"
    px={4}
    py={3}
    my={4}
  >
    {children}
  </Box>
)

const VideoEmbed = ({ src }: { src: string }) => (
  <AspectRatio ratio={16 / 9} my={4}>
    <Box as="iframe" src={src} allowFullScreen rounded="lg" />
  </AspectRatio>
)

type TagProps = {
  children?: React.ReactNode
  [prop: string]: unknown
}

// `rehype-raw` surfaces the Mintlify-only custom tags this content uses
// (Info, Note, Wait, Warning, Frame, Tabs/Tab, ResponseField, LoomVideo,
// YoutubeVideo) as plain lowercase element names, which react-markdown's
// `Components` type doesn't model — hence the cast below.
const customTagComponents: Record<string, (props: TagProps) => JSX.Element> = {
  info: ({ children }) => <Callout colorScheme="blue">{children}</Callout>,
  note: ({ children }) => <Callout colorScheme="blue">{children}</Callout>,
  wait: ({ children }) => <Callout colorScheme="blue">{children}</Callout>,
  warning: ({ children }) => <Callout colorScheme="orange">{children}</Callout>,
  frame: ({ children }) => (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" my={4}>
      {children}
    </Box>
  ),
  tabs: ({ children }) => {
    // Whitespace between <Tab> tags comes through as string children.
    const items = React.Children.toArray(children).filter(
      React.isValidElement
    ) as React.ReactElement<{ title?: string }>[]
    return (
      <Tabs my={4} isLazy>
        <TabList>
          {items.map((item, index) => (
            <Tab key={index}>{item.props.title ?? `Tab ${index + 1}`}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {items.map((item, index) => (
            <TabPanel key={index} px={0}>
              {item}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    )
  },
  tab: ({ children }) => <>{children}</>,
  responsefield: ({ name, children }) => (
    <Box my={3}>
      <Text as="span" fontWeight="semibold">
        {typeof name === 'string' ? name : null}
      </Text>
      <Box mt={1}>{children}</Box>
    </Box>
  ),
  loomvideo: ({ id }) => (
    <VideoEmbed src={`https://www.loom.com/embed/${id}`} />
  ),
  youtubevideo: ({ id }) => (
    <VideoEmbed src={`https://www.youtube.com/embed/${id}`} />
  ),
}

const components: Components = {
  iframe: ({ src }) => <VideoEmbed src={src ?? ''} />,
  div: ({ children }) => <Box my={4}>{children}</Box>,
  img: ({ src, alt }) => (
    <Image src={src} alt={alt} rounded="lg" my={4} maxW="full" />
  ),
  video: ({ src }) => (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <Box
      as="video"
      src={src}
      controls
      autoPlay
      rounded="lg"
      my={4}
      maxW="full"
    />
  ),
  h1: ({ children }) => (
    <Heading as="h1" size="lg" mt={8} mb={3}>
      {children}
    </Heading>
  ),
  h2: ({ children }) => (
    <Heading as="h2" size="md" mt={8} mb={3}>
      {children}
    </Heading>
  ),
  h3: ({ children }) => (
    <Heading as="h3" size="sm" mt={6} mb={2}>
      {children}
    </Heading>
  ),
  ...(customTagComponents as Components),
}

export const HelpArticleContent = ({ body }: Props) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={components}
  >
    {body}
  </ReactMarkdown>
)
