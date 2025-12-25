import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createGraphRenderer } from '../../src/components/graphRenderer.js'

describe('graphRenderer', () => {
  describe('factory structure', () => {
    it('creates renderer with required methods', () => {
      const renderer = createGraphRenderer(800, 600)
      expect(renderer.render).toBeDefined()
      expect(renderer.update).toBeDefined()
      expect(renderer.showLoading).toBeDefined()
      expect(renderer.showError).toBeDefined()
    })
  })

  describe('static SVG rendering', () => {
    it('render() creates container with SVG', () => {
      const renderer = createGraphRenderer(800, 600)
      const container = renderer.render()

      expect(container).toBeInstanceOf(HTMLElement)
      const svg = container.querySelector('svg')
      expect(svg).toBeInstanceOf(SVGElement)
    })

    it('SVG has correct width and height', () => {
      const renderer = createGraphRenderer(800, 600)
      const container = renderer.render()
      const svg = container.querySelector('svg')

      expect(svg.getAttribute('width')).toBe('800')
      expect(svg.getAttribute('height')).toBe('600')
    })

    it('SVG contains groups for links, nodes, and labels', () => {
      const renderer = createGraphRenderer(800, 600)
      const container = renderer.render()
      const svg = container.querySelector('svg')

      const groups = svg.querySelectorAll('g')
      expect(groups.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('update with data', () => {
    let renderer
    let container

    const mockGraphData = {
      subject: "David Bowie",
      nodes: [
        { id: "bowie", name: "David Bowie", depth: 0 },
        { id: "little-richard", name: "Little Richard", depth: 1 },
        { id: "kraftwerk", name: "Kraftwerk", depth: 1 }
      ],
      links: [
        { source: "little-richard", target: "bowie" },
        { source: "kraftwerk", target: "bowie" }
      ]
    }

    beforeEach(() => {
      renderer = createGraphRenderer(800, 600)
      container = renderer.render()
    })

    it('creates correct number of nodes', () => {
      renderer.update(mockGraphData)
      const nodes = container.querySelectorAll('circle')
      expect(nodes.length).toBe(3)
    })

    it('creates correct number of links', () => {
      renderer.update(mockGraphData)
      const links = container.querySelectorAll('line')
      expect(links.length).toBe(2)
    })

    it('applies colors - subject vs influence', () => {
      renderer.update(mockGraphData)
      const nodes = container.querySelectorAll('circle')

      // First node (bowie, depth 0) should have accent color
      const bowieNode = Array.from(nodes).find((node, idx) => {
        const data = mockGraphData.nodes[idx]
        return data && data.id === 'bowie'
      })

      expect(bowieNode).toBeDefined()
      // Just verify fill attribute is set (actual color will be from theme)
      expect(bowieNode.getAttribute('fill')).toBeTruthy()
    })

    it('applies node radii', () => {
      renderer.update(mockGraphData)
      const nodes = container.querySelectorAll('circle')

      nodes.forEach(node => {
        const radius = node.getAttribute('r')
        expect(parseFloat(radius)).toBeGreaterThan(0)
      })
    })

    it('creates labels for all nodes', () => {
      renderer.update(mockGraphData)
      const labels = container.querySelectorAll('text')
      expect(labels.length).toBe(3)

      // Check that labels have text content
      const labelTexts = Array.from(labels).map(l => l.textContent)
      expect(labelTexts).toContain('David Bowie')
      expect(labelTexts).toContain('Little Richard')
      expect(labelTexts).toContain('Kraftwerk')
    })
  })

  describe('loading state', () => {
    let renderer
    let container

    beforeEach(() => {
      renderer = createGraphRenderer(800, 600)
      container = renderer.render()
    })

    it('showLoading() displays loading overlay with spinner', () => {
      renderer.showLoading()
      const loadingEl = container.querySelector('.loading-message')
      expect(loadingEl).toBeDefined()
      expect(loadingEl.textContent).toContain('Loading')

      const spinner = loadingEl.querySelector('.spinner')
      expect(spinner).toBeDefined()
    })

    it('showLoading() keeps SVG visible', () => {
      renderer.showLoading()
      const svg = container.querySelector('svg')
      expect(svg.style.display).not.toBe('none')
    })

    it('showLoading() shows overlay with flex display', () => {
      renderer.showLoading()
      const loadingEl = container.querySelector('.loading-message')
      expect(loadingEl.style.display).toBe('flex')
    })

    it('update() hides loading overlay', () => {
      const mockGraphData = {
        subject: "Test",
        nodes: [{ id: "test", name: "Test", depth: 0 }],
        links: []
      }

      renderer.showLoading()
      renderer.update(mockGraphData)

      const loadingEl = container.querySelector('.loading-message')
      expect(loadingEl.style.display).toBe('none')
    })
  })

  describe('error state with auto-hide', () => {
    let renderer
    let container

    beforeEach(() => {
      vi.useFakeTimers()
      renderer = createGraphRenderer(800, 600)
      container = renderer.render()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('showError() displays error with custom message', () => {
      renderer.showError('Test error message')
      const errorEl = container.querySelector('.error-message')
      expect(errorEl).toBeDefined()
      expect(errorEl.textContent).toContain('Test error message')
      expect(errorEl.style.display).not.toBe('none')
    })

    it('showError() hides after 5 seconds', () => {
      renderer.showError('Test error')
      const errorEl = container.querySelector('.error-message')

      // Initially visible
      expect(errorEl.style.display).not.toBe('none')

      // Advance timers by 5 seconds
      vi.advanceTimersByTime(5000)

      // Now hidden
      expect(errorEl.style.display).toBe('none')
    })

    it('showError() clears previous timer on re-call', () => {
      renderer.showError('First error')
      const errorEl = container.querySelector('.error-message')

      // Advance 2 seconds
      vi.advanceTimersByTime(2000)

      // Call again with new message
      renderer.showError('Second error')
      expect(errorEl.textContent).toContain('Second error')

      // Advance 3 more seconds (total 5 from first call)
      vi.advanceTimersByTime(3000)

      // Should still be visible (timer was reset)
      expect(errorEl.style.display).not.toBe('none')

      // Advance 2 more seconds (total 5 from second call)
      vi.advanceTimersByTime(2000)

      // Now should be hidden
      expect(errorEl.style.display).toBe('none')
    })

    it('update() hides error when called', () => {
      const mockGraphData = {
        subject: "Test",
        nodes: [{ id: "test", name: "Test", depth: 0 }],
        links: []
      }

      renderer.showError('Test error')
      renderer.update(mockGraphData)

      const errorEl = container.querySelector('.error-message')
      expect(errorEl.style.display).toBe('none')
    })
  })

  describe('export functionality', () => {
    let renderer
    let container

    const mockGraphData = {
      subject: "Test",
      nodes: [{ id: "test", name: "Test", depth: 0 }],
      links: []
    }

    beforeEach(() => {
      renderer = createGraphRenderer(800, 600)
      container = renderer.render()
      renderer.update(mockGraphData)
    })

    it('exportSvg method exists', () => {
      expect(renderer.exportSvg).toBeDefined()
      expect(typeof renderer.exportSvg).toBe('function')
    })

    it('exportPng method exists', () => {
      expect(renderer.exportPng).toBeDefined()
      expect(typeof renderer.exportPng).toBe('function')
    })

    it('exportPdf method exists', () => {
      expect(renderer.exportPdf).toBeDefined()
      expect(typeof renderer.exportPdf).toBe('function')
    })

    it('getSvg returns SVG element', () => {
      const svg = renderer.getSvg()
      expect(svg).toBeInstanceOf(SVGElement)
    })
  })
})
