import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSettingsPanel } from '../../src/components/settingsPanel.js'

describe('settingsPanel', () => {
  let panel

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''
    // Clear localStorage
    localStorage.clear()
  })

  describe('structure', () => {
    it('creates a panel object with required methods', () => {
      panel = createSettingsPanel()

      expect(panel).toBeDefined()
      expect(typeof panel.render).toBe('function')
      expect(typeof panel.show).toBe('function')
      expect(typeof panel.hide).toBe('function')
      expect(typeof panel.isVisible).toBe('function')
      expect(typeof panel.getElement).toBe('function')
    })

    it('render creates DOM structure with overlay and container', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      expect(element).toBeInstanceOf(HTMLElement)
      expect(element.classList.contains('settings-overlay')).toBe(true)

      const container = element.querySelector('article')
      expect(container).toBeInstanceOf(HTMLElement)
    })

    it('contains header with title and close button', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      const header = element.querySelector('header')
      expect(header).toBeInstanceOf(HTMLElement)

      const title = header.querySelector('h2')
      expect(title.textContent).toContain('Settings')

      const closeBtn = header.querySelector('.close-button')
      expect(closeBtn).toBeInstanceOf(HTMLElement)
    })

    it('contains password input field', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      const input = element.querySelector('input[type="password"]')
      expect(input).toBeInstanceOf(HTMLInputElement)
      expect(input.placeholder).toBeTruthy()
    })

    it('contains save button', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      const saveBtn = element.querySelector('footer button:not(.contrast)')
      expect(saveBtn).toBeInstanceOf(HTMLElement)
      expect(saveBtn.textContent).toContain('Save')
    })

    it('contains clear button', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      const clearBtn = element.querySelector('button.contrast')
      expect(clearBtn).toBeInstanceOf(HTMLElement)
      expect(clearBtn.textContent).toContain('Clear')
    })

    it('contains warning element for missing key', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      const warning = element.querySelector('.api-key-warning')
      expect(warning).toBeInstanceOf(HTMLElement)
    })

    it('is hidden by default', () => {
      panel = createSettingsPanel()
      const element = panel.render()

      expect(panel.isVisible()).toBe(false)
      expect(element.classList.contains('hidden')).toBe(true)
    })
  })

  describe('show and hide', () => {
    it('show() makes panel visible', () => {
      panel = createSettingsPanel()
      panel.render()

      panel.show()
      expect(panel.isVisible()).toBe(true)
    })

    it('hide() makes panel hidden', () => {
      panel = createSettingsPanel()
      panel.render()

      panel.show()
      panel.hide()
      expect(panel.isVisible()).toBe(false)
    })

    it('show() focuses the input field', () => {
      panel = createSettingsPanel()
      const element = panel.render()
      document.body.appendChild(element)

      panel.show()
      const input = element.querySelector('input')
      expect(document.activeElement).toBe(input)

      document.body.removeChild(element)
    })
  })

  describe('event handlers', () => {
    beforeEach(() => {
      panel = createSettingsPanel()
      const element = panel.render()
      document.body.appendChild(element)
    })

    it('save button saves API key to localStorage', () => {
      const input = document.querySelector('#api-key-input')
      const saveBtn = document.querySelector('footer button:not(.contrast)')

      input.value = 'test-key-123'
      saveBtn.click()

      expect(localStorage.getItem('inspographic.exa.apiKey')).toBe('test-key-123')
    })

    it('clear button shows confirmation before clearing', () => {
      // Setup existing key
      localStorage.setItem('inspographic.exa.apiKey', 'existing-key')

      // Mock window.confirm to return false (cancel)
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const clearBtn = document.querySelector('button.contrast')
      clearBtn.click()

      expect(confirmSpy).toHaveBeenCalled()
      expect(localStorage.getItem('inspographic.exa.apiKey')).toBe('existing-key')

      confirmSpy.mockRestore()
    })

    it('clear button clears API key when confirmed', () => {
      // Setup existing key
      localStorage.setItem('inspographic.exa.apiKey', 'existing-key')

      // Mock window.confirm to return true (OK)
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const clearBtn = document.querySelector('button.contrast')
      clearBtn.click()

      expect(confirmSpy).toHaveBeenCalled()
      expect(localStorage.getItem('inspographic.exa.apiKey')).toBeNull()

      confirmSpy.mockRestore()
    })

    it('close button hides panel', () => {
      panel.show()
      const closeBtn = document.querySelector('.close-button')

      closeBtn.click()
      expect(panel.isVisible()).toBe(false)
    })

    it('ESC key hides panel', () => {
      panel.show()

      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escEvent)

      expect(panel.isVisible()).toBe(false)
    })

    it('overlay click hides panel', () => {
      panel.show()
      const overlay = panel.getElement()

      overlay.click()
      expect(panel.isVisible()).toBe(false)
    })

    it('clicking inside container does not hide panel', () => {
      panel.show()
      const container = document.querySelector('article')

      container.click()
      expect(panel.isVisible()).toBe(true)
    })

    it('dispatches apiKeyChanged event when key is saved', () => {
      const eventSpy = vi.fn()
      document.addEventListener('apiKeyChanged', eventSpy)

      const input = document.querySelector('#api-key-input')
      const saveBtn = document.querySelector('footer button:not(.contrast)')

      input.value = 'test-key-123'
      saveBtn.click()

      expect(eventSpy).toHaveBeenCalled()
      document.removeEventListener('apiKeyChanged', eventSpy)
    })

    it('dispatches apiKeyChanged event when key is cleared', () => {
      localStorage.setItem('inspographic.exa.apiKey', 'existing-key')

      const eventSpy = vi.fn()
      document.addEventListener('apiKeyChanged', eventSpy)

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const clearBtn = document.querySelector('button.contrast')
      clearBtn.click()

      expect(eventSpy).toHaveBeenCalled()

      confirmSpy.mockRestore()
      document.removeEventListener('apiKeyChanged', eventSpy)
    })
  })
})
