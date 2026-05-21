import axios from "axios"
import { ENV } from "../env/environment"

export const getUserById =async(userId:any)=>{
    let userData
    // console.log("USER ID in userservice : ",userId)
    await axios.get(`${ENV}/get-user-by-id/${userId}`).then((res:any)=>{
        // console.log("USERDATA : ",res.data)
         userData= res.data;
        // loginAction(res.data)
    }).catch((err:any)=>{
        userData =err
        console.error("Error : ", err);
    })
    
    return userData
}

