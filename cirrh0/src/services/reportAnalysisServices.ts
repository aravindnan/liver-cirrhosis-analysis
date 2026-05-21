import axios from "axios"
import { ENV } from "../env/environment"

export const getExtractedParameters = async (userId: String, fileURLSet: Array<String>) => {
    try {
        const res = await axios.post(`${ENV}/add-files-to-report/${userId}`, { fileURLSet });
        console.log("Extract Parameter (IN SERVICE):", res);
        return res.data;
    } catch (err: any) {
        console.log(err);
        throw err; // Rethrow the error so it can be caught in the React component
    }
};

export const analyseReportById = async (reportId: string, userId:string,validatedData: any) => {
    try {
        const response = await axios.post(`${ENV}/analyze-report`, {reportId:reportId,userId:userId, validatedData:validatedData });
        console.log("Analyse Report (IN SERVICE):", response);
        return response.data;
    } catch (error) {
        console.error("API Error: ", error);
        throw error; // Rethrow the error to be caught in handleAnalyzeReport
    }
};


// Function to fetch report result by ID
export const getReportResultById = async (reportId: string) => {
    try {
        const response = await axios.get(`${ENV}/get-report-by-id/${reportId}`);
        return response.data.report;
    } catch (error) {
        console.error("Error fetching report result:", error);
        throw error; // Propagate the error to be handled in the component
    }
};

export const deleteReportById = async(reportId:String)=>{
    try{
        const response = await axios.delete(`${ENV}/delete-report-by-id/${reportId}`);
        return response.data;
    }catch(error:any){
        console.error("Error DELTE report :", error);
        throw error; 
    }
}