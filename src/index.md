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
import {createGraphRenderer} from "./components/graphRenderer.js";
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
        renderer.showError("Please enter a person's name");
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        renderer.showError("Please set your API key in Settings first");
        return;
      }

      button.text("Generating...").attr("disabled", true);
      renderer.showLoading();

      try {
        const result = await generateInfluenceGraph(personName, apiKey);
        // Update hash (for sharing) WITHOUT reload
        window.location.hash = `data=${encodeURIComponent(JSON.stringify(result))}`;
        // Reactive update
        renderer.update(result);
        button.text("Generate Graph").attr("disabled", null);
      } catch (error) {
        renderer.showError(`Error: ${error.message}`);
        button.text("Generate Graph").attr("disabled", null);
      }
    });

  return container.node();
})()
```

```js
// Mock data for development
const mockDataFallback = {
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
```

```js
// Create renderer and get container
const renderer = createGraphRenderer(800, 600);
const graphContainer = renderer.render();

// Load initial data from hash or use mock data
const initialData = (() => {
  const hash = window.location.hash;
  if (hash.startsWith('#data=')) {
    try {
      return JSON.parse(decodeURIComponent(hash.slice(6)));
    } catch (e) {
      console.error('Failed to parse graph data from URL:', e);
      return mockDataFallback;
    }
  }
  return mockDataFallback;
})();

// Update with initial data
renderer.update(initialData);

// Display container
display(graphContainer);
```

```js
// Export dropdown
(() => {
  const container = d3.create("div")
    .style("margin-top", "12px")
    .style("position", "relative")
    .style("display", "inline-block");

  // Helper to get subject from hash
  function getSubject() {
    const hash = window.location.hash;
    let subject = 'graph';
    if (hash.startsWith('#data=')) {
      try {
        const data = JSON.parse(decodeURIComponent(hash.slice(6)));
        if (data.subject) {
          subject = data.subject.toLowerCase().replace(/\s+/g, '-');
        }
      } catch (e) {
        // Use default
      }
    }
    return subject;
  }

  let dropdownVisible = false;

  const exportButton = container.append("button")
    .text("Export ▼")
    .style("padding", "8px 16px")
    .style("background", "#444")
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "4px")
    .style("cursor", "pointer")
    .style("font-size", "14px")
    .on("click", (event) => {
      event.stopPropagation();
      dropdownVisible = !dropdownVisible;
      dropdown.style("display", dropdownVisible ? "block" : "none");
      exportButton.text(dropdownVisible ? "Export ▲" : "Export ▼");
    });

  // Dropdown menu
  const dropdown = container.append("div")
    .style("display", "none")
    .style("position", "absolute")
    .style("top", "100%")
    .style("left", "0")
    .style("margin-top", "4px")
    .style("background", "#333")
    .style("border-radius", "4px")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)")
    .style("z-index", "1000")
    .style("min-width", "140px");

  const exportOptions = [
    { label: "Export SVG", action: () => {
      const subject = getSubject();
      renderer.exportSvg(`${subject}-influences.svg`);
    }},
    { label: "Export PNG", action: () => {
      const subject = getSubject();
      renderer.exportPng(`${subject}-influences.png`, 2);
    }}
  ];

  exportOptions.forEach(({ label, action }) => {
    dropdown.append("button")
      .text(label)
      .style("display", "block")
      .style("width", "100%")
      .style("padding", "8px 16px")
      .style("background", "transparent")
      .style("color", "white")
      .style("border", "none")
      .style("text-align", "left")
      .style("cursor", "pointer")
      .style("font-size", "14px")
      .on("mouseover", function() {
        d3.select(this).style("background", "#444");
      })
      .on("mouseout", function() {
        d3.select(this).style("background", "transparent");
      })
      .on("click", () => {
        action();
        dropdown.style("display", "none");
        dropdownVisible = false;
        exportButton.text("Export ▼");
      });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (dropdownVisible) {
      dropdown.style("display", "none");
      dropdownVisible = false;
      exportButton.text("Export ▼");
    }
  });

  return container.node();
})()
```
