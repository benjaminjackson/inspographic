import * as d3 from 'd3-force';
import { scaleLinear } from 'd3-scale';

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
 * Count the number of connections (links) for a given node
 * Counts both incoming and outgoing connections
 */
export function countNodeConnections(node, links) {
  return links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return sourceId === node.id || targetId === node.id;
  }).length;
}

/**
 * Calculate node radius based on connection count using D3 scale
 * Scales linearly from minRadius to maxRadius based on connections
 */
export function calculateNodeRadius(node, links, minRadius = 6, maxRadius = 20) {
  const connectionCount = countNodeConnections(node, links);

  // Find max connections in the dataset for scaling
  const allNodes = new Set();
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    allNodes.add(sourceId);
    allNodes.add(targetId);
  });

  // Calculate max connections
  const maxConnections = Math.max(
    1, // at least 1 to avoid division by zero
    ...Array.from(allNodes).map(nodeId => {
      const count = links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === nodeId || targetId === nodeId;
      }).length;
      return count;
    })
  );

  // Create scale
  const radiusScale = scaleLinear()
    .domain([0, maxConnections])
    .range([minRadius, maxRadius])
    .clamp(true);

  return radiusScale(connectionCount);
}

/**
 * Calculate collision radius for a node
 * Depth-based padding prevents crowding at outer rings
 * Optionally accepts actual visual radius from calculateNodeRadius()
 */
export function calculateCollisionRadius(node, subjectId, visualRadius = null) {
  const basePadding = 5;
  const depthPadding = 4;
  const depth = node.depth || 0;

  // Use provided visualRadius if available, otherwise fall back to legacy values
  const nodeRadius = visualRadius !== null
    ? visualRadius
    : (node.id === subjectId ? 12 : 8);

  return nodeRadius + basePadding + (depth * depthPadding);
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

/**
 * Creates a D3 force simulation with parameters tuned for radial graph layout
 *
 * Force parameters optimized to prevent linear/flat layouts:
 * - Charge: -300 (strong repulsion spreads nodes in 2D space)
 * - Center: 0.05 strength (weak pull prevents linear alignment)
 * - Radial: 0.5 strength (moderate pull creates visible depth rings)
 * - Initial positions randomized to break symmetry
 *
 * @param {Array} nodes - Graph nodes with depth property
 * @param {Array} links - Graph edges
 * @param {number} width - Canvas width (default 800)
 * @param {number} height - Canvas height (default 600)
 * @returns {Object} D3 force simulation
 */
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

  // Group nodes by depth for angular distribution
  const nodesByDepth = {};
  nodes.forEach(node => {
    const depth = node.depth || 0;
    if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
    nodesByDepth[depth].push(node);
  });

  // Initialize positions: distribute nodes angularly around their depth ring
  // This creates circular layouts instead of linear/flat arrangements
  Object.entries(nodesByDepth).forEach(([depth, depthNodes]) => {
    const d = parseInt(depth);
    if (d === 0) return; // Skip subject (already pinned)

    const radius = calculateRadialDistance(d, depthNodes.length, width, height);
    const angleStep = (2 * Math.PI) / depthNodes.length;

    depthNodes.forEach((node, index) => {
      const angle = index * angleStep;
      node.x = width / 2 + radius * Math.cos(angle);
      node.y = height / 2 + radius * Math.sin(angle);
    });
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

  // Charge force: strong repulsion to spread nodes in 2D space
  const chargeForce = d3.forceManyBody().strength(-300);

  // Center force: weak pull to keep graph centered without creating linear layout
  const centerForce = d3.forceCenter(width / 2, height / 2).strength(0.05);

  // Link force: longer distance and weaker strength to allow radial layout
  // Distance of 100 prevents tight chains that override circular positioning
  // Strength of 0.3 (vs default 1.0) prioritizes radial force over link force
  const linkForce = d3.forceLink(links)
    .id(d => d.id)
    .distance(100)
    .strength(0.3);

  const simulation = d3.forceSimulation(nodes)
    .force('center', centerForce)
    .force('charge', chargeForce)
    .force('link', linkForce)
    .force('radial', radialForce)
    .force('collision', collisionForce);

  return simulation;
}
