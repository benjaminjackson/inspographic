import express from 'express'
import cors from 'cors'
import { generateInfluenceGraphWithKey } from './influenceGraphAdapter.js'

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

// Influence graph endpoint
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

  try {
    // Generate influence graph using provided API key
    const graph = await generateInfluenceGraphWithKey(personName, apiKey)
    res.json(graph)
  } catch (error) {
    // Handle errors from the generator
    console.error('Error generating influence graph:', error)
    res.status(500).json({
      error: 'Internal Server Error: Failed to generate influence graph',
      message: error.message
    })
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
