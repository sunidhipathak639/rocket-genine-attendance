let pingInterval = setInterval(pingDashboard, 2000)

function pingDashboard() {
  // Prevent "Extension context invalidated" errors
  if (!chrome.runtime?.id) {
    if (pingInterval) clearInterval(pingInterval)
    return
  }

  try {
    chrome.storage.local.get(['isTracking', 'consentGiven'], (result) => {
      // Check again inside callback
      if (chrome.runtime?.id) {
        const isConnected = !!(result.isTracking && result.consentGiven)
        window.postMessage(
          {
            type: 'ROCKET_GENIE_EXTENSION_PONG',
            connected: isConnected,
          },
          '*',
        )
      }
    })
  } catch (_e) {
    // Ignore context errors
  }
}

// Initial ping
pingDashboard()

// Listen for messages from the page (optional, if page wants to request status)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ROCKET_GENIE_EXTENSION_PING') {
    pingDashboard()
  }
})
