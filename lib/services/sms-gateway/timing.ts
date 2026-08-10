/** Server timing helpers for Android gateway HTTPS routes. */

export function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

export function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(nowMs() - startedAt))
}

export function buildServerTimingHeader(parts: Record<string, number>): string {
  return Object.entries(parts)
    .filter(([, dur]) => Number.isFinite(dur))
    .map(([name, dur]) => `${name};dur=${Math.max(0, Math.round(dur))}`)
    .join(', ')
}
