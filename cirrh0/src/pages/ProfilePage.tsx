import React, { useEffect, useState } from 'react'
import { useAuthPage } from '../auth/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router';
import AddCircle from '@mui/icons-material/AddCircle'
import Delete from '@mui/icons-material/Delete'
import FindInPage from '@mui/icons-material/FindInPage'
import ImageSearch from '@mui/icons-material/ImageSearch'
import { Link } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip'
import { formatDateTime } from '../utils/formatDate';
import { deleteReportById } from '../services/reportAnalysisServices';
import { deleteMRIById } from '../services/mriAnalysisServices';


function ProfilePage() {
  const { myProfiledata, refresh } = useAuthPage();


  const navigate = useNavigate()




  const handleDeleteReport = async (reportId:any) => {
    try {
      await deleteReportById(reportId);
      refresh(); // Trigger rerender to refresh data
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  
  const handleDeleteMRI = async (mriId:any) => {
    try {
      await deleteMRIById(mriId);
      refresh(); // Trigger rerender to refresh data
    } catch (err) {
      console.error("Failed to delete MRI:", err);
    }
  };

  
  return (
    <div className='flex flex-col justify-between min-h-screen'>
      <Navbar activePage ="profile"/>
      <div className='flex-1 pt-[70px] px-4 lg:px-[100px] xl:px-[150px] justify-center flex flex-col md:flex-row gap-2'>
        <div className='md:w-1/2 p-4 md:p-10 mt-6 md:mt-10  rounded-[2px] items-center flex'>
        <div>
        <div className='p-1 font-bold  max-w-full break-words league-spartan text-[32px] md:text-[50px] text-C11' data-aos="fade-up" data-aos-duration="800">{myProfiledata?.fullName}</div>
        <div className='flex flex-row gap-1 p-1 text-[16px]  px-2 rounded-[2px]'data-aos="fade-up" data-aos-duration="900"><div className='font-semibold text-gray-400 w-[90px] sm:w-[150px] shrink-0'>Username</div><div className="text-C11 min-w-0 break-all sm:w-[200px]">{myProfiledata?.username}</div></div>
        <div className='flex flex-row gap-1 p-1 text-[16px]  px-2 rounded-[2px]'data-aos="fade-up" data-aos-duration="1000"><div className='font-semibold text-gray-400 w-[90px] sm:w-[150px] shrink-0'>Age</div><div className="text-C11 min-w-0 break-all sm:w-[200px]">{`${myProfiledata?.age} yrs`}</div></div>
        <div className='flex flex-row gap-1 p-1 text-[16px]  px-2 rounded-[2px]'data-aos="fade-up" data-aos-duration="1200"><div className='font-semibold text-gray-400 w-[90px] sm:w-[150px] shrink-0'>Email</div><div className="text-C11 min-w-0 break-all sm:w-[200px]">{myProfiledata?.email}</div></div>
        <div className='flex flex-row gap-1 p-1 text-[16px]  px-2 rounded-[2px]'data-aos="fade-up" data-aos-duration="1300"><div className='font-semibold text-gray-400 w-[90px] sm:w-[150px] shrink-0'>Gender</div><div className="text-C11 min-w-0 break-all sm:w-[200px] capitalize">{myProfiledata?.gender}</div></div>
        </div>
        </div>
        <div className='md:w-1/2 p-4 md:p-10 mt-6 md:mt-10  rounded-[2px]'>
        <div>
          <div className='font-bold league-spartan text-[20px] text-C11 flex flex-row gap-1 items-center ' data-aos="fade-up" data-aos-duration="800"><FindInPage sx={{fontSize:20}}/><div>All Test Analysis Results</div> </div>
          <div data-aos="fade-up" data-aos-duration="900" className='flex flex-col gap-2 max-h-[150px] overflow-y-auto pl-[20px] mt-[10px]'>
            {myProfiledata?.reportAnalysisSet.slice().reverse().map((node:any, index:any) => (
            <div className='flex flex-row justify-between group cursor-pointer p-1  px-2 hover:hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] hover:border-l-[5px] hover:border-C11   hover:font-semibold ' key={index} >
              <Link title='View Report' to={`/report-result?id=${node.id}`}  className='hover:underline underline-offset-1'>
              {`${formatDateTime(node.date)}`}
              </Link>
              <button
              onClick={()=>handleDeleteReport(node.id)}
               title="Delete Report" className='block md:hidden md:group-hover:block md:group-focus-within:block text-C11'>
                <Delete sx={{fontSize:20}}/>
              </button>
            </div>
           ))}
           {
            myProfiledata?.reportAnalysisSet.length === 0 && 
            <div className='flex flex-col justify-center w-full my-10'>
              <div className='flex justify-center'>
              <Tooltip title="Analyze new Report" arrow placement='right'>
                <Link to="/report-analysis" className='text-gray-200 bg- w-fit h-fit hover:text-C11'>
                 <AddCircle sx={{fontSize:30}}/>
                </Link>
              </Tooltip>
              </div>
              <p className='text-gray-300 text-[12px] font-semibold text-center'>No Existing Reports for you</p>
            </div>
           }
          </div>

          <div data-aos="fade-up" data-aos-duration="1000" className='font-bold league-spartan text-[20px] mt-10 text-C11 flex gap-1 flex-row items-center'><ImageSearch sx={{fontSize:20}}/><div>All Image Analysis Results</div></div>
          <div data-aos="fade-up" data-aos-duration="1200" className='flex flex-col gap-2 max-h-[150px] overflow-y-auto pl-[20px] mt-[10px]'>
          {myProfiledata?.mriAnalysisSet.slice().reverse().map((node:any, index:any) => (
            <div className='flex flex-row justify-between group cursor-pointer p-1  px-2 hover:hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] hover:border-l-[5px] hover:border-C11   hover:font-semibold ' key={index} >
            <Link title='View Report' to={`/mri-result?id=${node.id}`}  className='hover:underline underline-offset-1'>
            {`${formatDateTime(node.date)}`}
            </Link>
            <button 
            onClick={()=>handleDeleteMRI(node.id)}
            title="Delete Report" className='block md:hidden md:group-hover:block md:group-focus-within:block text-C11'>
              <Delete sx={{fontSize:20}}/>
            </button>
          </div>
            ))}
                       {
            myProfiledata?.mriAnalysisSet.length === 0 && 
            <div className='flex flex-col justify-center w-full my-10'>
              <div className='flex justify-center'>
              <Tooltip title="Analyze new image" arrow placement='right'>
                <Link to="/mri-analysis" className='text-gray-200 bg- w-fit h-fit hover:text-C11'>
                 <AddCircle sx={{fontSize:30}}/>
                </Link>
              </Tooltip>
              </div>
              <p className='text-gray-300 text-[12px] font-semibold text-center'>No image analyses yet</p>
            </div>
           }
          </div>
        </div>
        
        



        </div>
        


      </div>
      <Footer/>
    
    </div>
  )
}

export default ProfilePage
