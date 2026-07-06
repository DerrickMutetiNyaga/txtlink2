/**
 * Client-side auth utilities
 */

export function isOwner(email?: string, userId?: string): boolean {
  if (typeof window === 'undefined') return false
  
  const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL
  const OWNER_USER_ID = process.env.NEXT_PUBLIC_OWNER_USER_ID
  
  if (!OWNER_EMAIL && !OWNER_USER_ID) return false
  
  if (email && OWNER_EMAIL) {
    return email.toLowerCase() === OWNER_EMAIL.toLowerCase()
  }
  
  if (userId && OWNER_USER_ID) {
    return userId === OWNER_USER_ID
  }
  
  return false
}

export function getRedirectPath(user: { email?: string; userId?: string; role?: string }): string {
  // Check if owner first
  if (isOwner(user.email, user.userId)) {
    return '/super-admin'
  }
  
  // Regular admin goes to admin pages
  if (user.role === 'admin') {
    return '/admin/users'
  }
  
  // Regular users go to app
  return '/app/dashboard'
}

/**
 * Clear authentication data and redirect to login
 */
export function logoutAndRedirect(): void {
  if (typeof window === 'undefined') return
  
  // Clear all auth-related data
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('isAuthenticated')
  
  // Store current path for redirect after login
  const currentPath = window.location.pathname
  if (currentPath && !currentPath.startsWith('/auth/')) {
    localStorage.setItem('redirectAfterLogin', currentPath)
  }
  
  // Redirect to login
  window.location.href = '/auth/login'
}

/**
 * Check if response is unauthorized and handle logout
 */
export function handleUnauthorized(response: Response): boolean {
  if (response.status === 401) {
    logoutAndRedirect()
    return true
  }
  return false
}

/**
 * Custom fetch wrapper that automatically handles 401 errors
 * Usage: const response = await authFetch('/api/endpoint', { method: 'GET' })
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  // Add authorization header if token exists
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    logoutAndRedirect()
    // Return a rejected promise to prevent further processing
    throw new Error('Unauthorized - redirecting to login')
  }
  
  return response
}

