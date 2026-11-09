import axios from 'axios'
import { ENV } from '../env/environment';

// The real credential is an HttpOnly cookie set by the API; page scripts cannot read it.
// We only keep a non-secret "session hint" (user id and expiry) so the UI knows whether to
// show the logged-in state. The server decides what the user may actually do.
const HINT_KEY = 'cirrh0_session_hint'
const SESSION_MS = 2 * 60 * 60 * 1000

type SessionHint = { _id: string; exp: number }

const writeHint = (userId: string) => {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify({ _id: userId, exp: Date.now() + SESSION_MS }))
  } catch (e) { /* storage unavailable: user simply appears logged out */ }
}

export const clearSessionHint = () => {
  try { localStorage.removeItem(HINT_KEY) } catch (e) { /* ignore */ }
}

// AUTH SERVICES
export const loginUser = async(loginData:any)=>{
    try {
        const response = await axios.post(`${ENV}/login`, loginData);
        if (response.data?.loginStatus && response.data?.userId) {
          writeHint(response.data.userId)
        }
        return response.data;
      } catch (error:any) {
        // Callers inspect the returned error (error.response.data.error)
        return error;
      }
}

export const registerUser = async(registerData:any)=>{
  let registrationResult
  await axios.post(`${ENV}/register`, registerData).then((res:any)=>{
    registrationResult = res.data
  }).catch((err:any)=>{
    console.error("Registration failed", err?.response?.data?.error || err?.message)
    registrationResult = err
  })
  return registrationResult
}

export const logoutUser = async(userId:any)=> {
  let logoutStatus;
  await axios.post(`${ENV}/logout`,{"userId": userId}).then((res:any)=>{
    clearSessionHint()
    logoutStatus = res
  }).catch((err:any)=>{
    console.error("Logout failed", err?.message);
    logoutStatus = err
  })
  return logoutStatus
}

// Returns { _id } while the session hint is present and unexpired, otherwise null.
export const getUserDetailsFromToken = (): SessionHint | null => {
    try {
      const raw = localStorage.getItem(HINT_KEY)
      if (!raw) return null
      const hint = JSON.parse(raw) as SessionHint
      if (typeof hint?._id !== 'string' || typeof hint.exp !== 'number' || hint.exp <= Date.now()) {
        clearSessionHint()
        return null
      }
      return hint
    } catch (e) {
      return null
    }
}
