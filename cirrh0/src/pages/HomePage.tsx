import React, { useEffect, useRef, useState } from "react";
import { useAuthPage } from '../auth/AuthContext'
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router";
import APIResponseStatus from "../components/APIResponseStatus";
import Loader from "../assets/Loader";
import { Link } from "react-router-dom";
import cirr1 from "../assets/cirr1.jpg";
import norm4 from "../assets/norm4.jpg";

function HomePage() {
  const { myProfiledata, pageLoading, networkError } = useAuthPage();

  const navigate = useNavigate();



  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // console.log("MYPROFILE : ",myProfiledata);

  return (
    <>
      {pageLoading === "loaded" ? (
        <div className="flex flex-col justify-between min-h-screen">
          <Navbar activePage="home" />
          <div className="flex flex-col flex-1">
            {/* Home Page Hero */}
            <div className="  min-h-screen  backgroundjif  mx-auto text-center gap-[10px]">
             <div className="flex flex-col justify-center w-full h-full bg-[#0000008e] ">
              <div
                data-aos="fade-up"
                data-aos-duration="700"
                className="text-[40px] md:text-[70px] pt-[110px] md:pt-[70px] px-4 mx-auto text-center text-white font-bold league-spartan"
              >
                Redefining Liver Cirrhosis Analysis
              </div>

              <div
                data-aos="fade-up"
                data-aos-duration="600"
                className="w-[90%] md:w-[60%] mx-auto text-[16px] md:text-[20px] text-white font"
              >
                Cirrh0 helps you read your liver lab reports. Upload a report, check the values we extract, and get an educational summary and questions to take to your doctor. It is a college research project and does not provide a diagnosis.
              </div>
             { !myProfiledata?.username&&
                <Link
                data-aos="fade-up" 
                data-aos-duration="700" 
                to="/report-analysis" className='shadow-md flex flex-row items-center gap-2 px-5 mt-[30px] mx-auto py-2 bg-C11 w-fit text-[14px] text-white font-semibold rounded-[2px]'>Explore Report Analyzer</Link>
                }
              {/* <div
                data-aos="fade-up"
                data-aos-duration="500"
                className="text-[14px] w-[90%] md:w-[50%] mx-auto text-C11"
              >
              Advanced Insights and Suggestions for Cirrhosis
           </div> */}
           </div>
            </div>

            {/* Section 2 */}
            <div className="mx-auto w-[90%] md:w-[80%] my-[50px] flex flex-col md:flex-row-reverse mt-[60px] md:mt-[100px] gap-[30px] md:gap-[50px] items-center">
              <div
                data-aos="fade-up"
                data-aos-duration="900"
                data-aos-once
                className="  bg-gray-100  rounded-[2px] justify-center items-center flex border-C11 border-[1px]"
              >
                <img
                  className=" aspect-auto w-full md:min-w-[400px]"
                  src={cirr1}
                />
              </div>
              <div className="flex flex-col gap-[20px]">
                <div
                  data-aos="fade-up"
                  data-aos-duration="700"
                  data-aos-once
                  className="text-C11 font-semibold text-[30px] md:text-[45px] league-spartan"
                >
                  Liver Cirrhosis
                </div>
                <div
                  data-aos="fade-up"
                  data-aos-duration="600"
                  data-aos-once
                  className="text-[16px] md:text-[20px]"
                >
                  Liver cirrhosis is a progressive condition characterized by
                  the scarring of liver tissue, which impairs its ability to
                  function effectively. This serious disease often results from
                  chronic liver damage due to factors such as excessive alcohol
                  consumption, hepatitis infections, or prolonged exposure to
                  toxins{" "}
                </div>
                <div
                  data-aos="fade-up"
                  data-aos-duration="500"
                  data-aos-once
                  className="text-[16px] text-C11"
                >
                  As cirrhosis advances, it can lead to complications such as
                  liver failure, portal hypertension, and liver cancer. Managing
                  liver cirrhosis involves addressing the underlying cause, such
                  as abstaining from alcohol or treating hepatitis, along with
                  lifestyle modifications like a balanced diet, regular
                  exercise, and routine medical monitoring. Early{" "}
                </div>
              </div>
            </div>

            {/* Section 1 */}
            <div className="mx-auto w-[90%] md:w-[80%] my-[50px] flex flex-col md:flex-row mt-[60px] md:mt-[100px] gap-[30px] md:gap-[50px] items-center">
              <div
                data-aos="fade-up"
                data-aos-duration="900"
                data-aos-once
                className="  bg-gray-100 rounded-[2px] justify-center items-center flex border-C11 border-[1px]"
              >
                <img
                  className=" aspect-auto w-full md:min-w-[400px]"
                  src={norm4}
                />
              </div>
              <div className="flex flex-col gap-[20px]">
                <div
                  className="text-C11 font-semibold text-[30px] md:text-[45px] league-spartan"
                  data-aos="fade-up"
                  data-aos-once
                  data-aos-duration="700"
                >
                  Healthy Liver
                </div>
                <div
                  data-aos="fade-up"
                  data-aos-duration="600"
                  className="text-[16px] md:text-[20px]"
                  data-aos-once
                >
                  Maintaining a healthy liver is essential for overall
                  well-being. The liver performs vital functions, including
                  detoxifying harmful substances, metabolizing nutrients, and
                  producing proteins for blood clotting and immune support.{" "}
                </div>
                <div
                  data-aos="fade-up"
                  data-aos-duration="500"
                  data-aos-once
                  className="text-[16px] text-C11"
                >
                  To support liver health, adopt a balanced lifestyle with a
                  diet rich in fruits, vegetables, whole grains, and lean
                  proteins, while minimizing processed foods and excessive fats.
                  Staying hydrated and moderating alcohol consumption are also
                  crucial. Regular medical check-ups can help monitor liver
                  function and catch potential issues early. By prioritizing
                  these practices, individuals can enhance liver function,
                  promoting long-term health and overall vitality.
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      ) : pageLoading === "not-loaded" ? (
        <div className="w-full min-h-screen flex justify-center items-center">
          <div className="flex justify-center text-[16px] font-light flex-col ">
            <Loader />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 w-full min-h-screen">
          <APIResponseStatus
            status={false}
            message={`${networkError ? "Network Error" : "An Error Occured"}`}
          />
        </div>
      )}
    </>
  );
}

export default HomePage;
