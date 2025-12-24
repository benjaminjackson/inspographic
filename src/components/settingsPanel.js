import { getApiKey, saveApiKey, clearApiKey, hasApiKey } from '../utils/apiKeyStorage.js'

/**
 * Create a settings panel for API key management
 * @returns {Object} Panel object with methods
 */
export function createSettingsPanel() {
  let element = null
  let input = null
  let warning = null

  /**
   * Create and return the DOM structure
   * @returns {HTMLElement} The panel element
   */
  function render() {
    // Create overlay
    element = document.createElement('div')
    element.className = 'settings-overlay hidden'

    // Create container
    const container = document.createElement('div')
    container.className = 'settings-container'

    // Header
    const header = document.createElement('div')
    header.className = 'settings-header'

    const title = document.createElement('h2')
    title.className = 'settings-title'
    title.textContent = 'Settings'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'close-button'
    closeBtn.textContent = '×'
    closeBtn.setAttribute('aria-label', 'Close settings')

    header.appendChild(title)
    header.appendChild(closeBtn)

    // Warning message
    warning = document.createElement('div')
    warning.className = 'api-key-warning'
    warning.textContent = 'No API key saved. Enter your Exa API key to generate influence graphs.'

    // Input field
    const inputLabel = document.createElement('label')
    inputLabel.textContent = 'Exa API Key'
    inputLabel.setAttribute('for', 'api-key-input')

    input = document.createElement('input')
    input.type = 'password'
    input.id = 'api-key-input'
    input.placeholder = 'Enter your Exa API key'
    input.value = getApiKey() || ''

    // Button container
    const buttonContainer = document.createElement('div')
    buttonContainer.className = 'button-container'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'save-button'
    saveBtn.textContent = 'Save'

    const clearBtn = document.createElement('button')
    clearBtn.className = 'clear-button'
    clearBtn.textContent = 'Clear'

    buttonContainer.appendChild(saveBtn)
    buttonContainer.appendChild(clearBtn)

    // Assemble
    container.appendChild(header)
    container.appendChild(warning)
    container.appendChild(inputLabel)
    container.appendChild(input)
    container.appendChild(buttonContainer)

    element.appendChild(container)

    // Setup event handlers
    setupEventHandlers(closeBtn, saveBtn, clearBtn, container)

    // Update warning visibility
    updateWarningVisibility()

    return element
  }

  /**
   * Setup event handlers for panel interactions
   */
  function setupEventHandlers(closeBtn, saveBtn, clearBtn, container) {
    // Close button
    closeBtn.addEventListener('click', () => {
      hide()
    })

    // Save button
    saveBtn.addEventListener('click', () => {
      const value = input.value.trim()
      if (value) {
        saveApiKey(value)
        updateWarningVisibility()
        document.dispatchEvent(new CustomEvent('apiKeyChanged'))
      }
    })

    // Clear button with confirmation
    clearBtn.addEventListener('click', () => {
      const confirmed = window.confirm('Are you sure you want to clear your API key?')
      if (confirmed) {
        clearApiKey()
        input.value = ''
        updateWarningVisibility()
        document.dispatchEvent(new CustomEvent('apiKeyChanged'))
      }
    })

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isVisible()) {
        hide()
      }
    })

    // Overlay click to close (but not container click)
    element.addEventListener('click', (e) => {
      if (e.target === element) {
        hide()
      }
    })

    // Prevent clicks inside container from closing
    container.addEventListener('click', (e) => {
      e.stopPropagation()
    })
  }

  /**
   * Show the panel
   */
  function show() {
    if (element) {
      element.classList.remove('hidden')
      if (input) {
        input.focus()
      }
    }
  }

  /**
   * Hide the panel
   */
  function hide() {
    if (element) {
      element.classList.add('hidden')
    }
  }

  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  function isVisible() {
    return element && !element.classList.contains('hidden')
  }

  /**
   * Get the panel element
   * @returns {HTMLElement|null}
   */
  function getElement() {
    return element
  }

  /**
   * Update warning visibility based on API key presence
   */
  function updateWarningVisibility() {
    if (warning) {
      warning.style.display = hasApiKey() ? 'none' : 'block'
    }
  }

  return {
    render,
    show,
    hide,
    isVisible,
    getElement
  }
}
