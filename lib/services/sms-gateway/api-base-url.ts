/**
 * Canonical normalization for Android gateway API base URLs.
 */

import { GATEWAY_API_PATH } from './config'

export const INVALID_GATEWAY_API_BASE_URL_MESSAGE =
  'Invalid gateway API base URL. Reload the page from the public domain and generate a new connection code.'

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isLocalhostHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase()
  return LOCALHOST_HOSTS.has(h) || h.endsWith('.localhost')
}

export function isLocalhostUrl(raw: string): boolean {
  try {
    return isLocalhostHostname(new URL(raw).hostname)
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(raw)
  }
}

/**
 * Normalize a gateway API base URL to exactly:
 *   https://host/api/sms-gateway
 * (or http://… in local development only)
 */
export function normalizeGatewayApiBaseUrl(
  raw: string | null | undefined,
  options?: { forceProductionRules?: boolean }
): string {
  if (!raw || typeof raw !== 'string') {
    throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
  }

  const enforceProduction =
    options?.forceProductionRules === true
      ? true
      : options?.forceProductionRules === false
        ? false
        : isProductionEnv()

  if (enforceProduction) {
    if (isLocalhostHostname(url.hostname)) {
      throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
    }
    if (url.protocol !== 'https:') {
      throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
    }
  }

  // Collapse duplicated /api/sms-gateway segments and strip trailing slashes
  let pathname = url.pathname.replace(/\/+$/, '') || ''
  const pathPattern = /(?:\/api\/sms-gateway)+/gi
  if (pathPattern.test(pathname)) {
    pathname = pathname.replace(pathPattern, GATEWAY_API_PATH)
  } else if (!pathname || pathname === '/') {
    pathname = GATEWAY_API_PATH
  } else if (!pathname.endsWith(GATEWAY_API_PATH)) {
    pathname = `${pathname.replace(/\/+$/, '')}${GATEWAY_API_PATH}`
  }

  // Ensure exactly one /api/sms-gateway suffix
  while (pathname.includes(`${GATEWAY_API_PATH}${GATEWAY_API_PATH}`)) {
    pathname = pathname.replace(`${GATEWAY_API_PATH}${GATEWAY_API_PATH}`, GATEWAY_API_PATH)
  }
  if (!pathname.endsWith(GATEWAY_API_PATH)) {
    pathname = GATEWAY_API_PATH
  }

  return `${url.protocol}//${url.host}${pathname}`
}

export function resolveGatewayApiBaseUrlFromOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/+$/, '')
  return normalizeGatewayApiBaseUrl(`${trimmed}${GATEWAY_API_PATH}`)
}
