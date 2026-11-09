import axios from 'axios'
import { ENV } from '../env/environment'
import { getAuthToken } from './authServices'

// Attach the session token to calls to our own API only. Third-party calls
// (for example the Cloudinary upload) must never receive it.
axios.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token && typeof config.url === 'string' && config.url.startsWith(ENV)) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})
