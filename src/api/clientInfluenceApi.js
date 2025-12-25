/**
 * Client API for generating influence graphs via local proxy server.
 * This avoids CORS issues by calling a local Express server that proxies to Exa API.
 */

const API_SERVER_URL = 'http://localhost:3001'

/**
 * Validates input person name.
 *
 * @param {string} personName - The person name to validate
 * @throws {Error} If the name is invalid
 */
function validateInput(personName) {
  if (typeof personName !== 'string') {
    throw new Error('Person name must be a string')
  }
  if (personName.trim().length === 0) {
    throw new Error('Person name cannot be empty')
  }
}

/**
 * Validates API key.
 *
 * @param {string} apiKey - The API key to validate
 * @throws {Error} If the key is invalid
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key is required')
  }
}

/**
 * Generates an influence graph for a given person by calling the local proxy server.
 * Streams progress updates via Server-Sent Events.
 *
 * @param {string} personName - The name of the person to generate an influence graph for
 * @param {string} apiKey - The Exa API key to use
 * @param {Function} onProgress - Callback function called with entity name as each is researched
 * @returns {Promise<Object>} The influence graph object
 * @throws {Error} If the API call fails or validation fails
 */
export async function generateInfluenceGraph(personName, apiKey, onProgress = null) {
  // Validate inputs
  validateInput(personName)
  validateApiKey(apiKey)

  try {
    const response = await fetch(`${API_SERVER_URL}/api/influence-graph`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ personName })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    // Read SSE stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let result = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))

          if (data.type === 'progress' && onProgress) {
            onProgress(data.entity)
          } else if (data.type === 'complete') {
            result = data.data
          } else if (data.type === 'error') {
            throw new Error(data.message)
          }
        }
      }
    }

    if (!result) {
      throw new Error('No data received from server')
    }

    return result
  } catch (error) {
    // Re-throw with context if not already a formatted error
    if (error.message.startsWith('API request failed:') || error.message.startsWith('No data received')) {
      throw error
    }
    throw new Error(`Failed to generate influence graph: ${error.message}`)
  }
}
