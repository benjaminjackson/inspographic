import { create, select } from "d3-selection"
import { colors, typography } from "../theme.js"
import { createForceSimulation, calculateNodeRadius } from "./forceGraph.js"
import { downloadFile } from "../utils/downloadFile.js"
import jsPDF from "jspdf"

export function createGraphRenderer(width = 800, height = 600) {
  let container
  let svg
  let linkGroup
  let nodeGroup
  let labelGroup
  let linkSelection
  let nodeSelection
  let labelSelection
  let loadingElement
  let errorElement
  let errorTimer

  function render() {
    // Create container div
    container = document.createElement('div')
    container.style.position = 'relative'

    // Create SVG
    const svgElement = create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("background", colors.background)

    svg = svgElement.node()
    container.appendChild(svg)

    // Create groups for links, nodes, and labels
    const svgSelection = select(svg)
    // Add background rect for proper SVG export (CSS background doesn't export)
    svgSelection.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", colors.background)
    linkGroup = svgSelection.append("g").node()
    nodeGroup = svgSelection.append("g").node()
    labelGroup = svgSelection.append("g").node()

    // Create loading overlay with spinner (hidden by default)
    loadingElement = document.createElement('div')
    loadingElement.className = 'loading-message'
    loadingElement.style.display = 'none'
    loadingElement.style.position = 'absolute'
    loadingElement.style.top = '0'
    loadingElement.style.left = '0'
    loadingElement.style.width = '100%'
    loadingElement.style.height = '100%'
    loadingElement.style.background = 'rgba(0, 0, 0, 0.6)'
    loadingElement.style.zIndex = '10'
    loadingElement.style.display = 'none'
    loadingElement.style.alignItems = 'center'
    loadingElement.style.justifyContent = 'center'
    loadingElement.style.flexDirection = 'column'
    loadingElement.style.gap = '12px'

    // Spinner element
    const spinner = document.createElement('div')
    spinner.className = 'spinner'
    spinner.style.width = '40px'
    spinner.style.height = '40px'
    spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)'
    spinner.style.borderTop = '4px solid white'
    spinner.style.borderRadius = '50%'
    spinner.style.animation = 'spin 1s linear infinite'
    loadingElement.appendChild(spinner)

    // Loading text
    const loadingText = document.createElement('div')
    loadingText.textContent = 'Loading graph...'
    loadingText.style.color = 'white'
    loadingText.style.fontSize = '16px'
    loadingElement.appendChild(loadingText)

    // Add keyframes animation (only once)
    if (!document.getElementById('spinner-keyframes')) {
      const style = document.createElement('style')
      style.id = 'spinner-keyframes'
      style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'
      document.head.appendChild(style)
    }

    container.appendChild(loadingElement)

    // Create error message (hidden by default)
    errorElement = document.createElement('div')
    errorElement.className = 'error-message'
    errorElement.style.display = 'none'
    errorElement.style.position = 'absolute'
    errorElement.style.top = '20px'
    errorElement.style.left = '50%'
    errorElement.style.transform = 'translateX(-50%)'
    errorElement.style.color = '#ff6b6b'
    errorElement.style.fontSize = '16px'
    errorElement.style.padding = '12px 24px'
    errorElement.style.background = 'rgba(255, 107, 107, 0.1)'
    errorElement.style.borderRadius = '8px'
    errorElement.style.border = '1px solid rgba(255, 107, 107, 0.3)'
    container.appendChild(errorElement)

    return container
  }

  function update(graphData) {
    // Hide loading overlay and error message
    if (loadingElement) {
      loadingElement.style.display = 'none'
    }
    if (errorElement) {
      errorElement.style.display = 'none'
      // Clear any pending error timer
      if (errorTimer) {
        clearTimeout(errorTimer)
        errorTimer = null
      }
    }

    const nodes = graphData.nodes
    const links = graphData.links

    // Find subject node (depth 0)
    const subjectId = nodes.find(n => n.depth === 0)?.id

    // Update links
    linkSelection = select(linkGroup)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", colors.link)
      .attr("stroke-width", 2)

    // Update nodes
    nodeSelection = select(nodeGroup)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => calculateNodeRadius(d, links))
      .attr("fill", d => d.id === subjectId ? colors.nodeAccent : colors.nodeDefault)

    // Update labels
    labelSelection = select(labelGroup)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.name)
      .attr("font-family", typography.family)
      .attr("font-size", typography.labelSize)
      .attr("font-weight", typography.labelWeight)
      .attr("fill", colors.text)
      .attr("text-anchor", "middle")
      .attr("dy", 25)

    // Create and start force simulation
    const simulation = createForceSimulation(nodes, links, width, height)

    // Update positions on each tick
    simulation.on("tick", () => {
      linkSelection
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      nodeSelection
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)

      labelSelection
        .attr("x", d => d.x)
        .attr("y", d => d.y)
    })
  }

  function showLoading() {
    // Show loading overlay (SVG stays visible underneath)
    if (loadingElement) {
      loadingElement.style.display = 'flex'
    }
  }

  function showError(message) {
    // Clear any existing timer
    if (errorTimer) {
      clearTimeout(errorTimer)
      errorTimer = null
    }

    // Show error message
    if (errorElement) {
      errorElement.textContent = message
      errorElement.style.display = 'block'

      // Auto-hide after 5 seconds
      errorTimer = setTimeout(() => {
        errorElement.style.display = 'none'
        errorTimer = null
      }, 5000)
    }
  }

  function getSvg() {
    return svg
  }

  function exportSvg(filename = 'graph.svg') {
    if (!svg) {
      showError('No graph to export')
      return
    }
    const svgContent = svg.outerHTML
    downloadFile(svgContent, filename, 'image/svg+xml')
  }

  /**
   * Export graph as PNG with resolution scaling
   * @param {string} filename - Output filename
   * @param {number} scale - Resolution multiplier (1x, 2x, 4x)
   */
  function exportPng(filename = 'graph.png', scale = 1) {
    if (!svg) {
      showError('No graph to export')
      return
    }

    // Create a canvas with scaled dimensions
    const canvas = document.createElement('canvas')
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    canvas.width = scaledWidth
    canvas.height = scaledHeight

    const ctx = canvas.getContext('2d')

    // Create an image from the SVG
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      // Scale the context for higher resolution
      ctx.scale(scale, scale)

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0)

      // Convert canvas to PNG blob
      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = pngUrl
        link.download = filename
        link.click()

        // Clean up
        URL.revokeObjectURL(pngUrl)
        URL.revokeObjectURL(url)
      }, 'image/png')
    }

    img.onerror = () => {
      showError('Failed to export PNG')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  /**
   * Export graph as PDF
   * @param {string} filename - Output filename
   */
  function exportPdf(filename = 'graph.pdf') {
    if (!svg) {
      showError('No graph to export')
      return
    }

    // Create a canvas with 2x resolution for better quality
    const scale = 2
    const canvas = document.createElement('canvas')
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    canvas.width = scaledWidth
    canvas.height = scaledHeight

    const ctx = canvas.getContext('2d')

    // Create an image from the SVG
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      // Scale the context for higher resolution
      ctx.scale(scale, scale)

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0)

      // Convert to image data URL
      const imgData = canvas.toDataURL('image/png')

      // Create PDF with same aspect ratio
      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height]
      })

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, width, height)

      // Save PDF
      pdf.save(filename)

      // Clean up
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      showError('Failed to export PDF')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  return { render, update, showLoading, showError, getSvg, exportSvg, exportPng, exportPdf }
}
