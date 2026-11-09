import { LOGIN, LOGOUT } from "../redux/types"

const authInitialState = {
    myUserProfile: null,
    isAuthenticated: false,
  };
  
export const authReducer=(state=authInitialState,action:any)=>{
  switch (action.type) {
    case LOGIN:
      // Pages dispatch whatever getUserById returned, including error objects (for example a 401
      // after the session expired). Only a real user document counts as logged in.
      if (typeof action.payload?._id !== "string") {
        return { ...state, myUserProfile: null, isAuthenticated: false };
      }
      return {
        ...state,
        myUserProfile: action.payload,
        isAuthenticated: true,
      };
    case LOGOUT:
      return {
        ...state,
        myUserProfile: null,
        isAuthenticated: false,
      };
    default:
      return state;
  }
}