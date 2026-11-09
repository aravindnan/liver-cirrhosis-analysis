import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getUserById } from '../services/userServices'
import { clearSessionHint, readSessionHint } from '../services/sessionHint'
import { AuthStatus, UserProfile } from './types'

type AuthValue = {
  user: UserProfile | null
  status: AuthStatus
  // Re-fetch the profile (after login, or after changing the user's reports).
  refresh: () => Promise<void>
  // Clear local auth state once the server has ended the session.
  signedOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const isUser = (value: any): value is UserProfile => typeof value?.id === 'string'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (readSessionHint() ? 'loading' : 'anonymous'))

  const refresh = useCallback(async () => {
    const hint = readSessionHint()
    if (!hint) {
      setUser(null)
      setStatus('anonymous')
      return
    }
    try {
      const profile = await getUserById(hint.id)
      if (!isUser(profile)) throw new Error('unexpected profile response')
      setUser(profile)
      setStatus('authenticated')
    } catch (error: any) {
      const code = error?.response?.status
      if (code === 401 || code === 403 || code === 404) {
        // The session is gone or the account no longer exists.
        clearSessionHint()
        setUser(null)
        setStatus('anonymous')
      } else {
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signedOut = useCallback(() => {
    clearSessionHint()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(() => ({ user, status, refresh, signedOut }), [user, status, refresh, signedOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Shape the existing page components already render against.
export function useAuthPage() {
  const { user, status, refresh } = useAuth()
  const pageLoading = status === 'loading' ? 'not-loaded' : status === 'error' ? 'error' : 'loaded'
  return { myProfiledata: user, pageLoading, networkError: status === 'error', refresh }
}
