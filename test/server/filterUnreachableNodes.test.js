import { describe, it, expect } from 'vitest'
import { filterUnreachableNodes } from '../../server/filterUnreachableNodes.js'

describe('filterUnreachableNodes', () => {
  it('filters out orphaned nodes (Radiohead/Thom Yorke case)', () => {
    const graph = {
      subject: 'Björk',
      nodes: [
        { id: 'bjork', name: 'Björk', depth: 0 },
        { id: 'stockhausen', name: 'Karlheinz Stockhausen', depth: 1 },
        { id: 'cage', name: 'John Cage', depth: 2 },
        // Orphaned nodes
        { id: 'radiohead', name: 'Radiohead', depth: 1 },
        { id: 'thom-yorke', name: 'Thom Yorke', depth: 1 }
      ],
      links: [
        { source: 'stockhausen', target: 'bjork' },
        { source: 'cage', target: 'stockhausen' },
        // Orphaned link
        { source: 'radiohead', target: 'thom-yorke' },
        { source: 'thom-yorke', target: 'radiohead' }
      ]
    }

    const filtered = filterUnreachableNodes(graph)

    // Should only have nodes connected to root
    expect(filtered.nodes).toHaveLength(3)
    expect(filtered.nodes.map(n => n.id)).toEqual(['bjork', 'stockhausen', 'cage'])

    // Should only have links between connected nodes
    expect(filtered.links).toHaveLength(2)
    expect(filtered.links).toEqual([
      { source: 'stockhausen', target: 'bjork' },
      { source: 'cage', target: 'stockhausen' }
    ])
  })

  it('handles empty graph', () => {
    const graph = {
      subject: 'Unknown Person',
      nodes: [{ id: 'unknown', name: 'Unknown Person', depth: 0 }],
      links: []
    }

    const filtered = filterUnreachableNodes(graph)

    expect(filtered.nodes).toHaveLength(1)
    expect(filtered.links).toHaveLength(0)
  })

  it('preserves fully connected graph', () => {
    const graph = {
      subject: 'Artist',
      nodes: [
        { id: 'artist', name: 'Artist', depth: 0 },
        { id: 'influence1', name: 'Influence 1', depth: 1 },
        { id: 'influence2', name: 'Influence 2', depth: 2 }
      ],
      links: [
        { source: 'influence1', target: 'artist' },
        { source: 'influence2', target: 'influence1' }
      ]
    }

    const filtered = filterUnreachableNodes(graph)

    expect(filtered.nodes).toHaveLength(3)
    expect(filtered.links).toHaveLength(2)
  })

  it('handles bidirectional links (influenced-by relationship)', () => {
    const graph = {
      subject: 'Artist',
      nodes: [
        { id: 'artist', name: 'Artist', depth: 0 },
        { id: 'peer', name: 'Peer', depth: 1 },
        { id: 'influence', name: 'Influence', depth: 2 }
      ],
      links: [
        // Root influenced by peer
        { source: 'peer', target: 'artist' },
        // Peer influenced by influence
        { source: 'influence', target: 'peer' },
        // Peer also influenced artist (mutual)
        { source: 'artist', target: 'peer' }
      ]
    }

    const filtered = filterUnreachableNodes(graph)

    // All nodes should be kept (all reachable)
    expect(filtered.nodes).toHaveLength(3)
    expect(filtered.links).toHaveLength(3)
  })

  it('filters complex orphaned subgraph', () => {
    const graph = {
      subject: 'Root',
      nodes: [
        { id: 'root', name: 'Root', depth: 0 },
        { id: 'connected1', name: 'Connected 1', depth: 1 },
        { id: 'connected2', name: 'Connected 2', depth: 2 },
        // Orphaned subgraph
        { id: 'orphan1', name: 'Orphan 1', depth: 1 },
        { id: 'orphan2', name: 'Orphan 2', depth: 2 },
        { id: 'orphan3', name: 'Orphan 3', depth: 2 }
      ],
      links: [
        { source: 'connected1', target: 'root' },
        { source: 'connected2', target: 'connected1' },
        // Orphaned subgraph links
        { source: 'orphan1', target: 'orphan2' },
        { source: 'orphan2', target: 'orphan3' },
        { source: 'orphan3', target: 'orphan1' }
      ]
    }

    const filtered = filterUnreachableNodes(graph)

    expect(filtered.nodes).toHaveLength(3)
    expect(filtered.nodes.map(n => n.id)).toEqual(['root', 'connected1', 'connected2'])
    expect(filtered.links).toHaveLength(2)
  })
})
