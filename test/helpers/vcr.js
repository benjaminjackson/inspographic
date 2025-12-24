import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

/**
 * VCR (Video Cassette Recorder) pattern for recording and playing back API responses.
 * Helps conserve API tokens during testing.
 */

/**
 * Loads a VCR cassette (recorded API response).
 *
 * @param {string} cassetteName - Name of the cassette file (without extension)
 * @returns {Object} The recorded response data
 * @throws {Error} If the cassette doesn't exist
 */
export function loadVCR(cassetteName) {
  const cassettePath = `test/fixtures/vcr/${cassetteName}.json`

  if (!existsSync(cassettePath)) {
    throw new Error(`VCR cassette not found: ${cassettePath}. Run with RECORD_VCR=true to record.`)
  }

  const cassette = JSON.parse(readFileSync(cassettePath, 'utf-8'))
  return cassette
}

/**
 * Saves a VCR cassette (records an API response).
 *
 * @param {string} cassetteName - Name of the cassette file (without extension)
 * @param {Object} data - The response data to record
 */
export function saveVCR(cassetteName, data) {
  const cassettePath = `test/fixtures/vcr/${cassetteName}.json`

  // Ensure directory exists
  const dir = dirname(cassettePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Add metadata
  const cassette = {
    recordedAt: new Date().toISOString(),
    data: data
  }

  writeFileSync(cassettePath, JSON.stringify(cassette, null, 2), 'utf-8')
  console.log(`VCR cassette saved: ${cassettePath}`)
}

/**
 * Checks if we're in recording mode.
 *
 * @returns {boolean} True if RECORD_VCR environment variable is set
 */
export function isRecording() {
  return process.env.RECORD_VCR === 'true'
}

/**
 * Gets data from VCR or calls the provided function to generate it.
 * If in recording mode, calls the function and saves the result.
 * Otherwise, loads the cassette.
 *
 * @param {string} cassetteName - Name of the cassette
 * @param {Function} fn - Async function that generates the data
 * @returns {Promise<Object>} The data (from cassette or fresh call)
 */
export async function useVCR(cassetteName, fn) {
  if (isRecording()) {
    const data = await fn()
    saveVCR(cassetteName, data)
    return data
  } else {
    const cassette = loadVCR(cassetteName)
    return cassette.data
  }
}
