import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateInfluenceGraph } from '../../src/api/clientInfluenceApi.js'

// Helper to create mock SSE stream
function createMockSSEStream(events) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        const line = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    }
  })
  return stream
}

describe('clientInfluenceApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateInfluenceGraph', () => {
    it('throws error if no API key provided', async () => {
      // This test will fail because the function doesn't exist yet (RED)
      await expect(generateInfluenceGraph('Miles Davis', null)).rejects.toThrow('API key is required')
      await expect(generateInfluenceGraph('Miles Davis', '')).rejects.toThrow('API key is required')
    })

    it('throws error if person name is invalid', async () => {
      await expect(generateInfluenceGraph('', 'test-key')).rejects.toThrow('Person name cannot be empty')
      await expect(generateInfluenceGraph(null, 'test-key')).rejects.toThrow('Person name must be a string')
    })

    it('calls local proxy server with correct parameters', async () => {
      const mockData = {
        subject: 'Test Person',
        nodes: [{ id: 'test', name: 'Test Person', depth: 0 }],
        links: []
      }

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream([
          { type: 'progress', entity: 'Test Person' },
          { type: 'complete', data: mockData }
        ])
      })

      await generateInfluenceGraph('Test Person', 'test-api-key')

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3001/api/influence-graph',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ personName: 'Test Person' })
        })
      )
    })

    it('returns valid influence graph structure', async () => {
      const mockData = {
        subject: 'Miles Davis',
        nodes: [
          { id: 'miles-davis', name: 'Miles Davis', depth: 0 },
          { id: 'charlie-parker', name: 'Charlie Parker', depth: 1 }
        ],
        links: [
          { source: 'charlie-parker', target: 'miles-davis' }
        ]
      }

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream([
          { type: 'progress', entity: 'Miles Davis' },
          { type: 'progress', entity: 'Charlie Parker' },
          { type: 'complete', data: mockData }
        ])
      })

      const result = await generateInfluenceGraph('Miles Davis', 'test-key')

      expect(result).toBeDefined()
      expect(result.subject).toBe('Miles Davis')
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(Array.isArray(result.links)).toBe(true)
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('handles 401 Unauthorized errors', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized: Missing or invalid Authorization header' })
      })

      await expect(generateInfluenceGraph('Test Person', 'invalid-key'))
        .rejects.toThrow('API request failed: 401 Unauthorized')
    })

    it('handles 400 Bad Request errors from server', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Bad Request: Invalid request' })
      })

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow('API request failed: 400 Bad Request')
    })

    it('handles 500 Server errors', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal Server Error' })
      })

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow('API request failed: 500 Internal Server Error')
    })

    it('handles network errors gracefully', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      await expect(generateInfluenceGraph('Test Person', 'test-key'))
        .rejects.toThrow('Network error')
    })
  })
})
