import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ErrorPage from './pages/ErrorPage';
import "aos/dist/aos.css"
import AOS from "aos";
import AboutPage from './pages/AboutPage';
import MRIAnalysisPage from './pages/MRIAnalysisPage';
import ReportAnalysisPage from './pages/ReportAnalysisPage';
import ProfilePage from './pages/ProfilePage';
import MRIResultPage from './pages/MRIResultPage';
import ReportResultPage from './pages/ReportResultPage';

function App() {
  useEffect(()=>{
    AOS.init();
  },[])
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/signup" element={<SignupPage/>}/>
          <Route path="/about" element={<AboutPage/>}/>
          <Route path="/mri-analysis" element={<MRIAnalysisPage/>}/>
          <Route path="/report-analysis" element={<ReportAnalysisPage/>}/>
          <Route path="/profile" element={<ProfilePage/>}/>
          <Route path="/mri-result" element={<MRIResultPage/>}/>
          <Route path="/report-result" element={<ReportResultPage/>}/>
          <Route path="*" element={<ErrorPage/>}/>
          <Route path ="*" element={<ErrorPage/>}/>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
