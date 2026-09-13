import { notifyIndexNow } from '../src/lib/indexnow.ts'

const status = await notifyIndexNow()
console.log(status === 202
  ? 'IndexNow accepted the homepage notification pending ownership verification.'
  : 'IndexNow accepted the homepage notification.')
console.log('Acceptance does not guarantee indexing. Google does not participate in IndexNow.')
