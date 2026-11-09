import React from 'react'
import LogoText from './LogoText'

function Footer() {
  return (
    <div 
    data-aos="slide-up"
    data-aos-anchor="bottom"
    data-aos-duration="2000"
    className=' mt-[100px] h-[30px] bg-C11 pt-1  text-center text-white text-[14px] items-center flex justify-between px-[10px]'>
        <span className='text-[12px]'>Educational information only. Not medical advice.</span>
        <LogoText look="text-[15px] text-white"/>
    </div>
  )
}

export default Footer
