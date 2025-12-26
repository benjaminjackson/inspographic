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
// API key warning message - reactive to key changes
(() => {
  const warning = d3.create("div")
    .attr("class", "warning-banner")
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
// Unified toolbar with input, generate, export, and settings
(() => {
  const toolbar = d3.create("div")
    .attr("class", "toolbar");

  // Top row: input and generate button
  const inputRow = toolbar.append("div")
    .attr("class", "toolbar-row");

  const input = inputRow.append("input")
    .attr("type", "text")
    .attr("class", "toolbar-input")
    .attr("placeholder", "e.g., 'Miles Davis' or 'John Williams composer'")
    .style("flex", "1");

  const generateButton = inputRow.append("button")
    .attr("class", "toolbar-button toolbar-button-primary")
    .text("Generate")
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

      generateButton.text("Generating...").attr("disabled", true);
      input.attr("disabled", true);
      renderer.showLoading(personName);

      try {
        const result = await generateInfluenceGraph(
          personName,
          apiKey,
          (entity) => renderer.showLoading(entity)
        );
        window.location.hash = `data=${encodeURIComponent(JSON.stringify(result))}`;
        renderer.update(result);
      } catch (error) {
        renderer.showError(`Error: ${error.message}`);
      } finally {
        generateButton.text("Generate").attr("disabled", null);
        input.attr("disabled", null);
      }
    });

  // Bottom row: export and settings buttons
  const buttonRow = toolbar.append("div")
    .attr("class", "toolbar-row");

  // Export dropdown
  const exportContainer = buttonRow.append("div")
    .attr("class", "export-dropdown");

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

  const exportButton = exportContainer.append("button")
    .attr("class", "toolbar-button toolbar-button-secondary")
    .text("Export ▼")
    .on("click", (event) => {
      event.stopPropagation();
      dropdownVisible = !dropdownVisible;
      dropdown.style("display", dropdownVisible ? "block" : "none");
      exportButton.text(dropdownVisible ? "Export ▲" : "Export ▼");
    });

  const dropdown = exportContainer.append("div")
    .attr("class", "export-dropdown-menu")
    .style("display", "none");

  const exportOptions = [
    { label: "Export SVG", action: () => {
      const subject = getSubject();
      renderer.exportSvg(`${subject}-influences.svg`);
    }},
    { label: "Export PNG", action: () => {
      const subject = getSubject();
      renderer.exportPng(`${subject}-influences.png`, 2);
    }},
    { label: "Export PDF", action: () => {
      const subject = getSubject();
      renderer.exportPdf(`${subject}-influences.pdf`);
    }}
  ];

  exportOptions.forEach(({ label, action }) => {
    dropdown.append("button")
      .attr("class", "export-dropdown-item")
      .text(label)
      .on("click", () => {
        action();
        dropdown.style("display", "none");
        dropdownVisible = false;
        exportButton.text("Export ▼");
      });
  });

  document.addEventListener('click', () => {
    if (dropdownVisible) {
      dropdown.style("display", "none");
      dropdownVisible = false;
      exportButton.text("Export ▼");
    }
  });

  // Settings button
  const settingsButton = buttonRow.append("button")
    .attr("class", "toolbar-button toolbar-button-secondary")
    .text("⚙ Settings")
    .on("click", () => settingsPanel.show());

  return toolbar.node();
})()
```

```js
// Help text for common names
(() => {
  const helpText = d3.create("div")
    .attr("class", "help-text")
    .text("💡 Tip: Add context for common names (e.g., 'John Williams composer' vs 'John Williams')");

  return helpText.node();
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
// Create renderer and get container (poster aspect ratio 2:3)
const renderer = createGraphRenderer(600, 900);
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

