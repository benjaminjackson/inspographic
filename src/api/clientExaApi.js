import { createSystemPrompt, createUserPrompt } from './prompts/influenceGraphPrompt.js'

/**
 * Strips markdown code blocks from a string if present
 * @param {string} text - The text that may contain markdown
 * @returns {string} The text with markdown removed
 */
function stripMarkdown(text) {
  return text.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m, '$1').trim()
}

/**
 * Validates input person name
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
 * Validates API key
 * @param {string} apiKey - The API key to validate
 * @throws {Error} If the API key is invalid
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key is required')
  }
}

/**
 * Validates the API response against our schema requirements
 * @param {Object} data - The response data
 * @throws {Error} If validation fails
 */
function validateResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: data must be an object')
  }

  if (typeof data.subject !== 'string' || data.subject.length === 0) {
    throw new Error('Invalid response: missing or invalid subject')
  }

  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    throw new Error('Invalid response: nodes must be a non-empty array')
  }

  if (!Array.isArray(data.links)) {
    throw new Error('Invalid response: links must be an array')
  }

  // Validate each node has required fields
  for (const node of data.nodes) {
    if (!node.id || !node.name || typeof node.depth !== 'number') {
      throw new Error('Invalid response: node missing required fields (id, name, depth)')
    }
  }

  // Validate each link has required fields
  for (const link of data.links) {
    if (!link.source || !link.target) {
      throw new Error('Invalid response: link missing required fields (source, target)')
    }
  }
}

/**
 * Generates an influence graph for a given person using the Exa API
 * @param {string} personName - The name of the person to generate an influence graph for
 * @param {string} apiKey - The Exa API key
 * @returns {Promise<Object>} The influence graph object
 * @throws {Error} If the API call fails or the response is invalid
 */
export async function generateInfluenceGraph(personName, apiKey) {
  // Validate inputs
  validateInput(personName)
  validateApiKey(apiKey)

  const systemPrompt = createSystemPrompt()
  const userPrompt = createUserPrompt(personName)

  try {
    // Call Exa API
    const response = await fetch('https://api.exa.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'exa',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        extra_body: {
          text: true
        }
      })
    })

    // Check response status
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    // Parse response
    const responseData = await response.json()

    // Extract content from response
    const content = responseData.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Invalid API response: missing content')
    }

    // Clean and parse JSON
    const cleanedContent = stripMarkdown(content)
    const result = JSON.parse(cleanedContent)

    // Validate response
    validateResponse(result)

    return result
  } catch (error) {
    // Re-throw with context if it's not already an Error
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to generate influence graph: ${error}`)
  }
}
