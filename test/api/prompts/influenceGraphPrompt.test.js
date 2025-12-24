import { describe, it, expect } from 'vitest'
import { createSystemPrompt, createUserPrompt } from '../../../src/api/prompts/influenceGraphPrompt.js'

describe('influenceGraphPrompt', () => {
  describe('createSystemPrompt', () => {
    it('returns a string with instructions for JSON generation', () => {
      const prompt = createSystemPrompt()

      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('influence')
      expect(prompt).toContain('depth')
    })

    it('includes schema requirements', () => {
      const prompt = createSystemPrompt()

      expect(prompt).toContain('subject')
      expect(prompt).toContain('nodes')
      expect(prompt).toContain('links')
      expect(prompt).toContain('source')
      expect(prompt).toContain('target')
    })

    it('specifies no markdown wrapping', () => {
      const prompt = createSystemPrompt()

      expect(prompt.toLowerCase()).toContain('no markdown')
    })
  })

  describe('createUserPrompt', () => {
    it('creates a prompt with the person name', () => {
      const prompt = createUserPrompt('Miles Davis')

      expect(typeof prompt).toBe('string')
      expect(prompt).toContain('Miles Davis')
    })

    it('handles names with special characters', () => {
      const prompt = createUserPrompt("O'Brien")

      expect(prompt).toContain("O'Brien")
    })

    it('handles unicode names', () => {
      const prompt = createUserPrompt('André Citroën')

      expect(prompt).toContain('André Citroën')
    })
  })
})
