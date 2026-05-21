import { Error } from '@mui/icons-material'
import React from 'react'

function ErrorBox(props:any) {
    const {message}=props
  return (
    <div className='px-2 py-1 bg-inactiveRed text-highPriority rounded-[6px] text-[10px] font-semibold items-center flex flex-row gap-2 justify-between' >
     <div>{message}</div>
    <Error sx={{fontSize:20}}/>
   </div>
  )
}

export default ErrorBox