import axios from "axios"
import { ENV } from "../env/environment"

export const  analyseMRIById =async (userId:String,data:any)=>{
    try {
        const response = await axios.post(`${ENV}/analyze-mri/${userId}`,data);
        console.log("Analyse MRI (IN SERVICE):", response);
        return response.data;
    } catch (error:any) {
        console.error("API Error: ", error);
        throw error; // Rethrow the error to be caught in handleAnalyzeReport
    }
}

// Function to fetch mri result by ID
export const getMRIResultById = async (mriId: string) => {
    try {
        console.log("Inservice mriid",mriId)
        const response = await axios.get(`${ENV}/get-mri-by-id/${mriId}`);
        return response.data.mriReport;
    } catch (error:any) {
        console.error("Error fetching report result:", error);
        throw error; // Propagate the error to be handled in the component
    }
};

export const deleteMRIById = async(mriId:String)=>{
    try{
        const response = await axios.delete(`${ENV}/delete-mri-by-id/${mriId}`);
        return response.data.report;
    }catch(error:any){
        console.error("Error DELTE mri :", error);
        throw error; 
    }
}