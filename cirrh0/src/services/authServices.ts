import axios from 'axios'
import { ENV} from '../env/environment';
import { jwtDecode } from 'jwt-decode'
// AUTH SERVICES
export const loginUser = async(loginData:any)=>{
    try {
        // Make a POST request to the login API endpoint
        // console.log("Inside Login Service Frontend");
        
        const response = await axios.post(`${ENV}/login`, loginData);
    
        // console.log("RESPONSE.DATA : ",response.data);

        const { token, loginStatus } = response.data; 
        if (loginStatus) {
          // Assuming you have a cookie library or a function to set cookies
          // Replace 'setCookieFunction' with the actual function you are using
          setCookieFunction('userToken', token, { path: '/' });
        }
    
        
        // Return the response data
        return response.data;
      } catch (error:any) {
        // Handle errors and return an error object
        return error;
      }
}

export const registerUser = async(registerData:any)=>{
   
  let registrationResult
        // Make a POST request to the register API endpoint
        await axios.post(`${ENV}/register`, registerData).then((res:any)=>{
          // console.log("(inservice) RESGISTRATION SUCCESS",res)
          registrationResult =res.data
        }).catch((err:any)=>{
          console.error("ERROR",err)
          registrationResult= err
        })
        return registrationResult
}

const clearCookie=(name:any)=>{
  const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 1);
    // Format the expiration time for the cookie
    const formattedExpirationTime = expirationTime.toUTCString();
    // Set the cookie with the calculated expiration time
    document.cookie = `${name}=; expires=${formattedExpirationTime}; path=/;`
}


export const logoutUser = async(userId:any)=> {

  let logoutStatus;
    await axios.post(`${ENV}/logout`,{"userId": userId}).then((res:any)=>{
        clearCookie('userToken')
        // console.log("inside Logged out Successfully",res.data)
        logoutStatus = (res)
       
    }).catch((err:any)=>{
      console.error("Error ",err);
      logoutStatus = err
    })

    return logoutStatus
  }



export const setCookieFunction=(name:any, value:any, options:any)=> {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  
    if (options.expires) {
      const expires = new Date();
      expires.setDate(expires.getDate() + options.expires);
      cookieString += `;expires=${expires.toUTCString()}`;
    }
  
    if (options.path) {
      cookieString += `;path=${options.path}`;
    }
  
    document.cookie = cookieString;
  }
export const getUserDetailsFromToken = ()=> { 
    // Replace 'getCookieFunction' with the actual function you are using to get cookies
    const token = getCookieFunction('userToken');
  
    if (token) {
      try {
        // Replace 'your-secret-key' with the secret key used for JWT encoding on the server
        const decoded =  jwtDecode(token);
        // 'decoded' will contain the payload of the JWT token
        // console.log('Decoded Token:', decoded);
  
        return decoded;
      } catch (error) {
        // Handle token verification errors, e.g., token expired, invalid signature, etc.
        // console.error('Token verification failed:', error);
        return null;
      }
    } else {
      // Handle the case when the token is not present in the cookie
      // console.error('Token not found in the cookie');
      return null;
    }
  }

function getCookieFunction(name:any) {
    const decodedName = decodeURIComponent(name);
    const cookieArray = document.cookie.split(';');
  
    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i].trim();
  
      // Check if the cookie starts with the provided name
      if (cookie.indexOf(`${decodedName}=`) === 0) {
        // Return the value of the cookie
        return cookie.substring(decodedName.length + 1);
      }
    }
  
    // Return null if the cookie with the provided name is not found
    return null;
  }