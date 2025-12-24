# inspographic

Network diagrams showing influences.

```js
import * as d3 from "npm:d3";
```

```js
import {createForceSimulation} from "./components/forceGraph.js";
```

```js
// Mock data for development
const mockData = {
  subject: { id: "bowie", name: "David Bowie", depth: 0 },
  influences: [
    { id: "little-richard", name: "Little Richard", depth: 1 },
    { id: "kraftwerk", name: "Kraftwerk", depth: 1 },
    { id: "velvet-underground", name: "The Velvet Underground", depth: 1 },
    { id: "iggy-pop", name: "Iggy Pop", depth: 1 },
    { id: "lindsay-kemp", name: "Lindsay Kemp", depth: 1 },
    { id: "kabuki", name: "Kabuki Theatre", depth: 1 }
  ],
  links: [
    { source: "little-richard", target: "bowie" },
    { source: "kraftwerk", target: "bowie" },
    { source: "velvet-underground", target: "bowie" },
    { source: "iggy-pop", target: "bowie" },
    { source: "lindsay-kemp", target: "bowie" },
    { source: "kabuki", target: "bowie" }
  ]
};
```

```js
// Combine subject and influences into nodes array
const nodes = [mockData.subject, ...mockData.influences];
const links = mockData.links;
```

```js
// Canvas dimensions
const width = 800;
const height = 600;
```

```js
// Create force simulation
const simulation = createForceSimulation(nodes, links, width, height);
```

```js
(() => {
  // SVG container with dark theme
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("background", "#1a1a1a");

  // Links
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#666")
    .attr("stroke-width", 2);

  // Nodes
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => d.id === "bowie" ? 12 : 8)
    .attr("fill", d => d.id === "bowie" ? "#ff6b6b" : "#4ecdc4");

  // Labels
  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text(d => d.name)
    .attr("font-size", 12)
    .attr("fill", "#fff")
    .attr("text-anchor", "middle")
    .attr("dy", 25);

  // Update positions on each tick
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  return svg.node();
})()
```
