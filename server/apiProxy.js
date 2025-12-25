import express from 'express'
import cors from 'cors'
import { generateInfluenceGraphWithKey } from './influenceGraphAdapter.js'
import { withCache, initializeCacheDirectory } from './cacheMiddleware.js'

// Initialize cache directory on startup
await initializeCacheDirectory()

const app = express()

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Influence graph endpoint with SSE progress updates
app.post('/api/influence-graph', async (req, res) => {
  // Validate Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization header'
    })
  }

  // Extract API key from Bearer token
  const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

  // Validate request body
  const { personName } = req.body
  if (!personName || personName.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request: personName is required and cannot be empty'
    })
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Progress callback to send updates
  const onProgress = (entityName) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', entity: entityName })}\n\n`)
  }

  try {
    // Generate influence graph using provided API key (with caching)
    const graph = await withCache(personName, () =>
      generateInfluenceGraphWithKey(personName, apiKey, onProgress)
    )

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'complete', data: graph })}\n\n`)
    res.end()
  } catch (error) {
    // Handle errors from the generator
    console.error('Error generating influence graph:', error)
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
    res.end()
  }
})

// Export app for testing
export default app

// Start server only when run directly (not during tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`)
  })
}
