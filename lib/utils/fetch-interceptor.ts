/**
 * Global fetch interceptor to handle 401 responses
 * This intercepts all fetch calls and redirects to login on 401
 */

import { logoutAndRedirect } from './auth'

// Store original fetch
const originalFetch = typeof window !== 'undefined' ? window.fetch : global.fetch

// Track if we're already redirecting to prevent loops
let isRedirecting = false

// Track if interceptor is already set up
let isSetup = false

/**
 * Initialize the fetch interceptor
 * Call this once in your app (e.g., in root layout or PortalLayout)
 */
export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return
  
  // Don't set up if already set up
  if (isSetup) return
  isSetup = true

  // Override global fetch
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Call original fetch
    const response = await originalFetch(input, init)

    // Check for 401 Unauthorized
    if (response.status === 401 && !isRedirecting) {
      // Check if this is an API route (not auth routes)
      const url = typeof input === 'string' 
        ? input 
        : input instanceof URL 
          ? input.toString() 
          : input.url
      
      // Only redirect for API routes (not auth routes) and if not already on login page
      if (url && url.includes('/api/') && !url.includes('/api/auth/')) {
        const currentPath = window.location.pathname
        if (!currentPath.startsWith('/auth/')) {
          isRedirecting = true
          logoutAndRedirect()
        }
      }
    }

    return response
  }
}

/**
 * Remove the fetch interceptor (for testing or cleanup)
 */
export function removeFetchInterceptor() {
  if (typeof window === 'undefined') return
  window.fetch = originalFetch
  isSetup = false
  isRedirecting = false
}

