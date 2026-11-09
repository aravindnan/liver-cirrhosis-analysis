import axios from 'axios'
import { ENV } from '../env/environment'
import { clearSessionHint } from './sessionHint'

const isOurApi = (url?: string) => typeof url === 'string' && url.startsWith(ENV)

// Send the session cookie to our own API only. Third-party calls (for example the Cloudinary
// upload) must not carry credentials.
axios.interceptors.request.use((config) => {
  if (isOurApi(config.url)) config.withCredentials = true
  return config
})

// When the API says the session is gone (expired or revoked), drop the local hint so the UI
// returns to the logged-out state. Login failures are also 401, so they are left alone.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url: string | undefined = error?.config?.url
    if (status === 401 && isOurApi(url) && !url?.endsWith('/login')) {
      clearSessionHint()
    }
    return Promise.reject(error)
  }
)
