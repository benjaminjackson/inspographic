/**
 * Filters out nodes that are not reachable from the root node.
 * Uses bidirectional BFS to find all nodes connected to the root.
 *
 * @param {Object} graph - The influence graph object
 * @param {string} graph.subject - The root person name
 * @param {Array} graph.nodes - Array of node objects with id, name, depth
 * @param {Array} graph.links - Array of link objects with source, target
 * @returns {Object} Filtered graph with only reachable nodes
 */
export function filterUnreachableNodes(graph) {
  const { nodes, links } = graph

  // Find root node (depth 0)
  const rootNode = nodes.find(n => n.depth === 0)
  if (!rootNode) {
    console.warn('No root node found in graph')
    return { ...graph, nodes: [], links: [] }
  }

  // Build bidirectional adjacency list
  const adjacency = new Map()
  nodes.forEach(n => adjacency.set(n.id, new Set()))

  links.forEach(link => {
    // Add both directions for traversal
    adjacency.get(link.source)?.add(link.target)
    adjacency.get(link.target)?.add(link.source)
  })

  // BFS from root to find all reachable nodes
  const reachable = new Set()
  const queue = [rootNode.id]
  reachable.add(rootNode.id)

  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = adjacency.get(current) || new Set()

    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  // Filter nodes and links
  const filteredNodes = nodes.filter(n => reachable.has(n.id))
  const filteredLinks = links.filter(
    link => reachable.has(link.source) && reachable.has(link.target)
  )

  // Log removal stats for debugging
  const removedNodes = nodes.length - filteredNodes.length
  const removedLinks = links.length - filteredLinks.length

  if (removedNodes > 0 || removedLinks > 0) {
    console.warn(
      `Filtered orphaned nodes: removed ${removedNodes} nodes and ${removedLinks} links`
    )
  }

  return {
    ...graph,
    nodes: filteredNodes,
    links: filteredLinks
  }
}
