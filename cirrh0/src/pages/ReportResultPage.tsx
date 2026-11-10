import React, { useEffect, useState } from "react";
import { useAuthPage } from '../auth/AuthContext'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loader from "../assets/Loader";
import { getReportResultById } from "../services/reportAnalysisServices";
import { useNavigate } from "react-router";
import { formatDateTime } from '../utils/formatDate';
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Female from '@mui/icons-material/Female'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import Male from '@mui/icons-material/Male'
import Person2 from '@mui/icons-material/Person2'
import Transgender from '@mui/icons-material/Transgender'
import { Link } from "react-router-dom";
import Tooltip from '@mui/material/Tooltip'
import Disclaimer from "../components/Disclaimer";
import ScoresPanel from "../components/ScoresPanel";


function ReportResultPage() {
  const { myProfiledata } = useAuthPage();
    const [loading, setLoading] = useState<boolean>(true);
    const [reportResult, setReportResult] = useState<any>({});
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate()
  
  

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
            <div className="min-h-screen w-full justify-center flex items-center">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen w-full justify-center flex items-center flex-col">
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
            <div className="flex flex-col justify-between min-h-screen">
                <Navbar activePage="mri-result" />
                {
                  myProfiledata?.id===reportResult?.userId?
                <div className="flex-1 pt-[100px] md:pt-[120px] px-4 md:px-[120px] justify-center flex flex-col gap-2">
                    <div
                    data-aos="fade-up"
                    data-aos-duration="600"
                    data-aos-once
                     className="league-spartan font-bold text-[32px] md:text-[50px] text-C11">
                        Report Result
                    </div>
                    <Disclaimer extra={reportResult?.stage ? "How reliable is this estimate? On patients it had not seen during testing, the model picked the right stage about half the time (roughly 50%, compared with 38% for always guessing the most common stage), and it is least reliable for stage 1. It was trained on a 1970s-80s study of one liver disease (primary biliary cholangitis)." : undefined}/>
                    <div 
                    data-aos="fade-up"
                    data-aos-duration="900"
                    data-aos-once

                    className="flex flex-wrap gap-x-8 gap-y-2 md:gap-[60px]">

                    <div className="flex flex-row items-center gap-1">
                      <div className="text-C11">
                        <CalendarMonth/>
                      </div>
                      {formatDateTime(reportResult?.date)}
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
                    <div className="mt-10">
                      <ScoresPanel scores={reportResult?.scores} />
                    </div>
                    {!reportResult?.stage && (
                      <p role="status" className="mt-4 text-[14px] border-l-4 border-[#9a5b00] bg-[#fdf1dc] px-4 py-3 max-w-[70ch]">
                        The research-model stage estimate was not available for this report. The guideline
                        scores above do not depend on it.
                      </p>
                    )}
                    <div 
                       data-aos="fade-up"
                    data-aos-duration="800"
                    data-aos-once

                    className="my-10 flex flex-col md:flex-row gap-8 md:gap-[100px] ">
                        <div className="flex flex-col gap-[30px] w-full md:w-1/2">
                            {/* Stage */}
                            {reportResult.stage && (
                                <div className="flex flex-col px-5 py-3 rounded-[6px]">
                                    <div className="league-spartan font-bold text-[25px] text-gray-800">
                                        Estimated Stage (of 4)
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

                        <div className="flex flex-col gap-[30px] w-full md:w-1/2">
                            {/* Scrolls sideways inside this box on narrow screens instead of widening the page */}
                            <div className="overflow-x-auto max-w-full" role="region" aria-label="Lab values" tabIndex={0}>
                            <table 
                    data-aos="fade-up"
                    data-aos-duration="700"
                    data-aos-once

                            className="w-full min-w-[560px] border border-C11 text-C11">
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
                                        {reportResult.alt != null && <th>ALT</th>}
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
                                        {reportResult.alt != null && <td>{reportResult.alt}</td>}
                                        <td>{reportResult.cholesterol}</td>
                                    </tr>
                                </tbody>
                            </table>
                            </div>

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
                                        Self-care Guidance
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
