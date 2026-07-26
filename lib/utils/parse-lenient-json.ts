/**
 * Parse JSON that may contain raw control characters inside string values
 * (e.g. AT Gateway inserting multi-line MESSAGE without escaping newlines).
 *
 * Strict JSON.parse first; on failure, escape unescaped controls inside strings
 * and retry once.
 */
export function parseLenientJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(escapeControlCharsInJsonStrings(raw))
  }
}

/**
 * Escape raw control characters that appear inside JSON string literals.
 * Leaves already-escaped sequences (e.g. \\n) untouched.
 */
export function escapeControlCharsInJsonStrings(input: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (!inString) {
      if (ch === '"') inString = true
      result += ch
      continue
    }

    // Inside a JSON string
    if (escaped) {
      result += ch
      escaped = false
      continue
    }

    if (ch === '\\') {
      result += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = false
      result += ch
      continue
    }

    const code = ch.charCodeAt(0)
    if (code <= 0x1f) {
      switch (ch) {
        case '\n':
          result += '\\n'
          break
        case '\r':
          result += '\\r'
          break
        case '\t':
          result += '\\t'
          break
        case '\b':
          result += '\\b'
          break
        case '\f':
          result += '\\f'
          break
        default:
          result += `\\u${code.toString(16).padStart(4, '0')}`
      }
      continue
    }

    result += ch
  }

  return result
}
