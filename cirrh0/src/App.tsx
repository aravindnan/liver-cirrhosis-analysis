import React, { Suspense, lazy, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import "aos/dist/aos.css"
import AOS from "aos";
import Loader from './assets/Loader';

// One chunk per page so the first load only downloads what the visitor opens.
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const MRIAnalysisPage = lazy(() => import('./pages/MRIAnalysisPage'));
const ReportAnalysisPage = lazy(() => import('./pages/ReportAnalysisPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MRIResultPage = lazy(() => import('./pages/MRIResultPage'));
const ReportResultPage = lazy(() => import('./pages/ReportResultPage'));

function App() {
  useEffect(()=>{
    AOS.init();
  },[])
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="w-[100vw] h-[100vh] flex justify-center items-center"><Loader/></div>}>
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
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
