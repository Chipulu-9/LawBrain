import { ingestDocuments } from './index'

ingestDocuments().catch((err) => {
  console.error(err)
  process.exit(1)
})
