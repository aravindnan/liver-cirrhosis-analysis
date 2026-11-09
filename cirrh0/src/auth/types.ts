export type UserProfile = {
  _id: string
  username: string
  email: string
  fullName: string
  age: number
  gender: 'male' | 'female' | 'other'
  reportAnalysisSet: any[]
  mriAnalysisSet: any[]
}

// loading: first fetch in flight. anonymous: no valid session. error: the API could not be reached
// or failed, so we cannot tell whether the user is signed in.
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'
