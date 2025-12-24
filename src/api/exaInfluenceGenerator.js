import OpenAI from 'openai'
import { readFileSync } from 'fs'
import Ajv from 'ajv'
import { createSystemPrompt, createUserPrompt } from './prompts/influenceGraphPrompt.js'

// Load schema for validation
const schema = JSON.parse(readFileSync('schemas/influence-graph.schema.json', 'utf-8'))
const ajv = new Ajv()
const validate = ajv.compile(schema)

/**
 * Gets the Exa API key from environment.
 * Checks EXA_API_KEY first, then falls back to EXA_PROD_API_KEY.
 *
 * @returns {string} The API key
 * @throws {Error} If no API key is found
 */
function getApiKey() {
  const apiKey = process.env.EXA_API_KEY || process.env.EXA_PROD_API_KEY
  if (!apiKey) {
    throw new Error('EXA_API_KEY not found in environment')
  }
  return apiKey
}

/**
 * Strips markdown code blocks from a string if present.
 *
 * @param {string} text - The text that may contain markdown
 * @returns {string} The text with markdown removed
 */
function stripMarkdown(text) {
  // Remove ```json or ``` code blocks
  return text.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m, '$1').trim()
}

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
 * Calls Exa API to get influences for a specific person.
 *
 * @param {OpenAI} client - The Exa API client
 * @param {string} personName - The person to get influences for
 * @param {number} targetDepth - The depth these influences should have in the final graph
 * @returns {Promise<Array>} Array of influence nodes
 */
async function getInfluencesForPerson(client, personName, targetDepth) {
  const systemPrompt = createSystemPrompt()
  const userPrompt = createUserPrompt(personName)

  const completion = await client.chat.completions.create({
    model: 'exa',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    extra_body: {
      text: true
    }
  })

  const content = completion.choices[0].message.content
  const cleanedContent = stripMarkdown(content)
  const result = JSON.parse(cleanedContent)

  // Extract depth-1 nodes from this call and adjust their depth
  const influences = result.nodes
    .filter(n => n.depth === 1)
    .map(n => ({ ...n, depth: targetDepth }))

  return influences
}

/**
 * Generates an influence graph for a given person using the Exa API.
 * Makes multiple calls to get 3 levels of influences.
 *
 * @param {string} personName - The name of the person to generate an influence graph for
 * @returns {Promise<Object>} The influence graph object matching our schema
 * @throws {Error} If the API call fails or the response is invalid
 */
export async function generateInfluenceGraph(personName) {
  // Validate input
  validateInput(personName)

  // Initialize Exa client
  const apiKey = getApiKey()
  const client = new OpenAI({
    baseURL: 'https://api.exa.ai',
    apiKey: apiKey,
  })

  try {
    // Level 1: Get subject and their direct influences (depth 0-1)
    const systemPrompt = createSystemPrompt()
    const userPrompt = createUserPrompt(personName)

    const level1Completion = await client.chat.completions.create({
      model: 'exa',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      extra_body: {
        text: true
      }
    })

    const level1Content = level1Completion.choices[0].message.content
    const level1Cleaned = stripMarkdown(level1Content)
    const level1Result = JSON.parse(level1Cleaned)

    // Start building the final graph
    const allNodes = [...level1Result.nodes]
    const allLinks = [...level1Result.links]

    // Get depth-1 nodes (direct influences)
    const depth1Nodes = level1Result.nodes.filter(n => n.depth === 1)

    // Level 2: For each depth-1 person, get their influences (which become depth 2)
    // Limit to first 3 to avoid too many API calls
    const depth1ToQuery = depth1Nodes.slice(0, 3)

    for (const depth1Node of depth1ToQuery) {
      try {
        const depth2Influences = await getInfluencesForPerson(client, depth1Node.name, 2)

        // Add new nodes (avoid duplicates)
        for (const node of depth2Influences) {
          if (!allNodes.find(n => n.id === node.id)) {
            allNodes.push(node)
          }
        }

        // Add links from depth-2 to depth-1
        for (const depth2Node of depth2Influences) {
          allLinks.push({
            source: depth2Node.id,
            target: depth1Node.id
          })
        }
      } catch (error) {
        // If we can't get influences for this person, skip and continue
        console.warn(`Could not get influences for ${depth1Node.name}: ${error.message}`)
      }
    }

    // Build final result
    const result = {
      subject: personName,
      nodes: allNodes,
      links: allLinks
    }

    // Validate against schema
    const isValid = validate(result)
    if (!isValid) {
      throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`)
    }

    return result
  } catch (error) {
    // Re-throw with context
    throw new Error(`Failed to generate influence graph: ${error.message}`)
  }
}
