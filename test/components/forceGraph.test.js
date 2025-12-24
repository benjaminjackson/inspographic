import { describe, it, expect } from 'vitest';
import { createForceSimulation, calculateNodeDepths, calculateRadialDistance, calculateCollisionRadius } from '../../src/components/forceGraph.js';

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
