import React, { useState } from 'react'
import { LogoIcon } from '../assets/Icons'
import { Link } from 'react-router-dom'
import LogoText from './LogoText'
import { useSelector } from 'react-redux'
import { Logout, Person } from '@mui/icons-material'
import { colors } from '../assets/Constants'
import LogoutModal from '../modals/LogoutModal'

function Navbar(props:any) {
  const{activePage} = props
  const [showProductsMenu,setShowProductsMenu] = useState<Boolean>(false)
  const [showUserMenu,setShowUserMenu] = useState<Boolean>(false)
  const [logoutModal,setLogoutModal] = useState<Boolean>(false)


  const myProfiledata = useSelector(
    (state: any) => state.authReducer.myUserProfile
  );

  // console.log("My profile data",myProfiledata)
  return (
    <div
    data-aos="fade-down" 
    data-aos-duration="900"
    className={`min-h-[70px]  z-10  text-[14px] fixed backdrop-blur-[30px] min-w-[100vw] z[100] flex items-center ${activePage==="home"?"bg-[#00000080]":"bg-[#f7f7f788]"}`}>
      <div className='relative z-10 flex flex-row items-center justify-center w-full h-full '>
      <div className='flex flex-row mx-auto w-[80%] justify-between items-center absolute z-20'>
        <Link to='/'>
        <div className='flex flex-row'>
        <div className='rotate-infinte mb-[5px]'>
         <LogoIcon/>
        </div>
        <LogoText look={`${activePage==="home"?"text-white":"text-C11"} text-[30px] `}/>
        </div>
        </Link>
            <div className='flex flex-row gap-[50px] font-semibold relative'>
                <div className={`cursor-pointer ${showProductsMenu?"underline":""}   underline-offset-2 decoration-C11 decoration-2 ${activePage==="home"?"text-white":"text-black"}`} onMouseEnter={()=>setShowProductsMenu(true)} >Products</div>
                {
                  showProductsMenu&&
                  <div 
                  onMouseEnter={()=>setShowProductsMenu(true)} 
                  onMouseLeave={()=>setShowProductsMenu(false)}
                  className={`min-w-[200px] absolute rounded-[2px]  flex flex-col p-2 top-[30px] ${activePage==="home"?"bg-[#000000c3] backdrop-blur-[30px] text-white":"bg-white border-gray-200 border-[0.5px]"}   shadow-lg left-[-10px]`}>
                  <Link to="/mri-analysis" className='px-2 py-1 hover:bg-[#a9030628] rounded-[2px]'>MRI Analysis</Link>
                  <Link to="/report-analysis" className='px-2 py-1 hover:bg-[#a9030628] rounded-[2px]'>Report Analyis</Link>

                 </div>
                }
             
                <Link to="/about" className={`${activePage==="about"?"underline":""} ${activePage==="home"?"text-white":"text-black"} cursor-pointer hover:underline    underline-offset-2 decoration-C11 decoration-2`} onMouseEnter={()=>setShowProductsMenu(false)}>About</Link>
            </div>
            {
              myProfiledata?.username?
              <div className='relative flex flex-row items-center gap-2 font-semibold'>
                <div className={`w-[35px] h-[35px] flex text-[18px] justify-center items-center rounded-full ${activePage!=="home"?"bg-C11 text-white":"bg-white text-C11"}   font-semibold `} onMouseEnter={()=>setShowUserMenu(true)}>{myProfiledata?.fullName[0].toUpperCase()}</div>
                {
                  showUserMenu&&
                  <div 
                  onMouseEnter={()=>setShowUserMenu(true)} 
                  onMouseLeave={()=>setShowUserMenu(false)}
                  className={`min-w-[150px] absolute rounded-[2px] text-[14px]  flex flex-col p-2 top-[43px] ${activePage==="home"?"bg-[#000000c3] backdrop-blur-[30px] text-white":"bg-white border-gray-200 border-[0.5px]"} shadow-lg left-[-2px]`}>
                  <Link to="/profile" className='flex items-center flex-row gap-2 px-2 py-1 hover:bg-[#a9030628] rounded-[2px]'>
                  <Person sx={{fontSize:"16px"}}/>
                  <div className=''>
                  My Profile
                  </div>
                  </Link>
                  {
                    (activePage==="home"||activePage==="profile"||activePage==="about")&&
                  <div
                  onClick={()=>setLogoutModal(true)}
                    className='px-2 py-1 hover:bg-[#a9030628] rounded-[2px] flex flex-row gap-2 items-center cursor-pointer'>
                    <Logout sx={{fontSize:"16px"}}/>
                    <div  className=''>Logout</div>
                  </div>
                  }

                 </div>
                }

              </div>:
              <div className='flex flex-row gap-[10px] font-semibold'>
                  <Link to="/login" className={`flex items-center px-3 border border-transparent hover:border transition-all duration-[0.5s] ease-in  ${activePage==="home"?"hover:border-white text-white":"hover:border-C11 text-C11"}  py-[2px] rounded-[2px] font-semibold`}>Login</Link>
                  <Link to="/signup" className='flex items-center px-3 font-semibold bg-C11  py-[2px] text-white rounded-[2px]'>Sign Up</Link>
              </div>
            }

        </div>
      </div>
      {
        logoutModal&&
        <LogoutModal setLogoutModal={setLogoutModal}/>
      }

      
    </div>
  )
}

export default Navbar
