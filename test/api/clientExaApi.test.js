import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateInfluenceGraph } from '../../src/api/clientExaApi.js'
import { loadVCR } from '../helpers/vcr.js'

describe('clientExaApi', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.restoreAllMocks()
  })

  describe('generateInfluenceGraph', () => {
    it('throws error if no API key provided', async () => {
      await expect(generateInfluenceGraph('Miles Davis', null)).rejects.toThrow('API key is required')
      await expect(generateInfluenceGraph('Miles Davis', '')).rejects.toThrow('API key is required')
    })

    it('throws error if person name is invalid', async () => {
      await expect(generateInfluenceGraph('', 'test-key')).rejects.toThrow('Person name cannot be empty')
      await expect(generateInfluenceGraph(null, 'test-key')).rejects.toThrow('Person name must be a string')
    })

    it('calls Exa API with correct parameters', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                subject: 'Test Person',
                nodes: [
                  { id: 'test', name: 'Test Person', depth: 0 }
                ],
                links: []
              })
            }
          }]
        })
      })

      await generateInfluenceGraph('Test Person', 'test-api-key')

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.exa.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('returns valid influence graph structure', async () => {
      // Load VCR data for Miles Davis
      const vcrData = loadVCR('exa-miles-davis')

      // Mock fetch to return VCR data structure
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(vcrData.data)
            }
          }]
        })
      })

      const result = await generateInfluenceGraph('Miles Davis', 'test-key')

      expect(result).toBeDefined()
      expect(result.subject).toBe('Miles Davis')
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(Array.isArray(result.links)).toBe(true)
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('handles API errors gracefully', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(generateInfluenceGraph('Test Person', 'invalid-key'))
        .rejects.toThrow('API request failed: 401 Unauthorized')
    })

    it('handles network errors gracefully', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow('Network error')
    })

    it('handles malformed JSON responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'not valid json'
            }
          }]
        })
      })

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow()
    })

    it('validates response against schema', async () => {
      // Invalid response (missing required fields)
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                nodes: [],  // Empty nodes invalid
                links: []
              })
            }
          }]
        })
      })

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow('Invalid response')
    })
  })
})
