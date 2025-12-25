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
 *
 * @param {string} personName - The name of the person to generate an influence graph for
 * @param {string} apiKey - The Exa API key to use
 * @returns {Promise<Object>} The influence graph object
 * @throws {Error} If the API call fails or validation fails
 */
export async function generateInfluenceGraph(personName, apiKey) {
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

    const data = await response.json()
    return data
  } catch (error) {
    // Re-throw with context if not already a formatted error
    if (error.message.startsWith('API request failed:')) {
      throw error
    }
    throw new Error(`Failed to generate influence graph: ${error.message}`)
  }
}
