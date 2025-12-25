# inspographic

Network diagrams showing influences.

<link rel="stylesheet" href="./components/settingsPanel.css">

```js
import * as d3 from "npm:d3";
```

```js
import {createForceSimulation, calculateNodeRadius} from "./components/forceGraph.js";
```

```js
import {colors, typography} from "./theme.js";
```

```js
import {createSettingsPanel} from "./components/settingsPanel.js";
```

```js
import {getApiKey, hasApiKey} from "./utils/apiKeyStorage.js";
```

```js
import {generateInfluenceGraph} from "./api/clientInfluenceApi.js";
```

```js
// Initialize settings panel
const settingsPanel = createSettingsPanel();
const panelElement = settingsPanel.render();
document.body.appendChild(panelElement);
```

```js
// Settings button (fixed position bottom-right)
(() => {
  const button = d3.create("button")
    .attr("class", "settings-button")
    .style("position", "fixed")
    .style("bottom", "20px")
    .style("right", "20px")
    .style("padding", "12px 20px")
    .style("background", colors.nodeAccent)
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "8px")
    .style("cursor", "pointer")
    .style("font-size", "16px")
    .style("font-weight", "500")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.2)")
    .style("transition", "all 0.2s")
    .style("z-index", "999")
    .text("⚙ Settings")
    .on("click", () => settingsPanel.show())
    .on("mouseover", function() {
      d3.select(this).style("transform", "translateY(-2px)")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");
    })
    .on("mouseout", function() {
      d3.select(this).style("transform", "translateY(0)")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.2)");
    });

  return button.node();
})()
```

```js
// API key warning message - reactive to key changes
(() => {
  const warning = d3.create("div")
    .style("padding", "16px")
    .style("background", "#fff3cd")
    .style("border", "1px solid #ffc107")
    .style("border-radius", "8px")
    .style("margin-bottom", "20px")
    .style("color", "#856404")
    .html("⚠️ <strong>No API key saved.</strong> Click Settings to enter your Exa API key.")
    .node();

  // Set initial visibility
  warning.style.display = hasApiKey() ? 'none' : 'block';

  // Update visibility when API key changes
  document.addEventListener('apiKeyChanged', () => {
    warning.style.display = hasApiKey() ? 'none' : 'block';
  });

  return warning;
})()
```

```js
// Person name input and generate button
(() => {
  const container = d3.create("div")
    .style("margin-bottom", "20px")
    .style("display", "flex")
    .style("gap", "10px")
    .style("align-items", "center");

  const input = container.append("input")
    .attr("type", "text")
    .attr("placeholder", "Enter a person's name (e.g., Miles Davis)")
    .style("flex", "1")
    .style("padding", "10px 12px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("font-size", "14px");

  const button = container.append("button")
    .text("Generate Graph")
    .style("padding", "10px 20px")
    .style("background", colors.nodeAccent)
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "4px")
    .style("cursor", "pointer")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("transition", "background 0.2s")
    .on("click", async () => {
      const personName = input.node().value.trim();
      if (!personName) {
        alert("Please enter a person's name");
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        alert("Please set your API key in Settings first");
        return;
      }

      button.text("Generating...").attr("disabled", true);

      try {
        const result = await generateInfluenceGraph(personName, apiKey);
        // Update graph data
        window.location.hash = `data=${encodeURIComponent(JSON.stringify(result))}`;
        window.location.reload();
      } catch (error) {
        alert(`Error: ${error.message}`);
        button.text("Generate Graph").attr("disabled", null);
      }
    });

  return container.node();
})()
```

```js
// Load graph data (from URL hash or use mock data)
const graphData = (() => {
  const hash = window.location.hash;
  if (hash.startsWith('#data=')) {
    try {
      const encoded = hash.slice(6);
      return JSON.parse(decodeURIComponent(encoded));
    } catch (e) {
      console.error('Failed to parse graph data from URL:', e);
    }
  }

  // Mock data for development
  return {
    subject: "David Bowie",
    nodes: [
      { id: "bowie", name: "David Bowie", depth: 0 },
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
})()
```

```js
// Extract nodes and links from graph data
const nodes = graphData.nodes;
const links = graphData.links;
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
    .style("background", colors.background);

  // Links
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", colors.link)
    .attr("stroke-width", 2);

  // Nodes with dynamic sizing based on connection count
  const subjectId = nodes.find(n => n.depth === 0)?.id;
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => calculateNodeRadius(d, links))
    .attr("fill", d => d.id === subjectId ? colors.nodeAccent : colors.nodeDefault);

  // Labels with Geist font
  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text(d => d.name)
    .attr("font-family", typography.family)
    .attr("font-size", typography.labelSize)
    .attr("font-weight", typography.labelWeight)
    .attr("fill", colors.text)
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
