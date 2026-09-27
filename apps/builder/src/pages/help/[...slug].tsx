import { Box, Container, Heading, Link } from '@chakra-ui/react'
import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import {
  getAllHelpArticleSlugs,
  getHelpArticleBySlug,
} from '@/features/help/helpers/getHelpArticle'
import { HelpArticleContent } from '@/features/help/components/HelpArticleContent'

type Props = {
  title: string
  body: string
}

const HelpArticlePage = ({ title, body }: Props) => (
  <>
    <Head>
      <title>{title} · Azeer help</title>
    </Head>
    <Box minH="100vh" py={10}>
      <Container maxW="700px">
        <Link
          href="/"
          fontSize="sm"
          color="gray.500"
          mb={6}
          display="inline-block"
        >
          ← Back to Azeer
        </Link>
        <Heading as="h1" size="xl" mb={6}>
          {title}
        </Heading>
        <HelpArticleContent body={body} />
      </Container>
    </Box>
  </>
)

export default HelpArticlePage

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getAllHelpArticleSlugs().map((slug) => ({ params: { slug } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const slug = params?.slug as string[]
  const article = getHelpArticleBySlug(slug)
  if (!article) return { notFound: true }
  return { props: { title: article.title, body: article.body } }
}
