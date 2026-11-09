import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router";
import { MissionIcon, TeamIcon, VisionIcon } from "../assets/Icons";

function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();



  return (
    <div className="flex flex-col justify-between h-screen">
      <Navbar activePage="about" />
      <div className="flex flex-col flex-1 pt-[250px] pb-[100px] mx-auto w-[70%] gap-[250px]">
        <div className="flex flex-row justify-between ">
        <div className="flex flex-col justify-left text-left mt-[50px] w-[60%] ">
          <div
            data-aos="fade-up"
            data-aos-duration="700"
            data-aos-once

            className="text-[50px] text-C11 font-bold league-spartan"
          >
            Our Team
          </div>
          <div
            data-aos="fade-up"
            data-aos-duration="600"
            data-aos-once

            className="text-[18px]"
          >
            Welcome to Cirrh0, a college project dedicated to advancing liver
            cirrhosis prediction. Created by <strong className="text-C11">Aravind Nandakumar</strong>, <strong className="text-C11">Joe
            Payyappilly</strong>, and <strong className="text-C11">Mohit P</strong>, MCA 2nd-year students from <strong className="text-C11"> CHRIST (Deemed
              to be University)</strong>, our platform explores how machine learning can help people understand
            liver health. It is a research project, not a medical device.{" "}
          </div>
        </div>
        <div
        data-aos="fade-up"
        data-aos-duration="700"
        data-aos-once
 
        className="">
        <TeamIcon/>
        </div>
        </div>

        <div className="flex flex-row justify-between ">
        <div
        data-aos="fade-up"
        data-aos-duration="800"
        data-aos-once

        >
        <VisionIcon/>

        </div>
        <div className="flex flex-col justify-right text-right mt-[50px] ml-auto  w-[60%]">
          <div
            data-aos="fade-up"
            data-aos-duration="800"
            data-aos-once

            className="text-[50px] text-C11 font-bold league-spartan"
          >
            Our Vision
          </div>
          <div
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-once
            className="text-[18px]"
          >
            We strive to make <strong className="text-C11">early prediction</strong> of liver cirrhosis accessible and
            reliable, leading to better patient outcomes and effective
            <strong className="text-C11"> AI powered suggestions</strong>.{" "}
          </div>
        </div>
       
        </div>

        <div className="flex flex-row justify-between ">

        <div className="flex flex-col justify-left text-left mt-[50px]  w-[60%]">
          <div
            data-aos="fade-up"
            data-aos-duration="1200"
            data-aos-once

            className="text-[50px] text-C11 font-bold league-spartan"
          >
            Our Mission
          </div>
          <div
            data-aos="fade-up"
            data-aos-duration="600"
            className="text-[18px]"
            data-aos-once

          >
            Our goal is to enhance <strong className="text-C11">liver cirrhosis</strong> management through innovative
            predictive tools, utilizing advanced data analysis and <strong className="text-C11">machine
            learning</strong>  to produce educational insights to discuss with a doctor.
          </div>
        </div>
        <div
        data-aos="fade-up"
        data-aos-duration="600"
        data-aos-once

        >

        <MissionIcon/>
        </div>
        </div>


      </div>
      <Footer />
    </div>
  );
}

export default AboutPage;
