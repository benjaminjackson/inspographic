/**
 * Download a string as a file
 * @param {string} content - The file content
 * @param {string} filename - The filename to save as
 * @param {string} mimeType - The MIME type (default: text/plain)
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
