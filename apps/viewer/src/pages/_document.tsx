/* eslint-disable @next/next/no-sync-scripts */
import { Html, Head, Main, NextScript } from 'next/document'

const Document = () => (
  <Html translate="no">
    <Head>
      <script src="/__ENV.js" />
      {process.env.NODE_ENV === 'production' && (
        <script src="https://cdn.pagesense.io/js/twerlo/b248f0c246c44d168ef20849943ef125.js" />
      )}
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
)

export default Document
