import { Flex, Image, ImageProps, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

type Props = {
  url: string
} & Omit<ImageProps, 'src'>

export const ImagePreview = ({ url, ...props }: Props) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [url])

  const containsVariables = url.includes('{{') && url.includes('}}')

  if (hasError)
    return (
      <Flex
        w="full"
        py="4"
        px="2"
        justify="center"
        rounded="md"
        borderWidth="1px"
        borderStyle="dashed"
      >
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Image could not be loaded. Check that the link is public.
        </Text>
      </Flex>
    )

  return (
    <Image
      pointerEvents="none"
      src={containsVariables ? '/images/dynamic-image.png' : url}
      alt="Image preview"
      rounded="md"
      objectFit="cover"
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
