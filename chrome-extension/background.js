// Rocket Genie Attendance Tracker - Background Script

let currentTab = null
let startTime = null
let isTracking = true
const BATCH_INTERVAL = 10000 // 10 seconds
let activityBuffer = []

// Load tracking state from storage
chrome.storage.local.get(['isTracking', 'consentGiven'], (result) => {
  if (result.isTracking !== undefined) {
    isTracking = result.isTracking
  }
})

// Helper to check if URL should be ignored
function shouldIgnore(url) {
  if (!url) return true
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.includes('pay.google.com') // Privacy focus
  )
}

// Record the end of an activity period
function recordActivity(url, tabId) {
  if (!isTracking || !url || shouldIgnore(url)) return

  const now = Date.now()
  if (startTime && currentTab) {
    const duration = Math.round((now - startTime) / 1000)
    if (duration > 0) {
      activityBuffer.push({
        url: currentTab.url,
        tabId: currentTab.id,
        startedAt: new Date(startTime).toISOString(),
        endedAt: new Date(now).toISOString(),
        duration: duration,
        isWorkRelated: true, // Placeholder logic
      })
    }
  }

  currentTab = { url, id: tabId }
  startTime = now
}

// Send buffered activity to Payload CMS
async function flushActivity() {
  if (activityBuffer.length === 0) return

  const result = await chrome.storage.local.get(['serverUrl', 'authToken'])
  const apiBaseUrl = result.serverUrl
  const apiToken = result.authToken

  if (!apiBaseUrl || !apiToken) {
    console.log('Sync skipped: Missing API config (Token or Server URL).')
    return
  }

  const activities = [...activityBuffer]
  activityBuffer = []

  try {
    for (const activity of activities) {
      const response = await fetch(`${apiBaseUrl}/api/tab-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${apiToken}`,
        },
        body: JSON.stringify(activity),
      })

      if (!response.ok) {
        console.error('Failed to sync activity:', await response.text())
      }
    }
  } catch (err) {
    console.error('Sync failure:', err)
    activityBuffer = [...activities, ...activityBuffer]
  }
}

// Listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  if (tab.incognito) return
  recordActivity(tab.url, tab.id)
})

// Listen for URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !tab.incognito) {
    recordActivity(changeInfo.url, tabId)
  }
})

// Periodic sync
setInterval(flushActivity, BATCH_INTERVAL)

// Auto-discover config from cookies
async function checkCookies(url) {
  if (!url) return
  const isDashboard = url.includes('localhost:300') || url.includes('naturevibes.fun')
  if (!isDashboard) return

  try {
    const cookie = await chrome.cookies.get({
      url: url,
      name: 'payload-token',
    })

    if (cookie && cookie.value) {
      const token = cookie.value
      const origin = new URL(url).origin

      // Decode JWT
      const payloadBase64 = token.split('.')[1]
      const payloadJson = atob(payloadBase64)
      const payload = JSON.parse(payloadJson)

      if (payload.id) {
        const result = await chrome.storage.local.get(['authToken', 'serverUrl'])
        if (result.authToken !== token || result.serverUrl !== origin) {
          await chrome.storage.local.set({
            authToken: token,
            serverUrl: origin,
            userId: payload.id,
            userName: payload.name || payload.email || 'User',
            consentGiven: true,
            isTracking: true,
          })
          console.log('Auto-configured from cookie:', origin, payload.name)
          isTracking = true
        }
      }
    } else {
      // Cookie missing on dashboard -> might be logged out
      // But only clear if we previously had a session for THIS origin
      const result = await chrome.storage.local.get(['serverUrl', 'authToken'])
      const origin = new URL(url).origin
      if (result.serverUrl === origin && result.authToken) {
        console.log('Session cookie lost on dashboard. Clearing config.')
        await chrome.storage.local.remove(['authToken', 'userId', 'userName'])
      }
    }
  } catch (err) {
    console.error('Cookie check failed:', err)
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'SESSION_EXPIRED') {
    console.log('Session expired message received. Clearing local config.')
    chrome.storage.local.remove(['authToken', 'userId', 'userName'])
  }
})

// Check cookies when tabs change
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkCookies(tab.url)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  if (tab.url) {
    checkCookies(tab.url)
  }
})

// Initial tab capture
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && !tabs[0].incognito) {
    recordActivity(tabs[0].url, tabs[0].id)
  }
})
