import React from 'react'
import Loader from '../assets/Loader'
import { Close } from '@mui/icons-material'
import APIResponseStatus from '../components/APIResponseStatus'

function ReportResultModal(props:any) {
  const {setResultModal,resultModal}=props

  const handleModalClose =()=>{
    setResultModal(false)
  }

  return (
<div
onClick={handleModalClose}
className='top-0 left-0 absolute w-[100vw] z-[50] h-[100vh] bg-[#00000054] flex justify-center items-center'>
    <div 
    onClick={(e)=>e.stopPropagation()}
    className={`bg-C55 rounded-[4px] p-5 shadow-xl ${resultModal==="result-loading"?"w-full bg-[#00000014] h-full  justify-center flex items-center text-center":"w-[90%] md:max-w-[500px] max-h-[300px]"}`} >
    <div className='flex flex-row items-center justify-between'>
      <div className='font-bold text-[20px] text-C11 '>
      {resultModal==="not-loggedout"&&"Logout"} 
      {resultModal==="result-loading"&&<Loader/>}
      </div>
      {resultModal!=="result-loading"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        {/* <Close sx={{fontSize:20,fontWeight:800}}/> */}
      </button>:
      resultModal==="result-failure"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        <Close sx={{fontSize:20,fontWeight:800}}/>
      </button>
      
      :
      resultModal==="not-loggedout"?
      <button className='cursor-pointer'
      onClick={handleModalClose}
      >
        <Close sx={{fontSize:20,fontWeight:800}}/>
      </button>:null
      }
      </div>
      {resultModal==="result-error"?
      <div>
        <APIResponseStatus message={"An error while Analysing"} status={false}/>
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

export default ReportResultModal
