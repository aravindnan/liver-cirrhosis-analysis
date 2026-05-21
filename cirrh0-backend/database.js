const mongoose = require("mongoose")
const {DB_NAME ,DB_PASSWORD ,DB_USERNAME} = require("./env/dotenv")

// Load environment variables from .env file
const  connectToDatabase = async () => {
const dbName = DB_NAME
const dbUsername = DB_USERNAME
const dbPassword = DB_PASSWORD

mongoose.connect(`mongodb+srv://${dbUsername}:${dbPassword}@cluster0.myusfay.mongodb.net/${dbName}?retryWrites=true&w=majority`,
{
    useNewUrlParser: true,
    useUnifiedTopology: true
}
)}
module.exports = { connectToDatabase };
