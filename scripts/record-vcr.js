/**
 * Script to record VCR cassettes for API testing.
 * This conserves API tokens by recording real responses once.
 *
 * Usage:
 *   EXA_API_KEY=your_key node scripts/record-vcr.js
 */

import dotenv from 'dotenv'
import { generateInfluenceGraph } from '../src/api/exaInfluenceGenerator.js'
import { saveVCR } from '../test/helpers/vcr.js'

// Load environment variables
dotenv.config()

// Ensure API key is available
if (!process.env.EXA_API_KEY && !process.env.EXA_PROD_API_KEY) {
  console.error('Error: EXA_API_KEY or EXA_PROD_API_KEY must be set')
  process.exit(1)
}

async function recordCassette(personName, cassetteName) {
  console.log(`\nRecording cassette: ${cassetteName}`)
  console.log(`Person: ${personName}`)

  try {
    const result = await generateInfluenceGraph(personName)
    saveVCR(cassetteName, result)
    console.log(`✓ Successfully recorded ${cassetteName}`)
    console.log(`  Nodes: ${result.nodes.length}`)
    console.log(`  Links: ${result.links.length}`)
    return result
  } catch (error) {
    console.error(`✗ Failed to record ${cassetteName}:`, error.message)
    throw error
  }
}

async function main() {
  console.log('Recording VCR cassettes for Exa API tests...')
  console.log('This will consume Exa API credits.')

  try {
    // Record Miles Davis (well-known person)
    await recordCassette('Miles Davis', 'exa-miles-davis')

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Record obscure person (graceful fallback test)
    await recordCassette('Zorthax the Mysterious 12345', 'exa-obscure-person')

    console.log('\n✓ All cassettes recorded successfully!')
    console.log('\nYou can now run tests without consuming API credits:')
    console.log('  npm test')
  } catch (error) {
    console.error('\n✗ Recording failed:', error.message)
    process.exit(1)
  }
}

main()
