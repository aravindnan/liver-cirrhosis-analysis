import React, { useEffect, useRef, useState } from 'react'
import { useAuthPage } from '../auth/AuthContext'
import Navbar from '../components/Navbar'
import DemoNotice from '../components/DemoNotice'
import Footer from '../components/Footer'
import { Close, InfoOutlined, InsertDriveFile, Troubleshoot, Upload } from '@mui/icons-material'
import { Link, useNavigate } from 'react-router-dom'
import { Tooltip } from '@mui/material'
import Loader from '../assets/Loader'
import APIResponseStatus from '../components/APIResponseStatus'
import axios from 'axios'
import { analyseMRIById } from '../services/mriAnalysisServices'

function MRIAnalysisPage() {
  const { myProfiledata, pageLoading, networkError } = useAuthPage();
useEffect(()=>{
        window.scrollTo(0,0)
    },[])
const fileTestInputRef = useRef<any>(null);
const [fileList, setFileList] = useState<any>([]);
const [loading, setLoading] = useState<Boolean>(false);
const [error, setError] = useState<string | null>(null);
const CLOUDINARY_CLOUDNAME = process.env.REACT_APP_CLOUDINARY_CLOUDNAME;

const navigate = useNavigate()




const handleFileUpload = () => {
  fileTestInputRef.current.click();
};

const handleFileChange = (event:any) => {
  const newFiles = Array.from(event.target.files);
  setFileList((prevList:any) => [...prevList, ...newFiles]);
};

const removeItemFromFileList = (node: any) => {
  let newList = fileList.filter((item: any) => item !== node);
  setFileList(newList);
};

const uploadToCloudinary = async()=>{
  try {
    const uploadPromises = fileList.map(async (file: any) => {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "image_preset");

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUDNAME}/auto/upload`,
        data
      );

      return response.data.secure_url;
    });

    // Wait for all uploads to complete before returning
    const uploadedMediaData = await Promise.all(uploadPromises);

    return uploadedMediaData;
  } catch (error:any) {
    throw new Error(error?.message || "Could not upload the file. Please try again.");
  }
}

const handleAnalyseMRI=async()=>{
  setError(""); // Clear any previous errors
  if (fileList.length === 0) {
    setError("Add a slide image");
    return; // Early return if no media files
  }
  if (!myProfiledata) {
    setError("Please log in again to analyse an image");
    return;
  }
  setLoading(true)
  // Upload file to Cloudinary
  uploadToCloudinary()
    .then((mediaRes: any) => {

      var MRIsendData = {
        imageURL:mediaRes[0],
        age:myProfiledata?.age,
        sex:myProfiledata?.gender
      }

      return analyseMRIById(myProfiledata.id,MRIsendData);
    }).then(async (mriAnalyzeRes:any)=>{
      if (mriAnalyzeRes.analysisSuccess) {
        // Handle success
        setLoading(false)
        navigate(`/mri-result?id=${mriAnalyzeRes.mriId}`);
    } else {
        setError("Failed to analyze mri");
    }

    })
    .catch((err:any)=>{
      setError(err?.response?.data?.error || err?.message || "Analysis failed. Please try again.")
    })
    .finally(()=>setLoading(false))

}

useEffect(() => {
  if (loading) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
  return () => {
    document.body.style.overflow = 'auto';
  };
}, [loading]);

  return (
    <>{
      pageLoading==="loaded" ?
      <div className={`flex flex-col justify-between min-h-screen`}>
        {
            loading?
            <div className="fixed inset-0 bg-[#0000006c] backdrop-blur-[3px]  z-[100] justify-center flex items-center">
              <Loader/>
            </div>:
            null
         }
      <Navbar activePage ="mri-analysis"/>
      <div className='flex flex-col flex-1 pt-[70px] '>
        <div className={`flex flex-col justify-center text-center ${myProfiledata?.username?"mt-[50px]":"mt-[155px]"}  w-[92%] md:w-[80%] mx-auto`}>
            <div 
             data-aos="fade-up" 
             data-aos-duration="700" 
            className='text-[32px] md:text-[50px] text-C11 font-bold league-spartan'> Liver Slide Image Analysis</div>
            <div 
             data-aos="fade-up" 
             data-aos-duration="600" 
            className='text-[16px] w-[95%] mx-auto'>
Upload a stained liver tissue slide image, such as a biopsy slide. An automated model looks for features like fibrosis, inflammation, steatosis and ballooning and explains in plain language what they generally mean. This is not an MRI, ultrasound or CT tool, and it does not replace a pathologist's review.              </div>
            <div 
             data-aos="fade-up" 
             data-aos-duration="500" 
            className='mt-[20px] text-[14px] w-[80%] mx-auto text-C11'>
Research tool for tissue slide images. Results are automated detections, not a diagnosis.              </div>
            <DemoNotice className="mt-4 mx-auto max-w-[70ch]" />


            {
              !myProfiledata?.username?
                <>
                <Link 
                data-aos="fade-up" 
                data-aos-duration="700" 
                to="/login" className='shadow-md flex flex-row items-center gap-2 px-5 mt-[50px] mx-auto py-2 bg-C11 w-fit text-[14px] text-white font-semibold rounded-[2px]'>Try Now !</Link>
                </>:
                <>
            <input type="file"
            ref={fileTestInputRef}
            className="hidden"
            onChange={handleFileChange}
            disabled={fileList.length>0?true:false}
            accept="image/png, image/gif, image/jpeg"
        
            /> 
            {
              fileList.length===0&&
            <button
             data-aos="fade-up" 
             data-aos-duration="700" 
             data-aos-once
             onClick={handleFileUpload}
             disabled={fileList.length>0}
             className={`${fileList.length>0?"cursor-not-allowed":"hover:bg-gray-100 "} mt-[50px] gap-2 border-dashed border-spacing-3 flex-col  w-full md:max-w-[60%]  h-[200px]  border-[3px] border-gray-200 rounded-[8px] mx-auto justify-center items-center flex`}>
                 {
                  fileList.length>0?
                    <InfoOutlined sx={{fontSize:35,color:"#9ca3af"}}/>
                  :
                 <div className='jump-up-and-down'>
                  <Upload sx={{fontSize:35,color:"#9ca3af"}}/>
                </div>
                 }
                 
                <div className='font-semibold text-gray-400 text-[12px]'>
                {fileList.length>0?"Remove the existing file to upload another":"Upload a liver tissue slide image"}
                </div>
            </button>
            }  
            {fileList.length > 0 && (
          <div className="flex flex-col mt-[60px]  gap-1 max-h-[150px] overflow-y-auto md:max-w-[60%] mx-auto">
            {fileList?.map((node: any) => (
              <div className="flex items-center justify-between flex-row gap-5 px-2 py-1 text-[12px] font-semibold bg-gray-100     hover:bg-inactiveC11 text-C11 rounded-[4px]">
                <div className="flex flex-row gap-1 item-center">
                  <div className="w-fit">
                      <InsertDriveFile sx={{ fontSize: 15 }} />
                  </div>
                  <div className=' max-w-[400px] text-ellipsis truncate'>{node.name}</div>
                </div>

                <Tooltip title="Remove File" arrow placement="right">
                  <button
                  // className={`${loading?"cursor-not-allowed":"cursor-pointer"}`}
                  // disabled={loading?true:false} 
                  onClick={() => removeItemFromFileList(node)}>
                    <Close sx={{ fontSize: 15 }} />
                  </button>
                </Tooltip>
              </div>
            ))}
            <div className='font-semibold mt-5 text-gray-300 text-[12px] gap-1'>
              <InfoOutlined sx={{fontSize:20}}/>
                {fileList.length>0?"Remove the existing file to upload another":"Upload a liver tissue slide image"}
                </div>
          </div>
        )}
            {error && (
              <div role="alert" className="text-red-600 text-[14px] text-center mt-4">{error}</div>
            )}
            <button
              data-aos="fade-up" 
              data-aos-duration="700" 
              data-aos-once 
              disabled={fileList.length===0}
              onClick={handleAnalyseMRI}
            className='shadow-md flex flex-row items-center gap-2 px-5 mt-[50px] mx-auto py-2 bg-C11 w-fit text-[14px] text-white font-semibold rounded-[2px]'>
               <div>
                <Troubleshoot sx={{color:"white"}}/>
               </div>
               <div>
                Analyze Image
               </div>
            </button>
                </>
            }
        </div>
      </div>
      <Footer/>
    
    </div>:
    pageLoading==="not-loaded"?
    <div className="w-full min-h-screen flex justify-center items-center">
    <div className="flex justify-center text-[16px] font-light flex-col ">
        <Loader/>
    </div>
    </div>:
      <div className="flex items-center justify-center flex-1 w-full min-h-screen">
      <APIResponseStatus status={false} message={`${networkError?"Network Error":"An Error Occured"}`}/>
      </div>
    }
    </>

  )
}

export default MRIAnalysisPage
