const STORAGE_KEY = 'inspographic.exa.apiKey'

/**
 * Get the stored API key from localStorage
 * @returns {string|null} The API key or null if not found
 */
export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY)
}

/**
 * Save the API key to localStorage
 * @param {string} apiKey - The API key to store
 */
export function saveApiKey(apiKey) {
  localStorage.setItem(STORAGE_KEY, apiKey)
}

/**
 * Remove the API key from localStorage
 */
export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Check if an API key exists in localStorage
 * @returns {boolean} True if a non-empty key exists
 */
export function hasApiKey() {
  const key = getApiKey()
  return key !== null && key !== ''
}
