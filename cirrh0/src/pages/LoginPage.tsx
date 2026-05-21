import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LogoText from '../components/LogoText'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { colors } from '@mui/material'
import { getUserDetailsFromToken, loginUser } from '../services/authServices'
import { useDispatch, useSelector } from 'react-redux'
import ErrorBox from '../components/ErrorBox'
import APIResponseStatus from '../components/APIResponseStatus'
import Loader from '../assets/Loader'

function LoginPage() {
  const dispatch = useDispatch()

  const [showPassword,setShowPassword] = useState<Boolean>(false)
  const [forgotPasswordModal, setForgotPasswordModal] = useState<Boolean>(false);
  const [loginStatus,setLoginStatus] = useState<any>("not-loggedin")
  const [error, setError] = useState<string | null>(null);
  const [apiResponseMessage,setApiResponseMessage] = useState<string>("")
  const [loginUserId,setLoginUserId]=useState<any>(null)
  const navigate = useNavigate();


  
  const retryLogin=()=>{
    setLoginFormData(emptyState)
    setLoginStatus("not-loggedin")
  }

  useEffect(() => {
    const existingUser:any = getUserDetailsFromToken()
    // console.log("EXISITING USER ID : ",existingUser)

    if (existingUser?._id) {
       navigate("/")
    }
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0,0)
    const timer = setTimeout(() => {
      setError(null);
    }, 3000);
    // Clear the timeout if the component unmounts or if there's a new error
    return () => clearTimeout(timer);
  }, [error]);

  const emptyState = {
    username: "",
    password: "",
  };

  const [loginFormData, setLoginFormData]: any = useState<any>(emptyState);

  const handleInputChange = (e: any) => {
    // if enter is pressed  and form is validated then submit the for     
       setLoginFormData({
      ...loginFormData,
      [e.target.name]: e.target.value,


    });

    console.log("LOGINNDATA",loginFormData)
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const validateBeforeSubmit = () => {
    // Check if username and password are not empty
    if (!loginFormData.username.trim()) {
      setError("Username cannot be empty");
      return false;
    } else if (!loginFormData.password.trim()) {
      console.log("password is empty")
      setError("Password cannot be empty"); 
      return false;
    }
    return true;
  };


  const handleSubmit = async() => {
    if (validateBeforeSubmit()) {
      setLoginStatus("login-loading")
      // Perform registration logic here call API
      // console.log("Perform registration logic");
      await loginUser(loginFormData).then((res:any)=>{
        if(res.success){
          setLoginStatus("login-success")
          navigate(`/`)
          // console.log("Login Response : ",res);
          setApiResponseMessage(res.message)
          setLoginUserId(window.atob(res.userId))
        }
        else{
          setLoginStatus("login-failure")
          console.error("LOGIN FAILURE : ",res)
          setApiResponseMessage(res.response.data.error)
          
        }

      }).catch((err:any)=>{
        setLoginStatus("login-failure")
        setError(err.error)
        console.error("Error : ",err);
      })
      setLoginFormData(emptyState);
    } else {
      // Display error message
      console.error("Validation failed. Display error message.");
    }
  };

  const myProfiledata = useSelector(
    (state: any) => state.authReducer.myUserProfile
  );





  return (
    <div className='flex justify-center'>
      <div className='flex flex-col mx-auto  min-w-[400px] mt-[150px] gap-3 p-2'>
        <div className='text-center'
        data-aos="fade-up" 
        data-aos-duration="700" 
        >
        <LogoText look={"text-C11 text-[70px] "}/>
        </div>

        {
          loginStatus==="not-loggedin"?(
            <>
            <input 
     name="username"
     id="username"
     value={loginFormData.username}
     onChange={handleInputChange}
     onKeyPress={handleKeyPress}

            data-aos="fade-up" 
            data-aos-duration="750" 
    type="text" className='px-3 py-2 bg-gray-100 border border-gray-300 outline-none focus:border-C11' placeholder='Username' />
    <div 
     data-aos="fade-up" 
     data-aos-duration="800" 
    className='border-gray-300 border pr-1 items-center flex flex-row w-full bg-gray-100   focus-within:border-C11 rounded-[2px]'>
    <input
     name="password"
     id="password"
     value={loginFormData.password}
     onChange={handleInputChange}
     onKeyPress={handleKeyPress}

    type={`${showPassword?"text":"password"}`} className='  flex-1 px-3 py-2 bg-gray-100 outline-none rounded-[2px] ' placeholder='Password' />
    <button onClick={()=>setShowPassword(!showPassword)} className='flex items-center hover:bg-gray-200 p-[6px] rounded-full' >
    {
      showPassword?
      <VisibilityOff sx={{fontSize:20, color:"#9ca3af"}}/>:
      <Visibility sx={{fontSize:20, color:"#9ca3af"}}/>
    }
    </button>
    </div>
    <button 
            data-aos="fade-up" 
            data-aos-duration="850" 
            onClick={handleSubmit}
        className=' my-[10px] px-2 py-1 font-semibold text-white bg-C11'>Login</button>

     <div
                data-aos="fade-up" 
                data-aos-duration="900" 
        className='text-center text-[11px]'>Are you new to Cirrh0 ? <Link className='hover:underline text-C11 ' to="/signup">Sign up</Link></div>
        <div
                data-aos="fade-up" 
                data-aos-duration="950" 
        className='text-center text-[11px]'><Link className='hover:underline text-C11' to="/">Home</Link></div>

       
    
    </>
        ):
        loginStatus === "login-failure" ? (
          <div className="mt-20">
            <APIResponseStatus  
              status={false}
              message={apiResponseMessage?apiResponseMessage:"Network Error"}
            />
             <div className="flex justify-center gap-4 mt-10">
              <button
                className={` hover:bg-[#012b3927] rounded-[8px] text-C11 font-bold text-[12px] py-2 px-5`}
                onClick={retryLogin}
              >
                Try Logging-In Again ?
              </button>
            </div>
          </div>
        ) : loginStatus === "login-loading" ? (
          <div className="flex justify-center mt-[100px] text-[16px] font-light ">
            <Loader/>
          </div>
         
        ) : null
        }



         {error ? <ErrorBox message={error} /> : null}
        
      </div>
      
    </div>
  )
}

export default LoginPage
