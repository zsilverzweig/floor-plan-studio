const PREFIX = '[floor-plan-studio]'

/** Dev-only structured logging for Firestore / plan-open debugging. */
export function debugLog(scope: string, message: string, data?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  if (data !== undefined) {
    console.log(`${PREFIX} [${scope}] ${message}`, data)
  } else {
    console.log(`${PREFIX} [${scope}] ${message}`)
  }
}

export function debugWarn(scope: string, message: string, data?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  if (data !== undefined) {
    console.warn(`${PREFIX} [${scope}] ${message}`, data)
  } else {
    console.warn(`${PREFIX} [${scope}] ${message}`)
  }
}

export function debugError(scope: string, message: string, error: unknown): void {
  if (!import.meta.env.DEV) return
  console.error(`${PREFIX} [${scope}] ${message}`, error)
}
