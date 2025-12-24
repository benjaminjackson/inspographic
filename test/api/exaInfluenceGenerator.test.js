import { describe, it, expect } from 'vitest'
import Ajv from 'ajv'
import { readFileSync } from 'fs'
import { loadVCR } from '../helpers/vcr.js'

// Load and compile schema
const schema = JSON.parse(readFileSync('schemas/influence-graph.schema.json', 'utf-8'))
const ajv = new Ajv()
const validate = ajv.compile(schema)

describe('exaInfluenceGenerator', () => {
  describe('VCR recorded responses', () => {
    it('Miles Davis cassette contains valid 3-level influence graph', () => {
      const cassette = loadVCR('exa-miles-davis')
      const result = cassette.data

      expect(result).toBeDefined()
      expect(result.subject).toBe('Miles Davis')
      expect(result.nodes).toBeInstanceOf(Array)
      expect(result.links).toBeInstanceOf(Array)

      // Validate against schema
      const isValid = validate(result)
      if (!isValid) {
        console.error('Validation errors:', validate.errors)
      }
      expect(isValid).toBe(true)

      // Check depth structure (3 levels: 0, 1, 2)
      const depthZeroNodes = result.nodes.filter(n => n.depth === 0)
      const depthOneNodes = result.nodes.filter(n => n.depth === 1)
      const depthTwoNodes = result.nodes.filter(n => n.depth === 2)

      expect(depthZeroNodes).toHaveLength(1)
      expect(depthZeroNodes[0].name).toBe('Miles Davis')
      expect(depthOneNodes.length).toBeGreaterThan(0)
      expect(depthTwoNodes.length).toBeGreaterThan(0)

      // Verify all link IDs exist in nodes
      const nodeIds = new Set(result.nodes.map(n => n.id))
      for (const link of result.links) {
        expect(nodeIds.has(link.source)).toBe(true)
        expect(nodeIds.has(link.target)).toBe(true)
      }
    })

    it('obscure person cassette handles unknown person gracefully', () => {
      const cassette = loadVCR('exa-obscure-person')
      const result = cassette.data

      expect(result).toBeDefined()
      expect(result.subject).toBe('Zorthax the Mysterious 12345')

      // Validate against schema
      const isValid = validate(result)
      expect(isValid).toBe(true)

      // Should have at least the subject node
      expect(result.nodes.length).toBeGreaterThanOrEqual(1)
      const subjectNode = result.nodes.find(n => n.depth === 0)
      expect(subjectNode).toBeDefined()
      expect(subjectNode.name).toBe('Zorthax the Mysterious 12345')
    })

    it('all recorded cassettes have valid schema', () => {
      const cassettes = ['exa-miles-davis', 'exa-obscure-person']

      for (const cassetteName of cassettes) {
        const cassette = loadVCR(cassetteName)
        const result = cassette.data

        const isValid = validate(result)
        if (!isValid) {
          console.error(`Validation errors for ${cassetteName}:`, validate.errors)
        }
        expect(isValid).toBe(true)
      }
    })
  })

  describe('schema validation', () => {
    it('validates nodes have required fields', () => {
      const cassette = loadVCR('exa-miles-davis')
      const result = cassette.data

      for (const node of result.nodes) {
        expect(node).toHaveProperty('id')
        expect(node).toHaveProperty('name')
        expect(node).toHaveProperty('depth')
        expect(typeof node.id).toBe('string')
        expect(typeof node.name).toBe('string')
        expect(typeof node.depth).toBe('number')
        expect(node.depth).toBeGreaterThanOrEqual(0)
      }
    })

    it('validates links have required fields', () => {
      const cassette = loadVCR('exa-miles-davis')
      const result = cassette.data

      for (const link of result.links) {
        expect(link).toHaveProperty('source')
        expect(link).toHaveProperty('target')
        expect(typeof link.source).toBe('string')
        expect(typeof link.target).toBe('string')
      }
    })

    it('validates link references point to existing nodes', () => {
      const cassette = loadVCR('exa-miles-davis')
      const result = cassette.data

      const nodeIds = new Set(result.nodes.map(n => n.id))

      for (const link of result.links) {
        expect(nodeIds.has(link.source),
          `Link source "${link.source}" not found in nodes`).toBe(true)
        expect(nodeIds.has(link.target),
          `Link target "${link.target}" not found in nodes`).toBe(true)
      }
    })
  })
})
