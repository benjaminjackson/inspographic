import { describe, it, expect } from 'vitest';
import { createForceSimulation, calculateNodeDepths, calculateRadialDistance, calculateCollisionRadius, countNodeConnections, calculateNodeRadius } from '../../src/components/forceGraph.js';

describe('forceGraph', () => {
  it('exports createForceSimulation function', () => {
    expect(createForceSimulation).toBeDefined();
    expect(typeof createForceSimulation).toBe('function');
  });

  it('creates a d3-force simulation with nodes and links', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }];
    const links = [{ source: 'a', target: 'b' }];
    const simulation = createForceSimulation(nodes, links);

    expect(simulation).toBeDefined();
    expect(simulation.nodes).toBeDefined();
    expect(typeof simulation.nodes).toBe('function');
    expect(simulation.nodes()).toHaveLength(2);
  });
});

describe('calculateNodeDepths', () => {
  it('assigns depth 0 to subject node', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis' },
      { id: 'coltrane', name: 'John Coltrane' }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const result = calculateNodeDepths(nodes, links, 'miles');

    const subject = result.find(n => n.id === 'miles');
    expect(subject.depth).toBe(0);
  });

  it('assigns depth 1 to direct influences', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis' },
      { id: 'coltrane', name: 'John Coltrane' },
      { id: 'parker', name: 'Charlie Parker' }
    ];
    const links = [
      { source: 'coltrane', target: 'miles' },
      { source: 'parker', target: 'miles' }
    ];

    const result = calculateNodeDepths(nodes, links, 'miles');

    const coltrane = result.find(n => n.id === 'coltrane');
    const parker = result.find(n => n.id === 'parker');
    expect(coltrane.depth).toBe(1);
    expect(parker.depth).toBe(1);
  });

  it('assigns increasing depths for multi-level influences', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis' },
      { id: 'coltrane', name: 'John Coltrane' },
      { id: 'ellington', name: 'Duke Ellington' }
    ];
    const links = [
      { source: 'coltrane', target: 'miles' },
      { source: 'ellington', target: 'coltrane' }
    ];

    const result = calculateNodeDepths(nodes, links, 'miles');

    const subject = result.find(n => n.id === 'miles');
    const direct = result.find(n => n.id === 'coltrane');
    const indirect = result.find(n => n.id === 'ellington');

    expect(subject.depth).toBe(0);
    expect(direct.depth).toBe(1);
    expect(indirect.depth).toBe(2);
  });
});

describe('subject pinning', () => {
  it('pins subject node (depth 0) at center', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];
    const width = 800;
    const height = 600;

    const simulation = createForceSimulation(nodes, links, width, height);
    const simNodes = simulation.nodes();

    const subject = simNodes.find(n => n.depth === 0);
    expect(subject.fx).toBe(width / 2);
    expect(subject.fy).toBe(height / 2);
  });

  it('does not pin influence nodes', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const simNodes = simulation.nodes();

    const influence = simNodes.find(n => n.depth === 1);
    expect(influence.fx).toBeUndefined();
    expect(influence.fy).toBeUndefined();
  });
});

describe('radial force', () => {
  it('adds radial force to simulation', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const radialForce = simulation.force('radial');

    expect(radialForce).toBeDefined();
  });

  it('sets radial force strength to 0.5 (moderate)', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const radialForce = simulation.force('radial');

    expect(radialForce.strength()()).toBe(0.5);
  });
});

describe('collision force', () => {
  it('adds collision force to simulation', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const collisionForce = simulation.force('collision');

    expect(collisionForce).toBeDefined();
  });
});

describe('charge force', () => {
  it('adds charge force to simulation', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const chargeForce = simulation.force('charge');

    expect(chargeForce).toBeDefined();
  });

  it('sets charge force strength to -300 for strong repulsion', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const chargeForce = simulation.force('charge');

    expect(chargeForce.strength()()).toBe(-300);
  });
});

describe('initial position randomization', () => {
  it('sets randomized initial positions within canvas bounds for non-subject nodes', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 },
      { id: 'parker', name: 'Charlie Parker', depth: 1 },
      { id: 'ellington', name: 'Duke Ellington', depth: 1 }
    ];
    const links = [
      { source: 'coltrane', target: 'miles' },
      { source: 'parker', target: 'miles' },
      { source: 'ellington', target: 'miles' }
    ];
    const width = 800;
    const height = 600;

    const simulation = createForceSimulation(nodes, links, width, height);
    const simNodes = simulation.nodes();

    // Non-subject nodes should have initial positions set within canvas
    const influences = simNodes.filter(n => n.depth > 0);
    influences.forEach(node => {
      expect(node.x).toBeDefined();
      expect(node.y).toBeDefined();
      // Positions should be within reasonable bounds (80% of canvas, centered)
      expect(node.x).toBeGreaterThan(width * 0.1);
      expect(node.x).toBeLessThan(width * 0.9);
      expect(node.y).toBeGreaterThan(height * 0.1);
      expect(node.y).toBeLessThan(height * 0.9);
    });

    // Verify positions are actually different (not all the same)
    const xPositions = influences.map(n => n.x);
    const uniqueX = new Set(xPositions);
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  it('does not randomize subject node position (uses fixed center)', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];
    const width = 800;
    const height = 600;

    const simulation = createForceSimulation(nodes, links, width, height);
    const simNodes = simulation.nodes();
    const subject = simNodes.find(n => n.depth === 0);

    // Subject should be pinned at center
    expect(subject.fx).toBe(width / 2);
    expect(subject.fy).toBe(height / 2);
  });
});

describe('center force', () => {
  it('adds center force to simulation', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const centerForce = simulation.force('center');

    expect(centerForce).toBeDefined();
  });

  it('sets center force strength to 0.05 to prevent linear pull', () => {
    const nodes = [
      { id: 'miles', name: 'Miles Davis', depth: 0 },
      { id: 'coltrane', name: 'John Coltrane', depth: 1 }
    ];
    const links = [{ source: 'coltrane', target: 'miles' }];

    const simulation = createForceSimulation(nodes, links);
    const centerForce = simulation.force('center');

    expect(centerForce.strength()).toBe(0.05);
  });
});

describe('calculateRadialDistance', () => {
  it('returns 0 for depth 0 (center)', () => {
    const result = calculateRadialDistance(0, 1, 800, 600);
    expect(result).toBe(0);
  });

  it('calculates radius for depth 1 with few nodes', () => {
    const width = 800;
    const height = 600;
    const baseRadius = Math.min(width, height) / 4; // 150
    const nodeCount = 2;
    const scalingFactor = Math.max(1, Math.sqrt(nodeCount / 4)); // sqrt(0.5) = 0.707, but max with 1 = 1
    const expected = baseRadius * 1 * scalingFactor; // 150 * 1 * 1 = 150

    const result = calculateRadialDistance(1, nodeCount, width, height);
    expect(result).toBe(expected);
  });

  it('calculates radius for depth 1 with many nodes', () => {
    const width = 800;
    const height = 600;
    const baseRadius = Math.min(width, height) / 4; // 150
    const nodeCount = 16;
    const scalingFactor = Math.max(1, Math.sqrt(nodeCount / 4)); // sqrt(4) = 2
    const expected = baseRadius * 1 * scalingFactor; // 150 * 1 * 2 = 300

    const result = calculateRadialDistance(1, nodeCount, width, height);
    expect(result).toBe(expected);
  });

  it('calculates radius for depth 2', () => {
    const width = 800;
    const height = 600;
    const baseRadius = Math.min(width, height) / 4; // 150
    const nodeCount = 4;
    const scalingFactor = Math.max(1, Math.sqrt(nodeCount / 4)); // sqrt(1) = 1
    const expected = baseRadius * 2 * scalingFactor; // 150 * 2 * 1 = 300

    const result = calculateRadialDistance(2, nodeCount, width, height);
    expect(result).toBe(expected);
  });

  it('handles edge case: single node', () => {
    const result = calculateRadialDistance(1, 1, 800, 600);
    const expected = 150 * 1 * 1; // baseRadius * depth * max(1, sqrt(0.25))
    expect(result).toBe(expected);
  });

  it('handles edge case: many nodes (20)', () => {
    const width = 800;
    const height = 600;
    const baseRadius = 150;
    const nodeCount = 20;
    const scalingFactor = Math.max(1, Math.sqrt(nodeCount / 4)); // sqrt(5) ≈ 2.236
    const expected = baseRadius * 1 * scalingFactor;

    const result = calculateRadialDistance(1, nodeCount, width, height);
    expect(result).toBeCloseTo(expected, 2);
  });
});

describe('calculateCollisionRadius', () => {
  it('calculates radius for subject node (depth 0)', () => {
    const node = { id: 'miles', depth: 0 };
    const visualRadius = 12; // subject nodes are 12px
    const expected = visualRadius + 5 + (0 * 4); // 12 + 5 + 0 = 17

    const result = calculateCollisionRadius(node, 'miles');
    expect(result).toBe(expected);
  });

  it('calculates radius for depth 1 influence', () => {
    const node = { id: 'coltrane', depth: 1 };
    const visualRadius = 8; // influence nodes are 8px
    const expected = visualRadius + 5 + (1 * 4); // 8 + 5 + 4 = 17

    const result = calculateCollisionRadius(node, 'miles');
    expect(result).toBe(expected);
  });

  it('calculates radius for depth 2 node', () => {
    const node = { id: 'ellington', depth: 2 };
    const visualRadius = 8;
    const expected = visualRadius + 5 + (2 * 4); // 8 + 5 + 8 = 21

    const result = calculateCollisionRadius(node, 'miles');
    expect(result).toBe(expected);
  });

  it('uses larger visual radius for subject', () => {
    const subject = { id: 'bowie', depth: 0 };
    const influence = { id: 'kraftwerk', depth: 1 };

    const subjectRadius = calculateCollisionRadius(subject, 'bowie');
    const influenceRadius = calculateCollisionRadius(influence, 'bowie');

    // Subject: 12 + 5 + 0 = 17
    // Influence: 8 + 5 + 4 = 17
    expect(subjectRadius).toBe(17);
    expect(influenceRadius).toBe(17);
  });
});

describe('countNodeConnections', () => {
  it('returns 0 for node with no connections', () => {
    const node = { id: 'isolated' };
    const links = [];

    const result = countNodeConnections(node, links);
    expect(result).toBe(0);
  });

  it('returns 1 for node with one outgoing connection', () => {
    const node = { id: 'a' };
    const links = [{ source: 'a', target: 'b' }];

    const result = countNodeConnections(node, links);
    expect(result).toBe(1);
  });

  it('returns 1 for node with one incoming connection', () => {
    const node = { id: 'b' };
    const links = [{ source: 'a', target: 'b' }];

    const result = countNodeConnections(node, links);
    expect(result).toBe(1);
  });

  it('counts both incoming and outgoing connections', () => {
    const node = { id: 'miles' };
    const links = [
      { source: 'coltrane', target: 'miles' },
      { source: 'parker', target: 'miles' },
      { source: 'miles', target: 'davis' }
    ];

    const result = countNodeConnections(node, links);
    expect(result).toBe(3);
  });

  it('handles links with object references', () => {
    const nodeA = { id: 'a' };
    const nodeB = { id: 'b' };
    const links = [{ source: nodeA, target: nodeB }];

    const resultA = countNodeConnections(nodeA, links);
    const resultB = countNodeConnections(nodeB, links);

    expect(resultA).toBe(1);
    expect(resultB).toBe(1);
  });

  it('counts subject node with multiple influences', () => {
    const subject = { id: 'bowie' };
    const links = [
      { source: 'kraftwerk', target: 'bowie' },
      { source: 'iggy', target: 'bowie' },
      { source: 'eno', target: 'bowie' },
      { source: 'burroughs', target: 'bowie' },
      { source: 'warhol', target: 'bowie' },
      { source: 'little-richard', target: 'bowie' }
    ];

    const result = countNodeConnections(subject, links);
    expect(result).toBe(6);
  });
});

describe('calculateNodeRadius', () => {
  it('returns minimum radius for node with no connections', () => {
    const node = { id: 'isolated' };
    const links = [];
    const minRadius = 6;
    const maxRadius = 20;

    const result = calculateNodeRadius(node, links, minRadius, maxRadius);
    expect(result).toBe(minRadius);
  });

  it('returns scaled radius for node with one connection', () => {
    const node = { id: 'a' };
    const links = [{ source: 'a', target: 'b' }];
    const minRadius = 6;
    const maxRadius = 20;

    const result = calculateNodeRadius(node, links, minRadius, maxRadius);
    expect(result).toBeGreaterThan(minRadius);
    expect(result).toBeLessThanOrEqual(maxRadius);
  });

  it('returns larger radius for node with more connections', () => {
    const nodeA = { id: 'a' };
    const nodeB = { id: 'b' };
    const links = [
      { source: 'a', target: 'x' },
      { source: 'b', target: 'x' },
      { source: 'b', target: 'y' },
      { source: 'b', target: 'z' }
    ];

    const radiusA = calculateNodeRadius(nodeA, links, 6, 20);
    const radiusB = calculateNodeRadius(nodeB, links, 6, 20);

    expect(radiusB).toBeGreaterThan(radiusA);
  });

  it('caps radius at maximum for highly connected nodes', () => {
    const node = { id: 'hub' };
    const links = Array.from({ length: 100 }, (_, i) => ({
      source: 'hub',
      target: `node${i}`
    }));
    const minRadius = 6;
    const maxRadius = 20;

    const result = calculateNodeRadius(node, links, minRadius, maxRadius);
    expect(result).toBe(maxRadius);
  });

  it('uses default min/max when not provided', () => {
    const node = { id: 'a' };
    const links = [{ source: 'a', target: 'b' }];

    const result = calculateNodeRadius(node, links);
    expect(result).toBeGreaterThanOrEqual(6);
    expect(result).toBeLessThanOrEqual(20);
  });

  it('handles subject node with 6 connections (Bowie example)', () => {
    const subject = { id: 'bowie' };
    const links = [
      { source: 'kraftwerk', target: 'bowie' },
      { source: 'iggy', target: 'bowie' },
      { source: 'eno', target: 'bowie' },
      { source: 'burroughs', target: 'bowie' },
      { source: 'warhol', target: 'bowie' },
      { source: 'little-richard', target: 'bowie' }
    ];

    const result = calculateNodeRadius(subject, links, 6, 20);
    expect(result).toBeGreaterThan(6);
    expect(result).toBeLessThanOrEqual(20);
  });
});
