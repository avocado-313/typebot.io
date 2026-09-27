import fs from 'fs'
import path from 'path'

const HELP_CONTENT_ROOT = path.join(process.cwd(), 'content/help')

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n/
const SNIPPET_IMPORT_REGEX =
  /^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*$\n?/gm
// Custom (capitalized) JSX components authored self-closing, e.g.
// `<LoomVideo id="x" />`. The HTML parser behind rehype-raw only treats
// actual void elements (img, br, ...) as self-closing — any other tag
// written this way stays "open" and swallows every following sibling as
// its children. Expanding to an explicit open/close pair avoids that.
const SELF_CLOSING_CUSTOM_TAG_REGEX = /<([A-Z][A-Za-z]*)((?:\s+[^>]*?)?)\/>/g

export type HelpArticle = {
  title: string
  body: string
}

const walkMdxFiles = (dir: string): string[][] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkMdxFiles(entryPath)
    if (!entry.name.endsWith('.mdx')) return []
    return [
      path
        .relative(HELP_CONTENT_ROOT, entryPath)
        .replace(/\.mdx$/, '')
        .split(path.sep),
    ]
  })

export const getAllHelpArticleSlugs = (): string[][] =>
  walkMdxFiles(HELP_CONTENT_ROOT)

export const getHelpArticleBySlug = (
  slug: string[]
): HelpArticle | undefined => {
  const filePath = path.join(HELP_CONTENT_ROOT, ...slug) + '.mdx'
  if (!filePath.startsWith(HELP_CONTENT_ROOT) || !fs.existsSync(filePath))
    return
  const raw = fs.readFileSync(filePath, 'utf-8')
  const frontmatter = raw.match(FRONTMATTER_REGEX)?.[1] ?? ''
  const title = frontmatter.match(/title:\s*(.+)/)?.[1]?.trim() ?? 'Help'
  const body = raw
    .replace(FRONTMATTER_REGEX, '')
    .replace(SNIPPET_IMPORT_REGEX, '')
    .replace(SELF_CLOSING_CUSTOM_TAG_REGEX, '<$1$2></$1>')
  return { title, body }
}
