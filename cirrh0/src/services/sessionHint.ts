// The real credential is an HttpOnly cookie set by the API; page scripts cannot read it.
// We keep only a non-secret "session hint" (user id and expiry) so the UI knows whether to show
// the logged-in state. The server decides what the user may actually do.
const HINT_KEY = 'cirrh0_session_hint'
export const SESSION_MS = 2 * 60 * 60 * 1000

export type SessionHint = { id: string; exp: number }

export const writeSessionHint = (userId: string, now: number = Date.now()) => {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify({ id: userId, exp: now + SESSION_MS }))
  } catch (e) { /* storage unavailable: the user simply appears logged out */ }
}

export const clearSessionHint = () => {
  try { localStorage.removeItem(HINT_KEY) } catch (e) { /* ignore */ }
}

// Returns the hint while it is present, well formed and unexpired; otherwise clears it and returns null.
export const readSessionHint = (now: number = Date.now()): SessionHint | null => {
  try {
    const raw = localStorage.getItem(HINT_KEY)
    if (!raw) return null
    const hint = JSON.parse(raw) as SessionHint
    if (typeof hint?.id !== 'string' || typeof hint.exp !== 'number' || hint.exp <= now) {
      clearSessionHint()
      return null
    }
    return hint
  } catch (e) {
    return null
  }
}
