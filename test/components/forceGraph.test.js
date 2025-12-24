import { describe, it, expect } from 'vitest';
import { createForceSimulation } from '../../src/components/forceGraph.js';

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
