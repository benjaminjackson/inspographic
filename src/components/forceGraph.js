import * as d3 from 'd3-force';

/**
 * Calculate radial distance for a given depth and node count
 * Dynamic spacing based on number of nodes at that depth
 */
export function calculateRadialDistance(depth, nodeCountAtDepth, width, height) {
  if (depth === 0) return 0;

  const baseRadius = Math.min(width, height) / 4;
  const scalingFactor = Math.max(1, Math.sqrt(nodeCountAtDepth / 4));
  return baseRadius * depth * scalingFactor;
}

/**
 * Calculate collision radius for a node
 * Depth-based padding prevents crowding at outer rings
 */
export function calculateCollisionRadius(node, subjectId) {
  const isSubject = node.id === subjectId;
  const visualRadius = isSubject ? 12 : 8;
  const basePadding = 5;
  const depthPadding = 4;
  const depth = node.depth || 0;

  return visualRadius + basePadding + (depth * depthPadding);
}

/**
 * Calculate depth for each node based on distance from subject
 * Uses breadth-first traversal from subject node
 */
export function calculateNodeDepths(nodes, links, subjectId) {
  // Create a copy of nodes to avoid mutation
  const nodesWithDepth = nodes.map(n => ({ ...n }));

  // Build adjacency map: target -> sources (who influences them)
  const influencedBy = new Map();
  links.forEach(link => {
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    if (!influencedBy.has(target)) {
      influencedBy.set(target, []);
    }
    influencedBy.get(target).push(source);
  });

  // BFS to assign depths
  const depths = new Map();
  const queue = [subjectId];
  depths.set(subjectId, 0);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentDepth = depths.get(currentId);

    // Get all nodes that influence the current node
    const influencers = influencedBy.get(currentId) || [];
    influencers.forEach(influencerId => {
      if (!depths.has(influencerId)) {
        depths.set(influencerId, currentDepth + 1);
        queue.push(influencerId);
      }
    });
  }

  // Assign depths to nodes
  nodesWithDepth.forEach(node => {
    node.depth = depths.get(node.id) || 0;
  });

  return nodesWithDepth;
}

export function createForceSimulation(nodes, links, width = 800, height = 600) {
  // Pin subject node (depth 0) at center
  const subject = nodes.find(n => n.depth === 0);
  if (subject) {
    subject.fx = width / 2;
    subject.fy = height / 2;
  }

  const subjectId = subject ? subject.id : null;

  // Count nodes at each depth for dynamic radius calculation
  const depthCounts = {};
  nodes.forEach(node => {
    const depth = node.depth || 0;
    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
  });

  // Radial force: pulls nodes toward their designated ring
  // Strength 0.5 = moderate (visible rings with flexibility)
  const radialForce = d3.forceRadial(
    node => {
      const depth = node.depth || 0;
      const nodeCountAtDepth = depthCounts[depth] || 1;
      return calculateRadialDistance(depth, nodeCountAtDepth, width, height);
    },
    width / 2,
    height / 2
  ).strength(0.5);

  // Collision force: prevents node overlap
  // Depth-based padding prevents crowding at outer rings
  const collisionForce = d3.forceCollide(
    node => calculateCollisionRadius(node, subjectId)
  );

  const simulation = d3.forceSimulation(nodes)
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('radial', radialForce)
    .force('collision', collisionForce);

  return simulation;
}
