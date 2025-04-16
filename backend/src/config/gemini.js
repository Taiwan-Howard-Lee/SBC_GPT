const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get models
const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-03-25" });
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

module.exports = {
  proModel,
  flashModel
};
