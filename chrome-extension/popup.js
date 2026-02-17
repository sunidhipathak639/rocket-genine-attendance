// Rocket Genie - Popup Script

const setupView = document.getElementById('setup-view')
const mainView = document.getElementById('main-view')
const errorView = document.getElementById('error-view')
const consentBtn = document.getElementById('give-consent')
const userPill = document.getElementById('user-pill')
const oauthBtn = document.getElementById('open-dashboard')

// Initialize popup
function init() {
  chrome.storage.local.get(
    ['isTracking', 'consentGiven', 'userId', 'serverUrl', 'authToken', 'userName'],
    (result) => {
      // 1. Not connected/authenticated
      if (!result.authToken) {
        mainView.classList.add('hidden')
        setupView.classList.add('hidden')
        userPill.classList.add('hidden')
        errorView.classList.remove('hidden')
        return
      }

      // 2. Need consent (first time)
      if (!result.consentGiven) {
        setupView.classList.remove('hidden')
        mainView.classList.add('hidden')
        userPill.classList.add('hidden')
        errorView.classList.add('hidden')
      } else {
        // 3. Fully active
        setupView.classList.add('hidden')
        mainView.classList.remove('hidden')
        errorView.classList.add('hidden')

        if (result.userName) {
          userPill.textContent = result.userName.split(' ')[0] // Compact name
          userPill.classList.remove('hidden')
        }
      }
    },
  )
}

init()

// Catch auto-config changes while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.authToken || changes.consentGiven || changes.userName)) {
    init()
  }
})

// Handle consent
consentBtn.addEventListener('click', () => {
  chrome.storage.local.set({ consentGiven: true, isTracking: true })
  init()
})

// Open Dashboard
oauthBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000' })
})
