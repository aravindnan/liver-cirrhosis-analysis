import axios from 'axios'
import { ENV } from '../env/environment';
import { clearSessionHint, readSessionHint, writeSessionHint } from './sessionHint'

// AUTH SERVICES
export const loginUser = async(loginData:any)=>{
    try {
        const response = await axios.post(`${ENV}/login`, loginData);
        if (response.data?.loginStatus && response.data?.userId) {
          writeSessionHint(response.data.userId)
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
export const getUserDetailsFromToken = () => readSessionHint()
