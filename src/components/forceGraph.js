import * as d3 from 'd3-force';

export function createForceSimulation(nodes, links, width = 800, height = 600) {
  const simulation = d3.forceSimulation(nodes)
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('link', d3.forceLink(links).id(d => d.id));

  return simulation;
}
