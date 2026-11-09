import React from 'react'
import { Navigate } from 'react-router-dom'
import Loader from '../assets/Loader'
import APIResponseStatus from '../components/APIResponseStatus'
import { useAuth } from './AuthContext'

// Wrap routes that need a signed-in user. Anonymous visitors are sent to the login page.
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="w-[100vw] h-[100vh] flex justify-center items-center">
        <Loader />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center flex-1 w-full h-[100vh]">
        <APIResponseStatus status={false} message="We could not reach the server. Please try again." />
      </div>
    )
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return children
}

export default RequireAuth
