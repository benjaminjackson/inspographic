import { describe, it, expect, vi } from 'vitest'

// Exa's outputSchema does not stop the model from adding fields the schema
// forbids (seen live: a "citations" field on one node for "Bad Bunny").
const exaResponse = {
  subject: 'Bad Bunny',
  nodes: [
    { id: 'bad-bunny', name: 'Bad Bunny', depth: 0 },
    { id: 'daddy-yankee', name: 'Daddy Yankee', depth: 1, citations: ['https://example.com'] }
  ],
  links: [{ source: 'daddy-yankee', target: 'bad-bunny' }]
}

vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async () => ({ choices: [{ message: { content: JSON.stringify(exaResponse) } }] })
      }
    }
  }
}))

const { generateInfluenceGraphWithKey } = await import('../../server/influenceGraphAdapter.js')

describe('influenceGraphAdapter', () => {
  it('drops fields the schema does not allow instead of failing the whole graph', async () => {
    const graph = await generateInfluenceGraphWithKey('Bad Bunny', 'test-key')

    const yankee = graph.nodes.find(n => n.id === 'daddy-yankee')
    expect(yankee).toBeDefined()
    expect(yankee).not.toHaveProperty('citations')
  })
})
