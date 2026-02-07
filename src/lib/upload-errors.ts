/** User-friendly message when upload fails (e.g. storage quota). */
export function getUploadErrorMessage(apiMessage: string): string {
  const lower = apiMessage.toLowerCase()
  if (
    lower.includes('quota') ||
    lower.includes('storage quota') ||
    lower.includes('1gb') ||
    lower.includes('maximum')
  ) {
    return "Storage limit reached (1GB). Ask an admin to free space: run 'npm run clear-blob' in the project, or try again in a few minutes."
  }
  if (lower.includes('blob_read_write_token') || lower.includes('not configured')) {
    return 'Upload is not configured. Contact support to set up file storage.'
  }
  return apiMessage
}
