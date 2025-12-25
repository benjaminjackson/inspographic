import { describe, it, expect } from 'vitest'
import { sanitizeNode } from '../../server/influenceGraphAdapter.js'

describe('influenceGraphAdapter', () => {
  describe('sanitizeNode', () => {
    it('preserves required properties', () => {
      const node = {
        id: 'test-id',
        name: 'Test Name',
        depth: 1
      }
      const sanitized = sanitizeNode(node)
      expect(sanitized).toEqual({
        id: 'test-id',
        name: 'Test Name',
        depth: 1
      })
    })

    it('removes invalid "source" property', () => {
      const nodeWithSource = {
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        source: 'invalid-property'
      }
      const sanitized = sanitizeNode(nodeWithSource)
      expect(sanitized).toEqual({
        id: 'test-id',
        name: 'Test Name',
        depth: 1
      })
      expect(sanitized.source).toBeUndefined()
    })

    it('preserves optional schema properties', () => {
      const nodeWithOptionals = {
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        size: 10,
        description: 'A description',
        url: 'https://example.com',
        metadata: { foo: 'bar' }
      }
      const sanitized = sanitizeNode(nodeWithOptionals)
      expect(sanitized).toEqual({
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        size: 10,
        description: 'A description',
        url: 'https://example.com',
        metadata: { foo: 'bar' }
      })
    })

    it('removes arbitrary invalid properties', () => {
      const nodeWithInvalidProps = {
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        invalidProp1: 'should be removed',
        invalidProp2: 'also removed',
        source: 'this too'
      }
      const sanitized = sanitizeNode(nodeWithInvalidProps)
      expect(sanitized).toEqual({
        id: 'test-id',
        name: 'Test Name',
        depth: 1
      })
      expect(sanitized.invalidProp1).toBeUndefined()
      expect(sanitized.invalidProp2).toBeUndefined()
      expect(sanitized.source).toBeUndefined()
    })

    it('preserves optional properties while removing invalid ones', () => {
      const mixedNode = {
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        size: 10,
        description: 'Valid description',
        source: 'invalid',
        randomProp: 'also invalid'
      }
      const sanitized = sanitizeNode(mixedNode)
      expect(sanitized).toEqual({
        id: 'test-id',
        name: 'Test Name',
        depth: 1,
        size: 10,
        description: 'Valid description'
      })
      expect(sanitized.source).toBeUndefined()
      expect(sanitized.randomProp).toBeUndefined()
    })
  })
})
