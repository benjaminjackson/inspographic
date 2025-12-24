import { describe, it, expect, beforeEach } from 'vitest'
import { getApiKey, saveApiKey, clearApiKey, hasApiKey } from '../../src/utils/apiKeyStorage.js'

describe('apiKeyStorage', () => {
  const STORAGE_KEY = 'inspographic.exa.apiKey'

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('getApiKey', () => {
    it('returns null when no key is stored', () => {
      expect(getApiKey()).toBeNull()
    })

    it('returns the stored API key', () => {
      localStorage.setItem(STORAGE_KEY, 'test-api-key-123')
      expect(getApiKey()).toBe('test-api-key-123')
    })
  })

  describe('saveApiKey', () => {
    it('stores the API key to localStorage', () => {
      saveApiKey('my-secret-key')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('my-secret-key')
    })

    it('overwrites existing key', () => {
      localStorage.setItem(STORAGE_KEY, 'old-key')
      saveApiKey('new-key')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('new-key')
    })
  })

  describe('clearApiKey', () => {
    it('removes the API key from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'test-key')
      clearApiKey()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('does nothing if no key exists', () => {
      clearApiKey()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('hasApiKey', () => {
    it('returns false when no key is stored', () => {
      expect(hasApiKey()).toBe(false)
    })

    it('returns true when a key is stored', () => {
      localStorage.setItem(STORAGE_KEY, 'test-key')
      expect(hasApiKey()).toBe(true)
    })

    it('returns false when key is empty string', () => {
      localStorage.setItem(STORAGE_KEY, '')
      expect(hasApiKey()).toBe(false)
    })
  })
})
