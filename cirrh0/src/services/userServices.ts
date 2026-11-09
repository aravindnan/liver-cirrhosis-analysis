import axios from "axios"
import { ENV } from "../env/environment"

// Resolves with the user document; rejects with the axios error (check error.response?.status).
export const getUserById = async (userId: string) => {
    const res = await axios.get(`${ENV}/get-user-by-id/${userId}`)
    return res.data
}
