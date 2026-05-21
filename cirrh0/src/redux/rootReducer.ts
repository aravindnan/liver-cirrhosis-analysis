import { combineReducers } from "redux";
import { isTemplateExpression } from "typescript";
import {authReducer} from './reducer'


export const rootReducer=combineReducers({
    authReducer,
})