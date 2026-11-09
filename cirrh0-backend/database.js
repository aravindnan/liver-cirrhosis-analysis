const mongoose = require("mongoose");
const { DB_NAME, DB_PASSWORD, DB_USERNAME, DB_HOST } = require("./env/dotenv");

const connectToDatabase = async () => {
  const user = encodeURIComponent(DB_USERNAME);
  const pass = encodeURIComponent(DB_PASSWORD);
  await mongoose.connect(
    `mongodb+srv://${user}:${pass}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`
  );
};

module.exports = { connectToDatabase };
