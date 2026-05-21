import React, { useState } from 'react'
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { getUserDetailsFromToken, logoutUser } from '../services/authServices';
import * as authActions from "../redux/actions"
import { Close } from '@mui/icons-material';
import APIResponseStatus from '../components/APIResponseStatus';
import Loader from '../assets/Loader';


function LogoutModal(props:any) {

    const dispatch =  useDispatch()
    const {setLogoutModal}= props

    const [error, setError] = useState<string | null>(null);
    const [logoutStatus,setLogoutStatus] = useState<any>("not-loggedout")
    // const [logoutStatus,setLogoutStatus] = useState<any>("logout-failure")

    
    const navigate=useNavigate()
    const handleModalClose =()=>{
      setLogoutStatus("not-loggedout")
      setError(null)
      setLogoutModal(false)

    }

    const handleLogout= async()=>{
        setLogoutStatus("logout-loading")
        const userData:any = getUserDetailsFromToken()
        if(userData){
          await logoutUser(userData?._id).then((res:any)=>{
            // console.log("Logout Response In REACT : ",res)
            if(res.code!=="ERR_NETWORK"){
            setLogoutStatus("logout-success")
            // window.location.reload()
            dispatch(authActions.logoutAction())
            setLogoutModal(false)
            navigate("/")

          }
            else{
              setLogoutStatus("logout-failure")
              setError("Logout Failed")
            }
          }).catch((err:any)=>{
              setError("Logout Failed")
              console.error("Error : ",err);
              setLogoutStatus("logout-failure")
          });   
        }
        else{
          // console.log(userData);  
          
        }
        
      }


  return (
<div
onClick={handleModalClose}
className='top-0 left-0 absolute w-[100vw] z-[50] h-[100vh] bg-[#00000054] flex justify-center items-center'>
    <div 
    onClick={(e)=>e.stopPropagation()}
    className={`bg-C55 rounded-[4px] p-5 shadow-xl ${logoutStatus==="logout-loading"?"w-full bg-[#00000014] h-full  justify-center flex items-center text-center":"w-[90%] md:max-w-[500px] max-h-[300px]"}`} >
    <div className='flex flex-row items-center justify-between'>
      <div className='font-bold text-[20px] text-C11 '>
      {logoutStatus==="not-loggedout"&&"Logout"} 
      {logoutStatus==="logout-loading"&&<Loader/>}
      </div>
      {logoutStatus!=="logout-loading"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        {/* <Close sx={{fontSize:20,fontWeight:800}}/> */}
      </button>:
      logoutStatus==="logout-failure"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        <Close sx={{fontSize:20,fontWeight:800}}/>
      </button>
      
      :
      logoutStatus==="not-loggedout"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        <Close sx={{fontSize:20,fontWeight:800}}/>
      </button>:null
      }
      </div>
      {!error && logoutStatus==="not-loggedout"?
      <>
  
      <div className="mt-4 mb-6 text-[14px]">
        Are you sure you want to <strong>Log out</strong> from Cirrh0  
      </div>
      <div className='flex justify-end gap-4 mt-2'>
        <button className={`hover:bg-gray-200 rounded-[4px] text-C11 font-bold text-[12px] py-2 px-5`}  onClick={handleModalClose}>Cancel</button>
        <button className={`rounded-[4px] bg-C11 text-white font-bold text-[12px] py-2 px-5`} onClick={handleLogout}>Log Out</button>
      </div> 
      </>: error?
      <div>
        <APIResponseStatus message={error} status={false}/>
        <div className='flex justify-end gap-4 mt-2'>
          <button className={`hover:bg-inactiveC11 rounded-[4px] text-C11 font-bold text-[12px] py-2 px-5`} onClick={handleModalClose}>Okay</button>
        </div> 
      </div>
      :null
      }

    </div>
  </div>
  )
}

export default LogoutModal
