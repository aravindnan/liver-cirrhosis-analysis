import axios from 'axios'
import { ENV } from '../env/environment';
import { jwtDecode } from 'jwt-decode'

const TOKEN_COOKIE = 'userToken'

// AUTH SERVICES
export const loginUser = async(loginData:any)=>{
    try {
        const response = await axios.post(`${ENV}/login`, loginData);
        const { token, loginStatus } = response.data;
        if (loginStatus && token) {
          setCookieFunction(TOKEN_COOKIE, token, { path: '/' });
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

const clearCookie=(name:string)=>{
  // Expire in the past so the browser removes the cookie immediately
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

export const logoutUser = async(userId:any)=> {
  let logoutStatus;
  await axios.post(`${ENV}/logout`,{"userId": userId}).then((res:any)=>{
    clearCookie(TOKEN_COOKIE)
    logoutStatus = res
  }).catch((err:any)=>{
    console.error("Logout failed", err?.message);
    logoutStatus = err
  })
  return logoutStatus
}

// The token lives in a JS-readable cookie until the API sets an HttpOnly session cookie.
// Keep it short-lived, SameSite=Lax, and Secure on https.
export const setCookieFunction=(name:any, value:any, options:any)=> {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    cookieString += `;max-age=${options?.maxAge ?? 2 * 60 * 60}`;
    cookieString += `;path=${options?.path || '/'}`;
    cookieString += ';SameSite=Lax';
    if (window.location.protocol === 'https:') {
      cookieString += ';Secure';
    }
    document.cookie = cookieString;
}

export const getAuthToken = (): string | null => getCookieFunction(TOKEN_COOKIE)

// Returns the token payload, or null when there is no token, it is malformed, or it has expired.
export const getUserDetailsFromToken = ()=> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      if (typeof decoded.exp === 'number' && decoded.exp * 1000 <= Date.now()) {
        clearCookie(TOKEN_COOKIE)
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
}

function getCookieFunction(name:string) {
    const prefix = `${decodeURIComponent(name)}=`;
    for (const part of document.cookie.split(';')) {
      const cookie = part.trim();
      if (cookie.indexOf(prefix) === 0) {
        return decodeURIComponent(cookie.substring(prefix.length));
      }
    }
    return null;
}
