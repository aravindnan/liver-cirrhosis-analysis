import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Loader from '../assets/Loader';
import { getMRIResultById } from '../services/mriAnalysisServices';
import { getUserById } from '../services/userServices';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import * as authActions from "../redux/actions"
import { getUserDetailsFromToken } from '../services/authServices';
import { Link } from 'react-router-dom';
import { CalendarMonth, Female, InfoOutlined, Male, Person2, Transgender } from '@mui/icons-material';
import moment from 'moment';

function MRIResultPage() {

  const [loading, setLoading] = useState<boolean>(true);
  const [mriResult, setmriResult] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [rerender, setRerender] = useState(false);
  const [networkError,setNetworkError] = useState<Boolean>(false)
  const [pageLoading, setPageLoading] = useState<any>("not-loaded")

  const myProfiledata = useSelector(
    (state: any) => state.authReducer.myUserProfile
  );
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const getMyProfileData =async(myUserId:any)=>{
    await getUserById(myUserId).then((res:any)=>{

      // console.log("in TASKPAGE RETURNED TASK ",res.code);
      if(res.code==="ERR_NETWORK"){
        setNetworkError(true)
        console.error("NETWORK ERROR ")
        setPageLoading("error")
      }
      else{
        setPageLoading("loaded")
        dispatch(authActions.loginAction(res))
      }
    }).catch((err:any)=>{
      console.error(err)
    })
}

useEffect(() => {
  document.body.style.overflow = "scroll"
}, []);

  useEffect(() => {
    const existingUser:any = getUserDetailsFromToken()
    // console.log("EXISITING USER ID : ",existingUser)

    if (existingUser?._id) {
      getMyProfileData(existingUser._id)
    }
    else{
      navigate("/") 
      setPageLoading("loaded")
    }

  }, [rerender]);


  useEffect(() => {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      const reportId = urlParams.get("id");

      if (reportId) {
          const fetchmriResult = async () => {
              try {
                  const result = await getMRIResultById(reportId);
                  setmriResult(result);
              } catch (err) {
                  setError("Failed to load MRI result");
                  console.error("Error fetching MRI result:", err);
              } finally {
                  setLoading(false);
              }
          };

          fetchmriResult();
      } else {
          setError("No MRI ID found in the URL");
          setLoading(false);
      }
  }, []);

  

  if (loading) {
      return (
          <div className="h-[100vh] w-[100vw] justify-center flex items-center">
              <Loader />
          </div>
      );
  }

  if (error) {
      return (
          <div className="h-[100vh] w-[100vw] justify-center flex items-center">
              <p>{error}</p>
              <Link
               to="/"
                className={` hover:bg-[#012b3927] rounded-[8px] text-C11 font-bold text-[12px] py-2 px-5`}
              >
                Home
              </Link>
          </div>
      );
  }

  return (
    <div className="flex flex-col justify-between h-screen">
    <Navbar activePage="mri-result" />
    {
      myProfiledata?._id===mriResult?.userId?
    <div className="flex-1 pt-[120px] px-[120px] justify-center flex flex-col gap-2">
        <div
        data-aos="fade-up"
        data-aos-duration="600"
        data-aos-once
         className="league-spartan font-bold text-[50px] text-C11">
            MRI Result
        </div>
        <div 
        data-aos="fade-up"
        data-aos-duration="650"
        data-aos-once

        className="flex flex-row gap-[60px]">

        <div className="flex flex-row items-center gap-1">
          <div className="text-C11">
            <CalendarMonth/>
          </div>
          {moment(mriResult?.date).format('llll')}
        </div>
        <div  className="flex flex-row items-center gap-1">
          <div className="text-C11">
            <Person2/>
          </div>
          <div>
            {myProfiledata?.fullName}
          </div>
        </div>
        <div  className="flex flex-row items-center gap-1">
          <div className="text-C11">
            <InfoOutlined/>
          </div>
          <div>
            {myProfiledata?.age}yrs
          </div>
        </div>
        <div  className="flex flex-row items-center gap-1">
          <div className="text-C11">
            {
              myProfiledata?.gender==="male"?
              <Male/>:
              myProfiledata?.gender==="female"?
              <Female/>:
              <Transgender/>
            }
          </div>
          <div className="capitalize">
            {myProfiledata?.gender}
          </div>
        </div>
        </div>

        <div 

        className="my-10 flex flex-row gap-[250px] ">
            <div className="flex flex-col gap-[30px] w-1/2">
                {/* Stage */}
                {mriResult.diagnosis && (
                    <div
                    data-aos="fade-up"
                    data-aos-duration="700"
                    data-aos-once

                    className="flex flex-col px-5 py-3 rounded-[6px]">
                        <div className="league-spartan font-bold text-[25px] text-gray-800">
                            Diagnosis
                        </div>
                        <div className='flex flex-row gap-[20px]'>
                        {
                          mriResult.diagnosis.map((node:any)=>(
                        <div className="league-spartan font-semibold text-[30px] border-2 border-C11 text-C11 bg-gray-100  flex text-center justify-center items-center px-5 py-2">
                            {node}
                        </div>
                          ))
                        }
                        </div>
                    </div>
                )}

                {/* Analysis */}
                {mriResult.analysis && (
                    <div
                            data-aos="fade-up"
        data-aos-duration="750"
        data-aos-once

                     className="flex flex-col px-5 py-3 rounded-[4px]">
                        <div className="league-spartan font-bold text-[25px] text-gray-800">
                            Analysis
                        </div>
                        <div className="border-l-[5px] border-transparent text-[15px] text-justify">
                            {mriResult.analysis}
                        </div>
                    </div>
                )}

                {/* Lifestyle Recommendations */}
                {mriResult.lifestyle_recommendations && (
                    <div
                            data-aos="fade-up"
        data-aos-duration="800"
        data-aos-once

                     className="flex flex-col px-5 py-3 rounded-[4px]">
                        <div className="league-spartan font-bold text-[25px] text-gray-800">
                            Lifestyle Recommendations
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                            {mriResult.lifestyle_recommendations.map((node: any, index: number) => (
                                <div key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                    {node}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Doctors to Visit */}
                {mriResult.doctor_type.length>0 && (
                                <div 
                                        data-aos="fade-up"
        data-aos-duration="850"
        data-aos-once

                                className="flex flex-col px-5 py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Doctors You Might Want to Visit
                                    </div>
                                    <div className="flex flex-wrap gap-[20px]">
                                        {mriResult.doctor_type.map((node: any, index: number) => (
                                            <a 
                                            key={index} 
                                            className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] hover:font-semibold"
                                             href={`https://www.google.com/search?q=${node} near me`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             >
                                                {node}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

            </div>
            <div className='w-1/2 flex flex-col gap-[50px]'>
            <div 
          data-aos="fade-up"
        data-aos-duration="700"
        data-aos-once

            className="mt-[40px] mb-[-20px]">
            <div className="league-spartan font-bold text-[25px] text-gray-800">
                            MRI Image
                        </div>          
          <img
          src={mriResult?.file}
          alt="MRI Image"
          className='w-[300px] aspect-auto border border-C11'
          />
        </div>
           
                                       {/* Precautions */}
                                {mriResult.precautions.length>0 && (
                                <div 
                                  data-aos="fade-up"
                                  data-aos-duration="800"
                                  data-aos-anchor="top"
                                  data-aos-once

                                className="flex flex-col py-3 rounded-[4px] mt-8">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Precautions
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {mriResult.precautions.map((node: any, index: number) => (
                                            <div key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                                {node}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* Self Treatment Plan */}
                             {mriResult.medical_treatments.length>0 && (
                                <div
                                        data-aos="fade-up"
        data-aos-duration="850"
        data-aos-once

                                className="flex flex-col py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Medical Treatments 
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {mriResult.medical_treatments.map((node: any, index: number) => (
                                          

                                            <a 
                                            href={`https://www.google.com/search?q=${node} for Liver Cirrhosis`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                                {node}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
            </div>
        </div>
    </div>:
    <div
    data-aos="fade-up"
    data-aos-duration="850"
    data-aos-once
    className="flex flex-col items-center justify-center w-full h-screen text-center text-C11">
      <p>You are unauthorized to View this report</p>
      <Link
        to="/"
        className={` hover:bg-[#012b3927] rounded-[8px] text-C11 font-bold text-[12px] py-2 px-5`}
        >
        Home
      </Link>

    </div>
    }
    <Footer />
</div>
  )
}

export default MRIResultPage
