import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loader from "../assets/Loader";
import { getReportResultById } from "../services/reportAnalysisServices";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { getUserById } from "../services/userServices";
import * as authActions from "../redux/actions"
import { getUserDetailsFromToken } from "../services/authServices";
import moment from "moment";
import { CalendarMonth, CalendarViewMonth, Female, InfoOutlined, Male, Person, Person2, Transgender, VerifiedUser } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { Tooltip } from "@mui/material";


function ReportResultPage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [reportResult, setReportResult] = useState<any>({});
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
      document.body.style.overflow = "scroll"
    }, []);
  

    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const reportId = urlParams.get("id");

        if (reportId) {
            const fetchReportResult = async () => {
                try {
                    const result = await getReportResultById(reportId);
                    setReportResult(result);
                } catch (err) {
                    setError("Failed to load report result");
                    console.error("Error fetching report result:", err);
                } finally {
                    setLoading(false);
                }
            };

            fetchReportResult();
        } else {
            setError("No report ID found in the URL");
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
            <div className="h-[100vh] w-[100vw] justify-center flex items-center flex-col">
              <p>{error}</p>
              <Link
               to="/"
                className={`mt-5 hover:bg-[#012b3927] rounded-[8px] text-C11 font-bold text-[12px] py-2 px-5`}
              >
                Return Home
              </Link>
          </div>
        );
    }

    return (
        <>
            <div className="flex flex-col justify-between h-screen">
                <Navbar activePage="mri-result" />
                {
                  myProfiledata?._id===reportResult?.userId?
                <div className="flex-1 pt-[120px] px-[120px] justify-center flex flex-col gap-2">
                    <div
                    data-aos="fade-up"
                    data-aos-duration="600"
                    data-aos-once
                     className="league-spartan font-bold text-[50px] text-C11">
                        Report Result
                    </div>
                    <div 
                    data-aos="fade-up"
                    data-aos-duration="900"
                    data-aos-once

                    className="flex flex-row gap-[60px]">

                    <div className="flex flex-row items-center gap-1">
                      <div className="text-C11">
                        <CalendarMonth/>
                      </div>
                      {moment(reportResult?.date).format('llll')}
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
                       data-aos="fade-up"
                    data-aos-duration="700"
                    data-aos-once

                    className="mt-[40px] mb-[-20px]">
                      <div className="font-bold league-spartan text-C11">Analysis Files</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {
                          reportResult?.files.map((file:any,i:any)=>(
                            <Tooltip title="View File" placement="bottom" arrow>

                            <a className="px-3 py-1 text-[12px] font-bold bg-gray-100 hover:bg-gray-200"
                            href={file} download target="_blank"
                            >
                              {`File ${i+1}`}
                            </a>
                            </Tooltip>
                          ))
                        }
                      </div>
                    </div>
                    <div 
                       data-aos="fade-up"
                    data-aos-duration="800"
                    data-aos-once

                    className="my-10 flex flex-row gap-[100px] ">
                        <div className="flex flex-col gap-[30px] w-1/2">
                            {/* Stage */}
                            {reportResult.stage && (
                                <div className="flex flex-col px-5 py-3 rounded-[6px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Cirrhosis Stage
                                    </div>
                                    <div className="league-spartan font-semibold text-[100px] border-2 border-C11 text-C11 bg-gray-100 w-[150px] h-[150px] flex text-center justify-center items-center px-5 py-2">
                                        {reportResult.stage}
                                    </div>
                                </div>
                            )}

                            {/* Analysis */}
                            {reportResult.analysis && (
                                <div 
                                   data-aos="fade-up"
                    data-aos-duration="900"
                    data-aos-once

                                className="flex flex-col px-5 py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Analysis
                                    </div>
                                    <div className="border-l-[5px] border-transparent text-[15px] text-justify">
                                        {reportResult.analysis}
                                    </div>
                                </div>
                            )}

                            {/* Lifestyle Recommendations */}
                            {reportResult.lifestyle_recommendations && (
                                <div
                                   data-aos="fade-up"
                    data-aos-duration="1000"
                    data-aos-once

                                className="flex flex-col px-5 py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Lifestyle Recommendations
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2">
                                        {reportResult.lifestyle_recommendations.map((node: any, index: number) => (
                                            <div key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                                {node}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Diseases */}
                            




                        </div>

                        <div className="flex flex-col gap-[30px] w-1/2">
                            <table 
                    data-aos="fade-up"
                    data-aos-duration="700"
                    data-aos-once

                            className="w-full border border-C11 text-C11">
                                <thead>
                                    <tr className="text-[12px] text-center">
                                        <th>Albumin</th>
                                        <th>Bilirubin</th>
                                        <th>Prothrombin</th>
                                        <th>Copper</th>
                                        <th>Platelets</th>
                                        <th>Tryglycerides</th>
                                        <th>SGOT</th>
                                        <th>Alk_Phos</th>
                                        <th>Cholesterol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="text-center">
                                        <td>{reportResult.albumin}</td>
                                        <td>{reportResult.bilirubin}</td>
                                        <td>{reportResult.prothrombin}</td>
                                        <td>{reportResult.copper}</td>
                                        <td>{reportResult.platelets}</td>
                                        <td>{reportResult.tryglycerides}</td>
                                        <td>{reportResult.sgot}</td>
                                        <td>{reportResult.alk_phos}</td>
                                        <td>{reportResult.cholesterol}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Precautions */}
                            {reportResult.precautions.length>0 && (
                                <div
                                   data-aos="fade-up"
                    data-aos-duration="900"
                    data-aos-once

                                className="flex flex-col py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Precautions
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {reportResult.precautions.map((node: any, index: number) => (
                                            <div key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                                {node}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Doctors to Visit */}
                            {reportResult.doctor_type.length>0 && (
                                <div
                                   data-aos="fade-up"
                    data-aos-duration="1000"
                    data-aos-once

                                className="flex flex-col py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Doctors You Might Want to Visit
                                    </div>
                                    <div className="flex flex-wrap gap-[20px]">
                                        {reportResult.doctor_type.map((node: any, index: number) => (
                                            <Tooltip title="Find near you" placement="bottom" arrow>
                                            <a 
                                            key={index} 
                                            className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] hover:font-semibold"
                                             href={`https://www.google.com/search?q=${node} near me`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             >
                                                {node}
                                            </a>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Self Treatment Plan */}
                            {reportResult.self_treatment_plan.length>0 && (
                                <div
                                   data-aos="fade-up"
                    data-aos-duration="1100"
                    data-aos-once
                                className="flex flex-col py-3 rounded-[4px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Self Treatment Plan
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {reportResult.self_treatment_plan.map((node: any, index: number) => (
                                            <div key={index} className="p-1 px-2 hover:bg-[#a9030628] transition-all duration-[0.1s] text-[14px] border-l-[5px] hover:border-C11 border-gray-200 hover:font-semibold">
                                                {node}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>:
                <div className="flex flex-col items-center justify-center w-full h-screen text-center text-C11">
                  You are unauthorized to View this report
                </div>
                }
                <Footer />
            </div>
        </>
    );
}

export default ReportResultPage;
