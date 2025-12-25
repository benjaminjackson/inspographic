import OpenAI from 'openai'
import { readFileSync } from 'fs'
import Ajv from 'ajv'
import { createSystemPrompt, createUserPrompt } from '../src/api/prompts/influenceGraphPrompt.js'

// Load schema for validation
const schema = JSON.parse(readFileSync('schemas/influence-graph.schema.json', 'utf-8'))
const ajv = new Ajv()
const validate = ajv.compile(schema)

/**
 * Strips markdown code blocks from a string if present.
 *
 * @param {string} text - The text that may contain markdown
 * @returns {string} The text with markdown removed
 */
function stripMarkdown(text) {
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
 * Sanitizes a node object to only include schema-valid properties.
 * This prevents API responses from including extra properties that violate the schema.
 *
 * @param {Object} node - The node to sanitize
 * @returns {Object} A new node object with only valid properties
 */
export function sanitizeNode(node) {
  const sanitized = {
    id: node.id,
    name: node.name,
    depth: node.depth
  }

  // Include optional properties if they exist
  if (node.size !== undefined) sanitized.size = node.size
  if (node.description !== undefined) sanitized.description = node.description
  if (node.url !== undefined) sanitized.url = node.url
  if (node.metadata !== undefined) sanitized.metadata = node.metadata

  return sanitized
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
    .map(n => sanitizeNode({ ...n, depth: targetDepth }))

  return influences
}

/**
 * Generates an influence graph for a given person using the Exa API.
 * This is an adapter that accepts an API key as a parameter instead of reading from environment.
 *
 * @param {string} personName - The name of the person to generate an influence graph for
 * @param {string} apiKey - The Exa API key to use
 * @returns {Promise<Object>} The influence graph object matching our schema
 * @throws {Error} If the API call fails or the response is invalid
 */
export async function generateInfluenceGraphWithKey(personName, apiKey) {
  // Validate input
  validateInput(personName)

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key is required and must be a string')
  }

  // Initialize Exa client with provided API key
  // dangerouslyAllowBrowser: true is safe here because this code only runs server-side
  // The API key is passed from request headers, never exposed to browsers
  const client = new OpenAI({
    baseURL: 'https://api.exa.ai',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
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

    // Start building the final graph - sanitize all nodes from API
    const allNodes = level1Result.nodes.map(n => sanitizeNode(n))
    const allLinks = [...level1Result.links]

    // Get depth-1 nodes (direct influences)
    const depth1Nodes = level1Result.nodes.filter(n => n.depth === 1)

    // Level 2: For each depth-1 person, get their influences (which become depth 2)
    // Limit to first 3 to avoid too many API calls
    const depth1ToQuery = depth1Nodes.slice(0, 3)

    for (const depth1Node of depth1ToQuery) {
      try {
        const depth2Influences = await getInfluencesForPerson(client, depth1Node.name, 2)

        // Add new nodes (avoid duplicates) - already sanitized by getInfluencesForPerson
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
