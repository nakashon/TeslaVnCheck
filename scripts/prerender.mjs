import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import { SITE_CANON, STRUCTURED_DATA, renderLlmsText } from '../src/lib/seo.ts'

const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
})

try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const markup = renderToString(createElement(App))
  const json = JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c')
  const hash = createHash('sha256').update(json).digest('base64')
  const file = new URL('../dist/index.html', import.meta.url)
  const html = await readFile(file, 'utf8')
  if (!html.includes('<div id="root"></div>') || !html.includes("script-src 'self'")) {
    throw new Error('Prerender template or Content Security Policy changed; refusing an incomplete SEO build.')
  }
  await writeFile(file, html
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
    .replace("script-src 'self'", `script-src 'self' 'sha256-${hash}'`)
    .replace('</head>', `<script id="site-structured-data" type="application/ld+json">${json}</script>\n</head>`))
  await writeFile(new URL('../dist/canon.json', import.meta.url), JSON.stringify(SITE_CANON, null, 2) + '\n')
  await writeFile(new URL('../dist/llms.txt', import.meta.url), renderLlmsText())
  console.log('Prerendered public homepage, structured data, canon.json and llms.txt.')
} finally {
  await server.close()
}
