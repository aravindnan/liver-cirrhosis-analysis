const axios = require("axios");
const { ML_SERVICE_TOKEN } = require("../env/dotenv");

// Calls to the internal Python service always have a timeout and carry the shared service token.
const post = (url, body, timeout) =>
  axios.post(url, body, {
    timeout,
    headers: ML_SERVICE_TOKEN ? { "X-Service-Token": ML_SERVICE_TOKEN } : {},
  });

const asList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

module.exports = { post, asList };
