import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer"

export let store= configureStore({reducer:rootReducer})