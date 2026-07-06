/**
 * Structured JSON logger for background services.
 *
 * Emits one JSON object per line so Render's log aggregation (and any
 * downstream log pipeline) can parse fields instead of scraping text.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void
  info(message: string, fields?: Record<string, unknown>): void
  warn(message: string, fields?: Record<string, unknown>): void
  error(message: string, fields?: Record<string, unknown>): void
  child(bindings: Record<string, unknown>): Logger
}

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

export function createLogger(
  minLevel: LogLevel = 'info',
  bindings: Record<string, unknown> = {}
): Logger {
  const threshold = LEVEL_ORDER[minLevel]

  const write = (level: LogLevel, message: string, fields?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < threshold) return
    const entry: Record<string, unknown> = {
      level,
      time: new Date().toISOString(),
      msg: message,
      ...bindings,
    }
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        entry[key] = serializeError(value)
      }
    }
    const line = JSON.stringify(entry)
    if (level === 'error') {
      process.stderr.write(line + '\n')
    } else {
      process.stdout.write(line + '\n')
    }
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    child: (childBindings) => createLogger(minLevel, { ...bindings, ...childBindings }),
  }
}
