const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize the Google Generative AI with API key
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = "gemini-2.0-flash";

/**
 * Process a message with the Gemini model
 * @param {Array} messages - The conversation history
 * @returns {Promise<Object>} - The AI response
 */
const processMessage = async (messages) => {
  try {
    // Check if we have a valid API key
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.log('Using mock response because no valid API key is provided');
      return provideMockResponse(messages);
    }

    // Define the system prompt
    const systemPromptContent = `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia.

      IDENTITY:
      - You ARE an employee of SBC Australia
      - You are speaking as a representative of SBC Australia
      - You should use "we", "our", and "us" when referring to SBC Australia
      - You have been with the company for several years and are knowledgeable about its operations
      - You are proud to be part of the SBC Australia team

      COMPANY INFORMATION:
      - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
      - SBC Australia is a global leading startup accelerator
      - We help startups scale globally through mentorship, funding, and strategic connections
      - If you receive information about SBS Australia (broadcasting), IGNORE it completely
      - If asked about our vision and mission, our vision is to be the world's premier startup accelerator
      - Our mission is to empower innovative startups to transform industries and create global impact

      TONE AND STYLE:
      - Professional and confident
      - Concise and direct
      - Structured and organized
      - Helpful and service-oriented
      - Warm but not overly casual

      IMPORTANT RULES:
      - Always respond as if you are part of SBC Australia ("we", "our", "us")
      - Never use phrases like "Based on the information available" or "I can tell you that"
      - Never repeat information
      - Never use nested bullet points
      - Never use exclamation marks
      - Keep total response under 100 words whenever possible
      - Start with a direct answer in 1 sentence
      - If asked about vision, mission, or company information, respond as a knowledgeable insider
      - NEVER confuse SBC Australia with SBS (Special Broadcasting Service)`;

    try {
      // Get the model
      const model = genAI.getGenerativeModel({ model: modelName });

      // Format the conversation history for Gemini
      const formattedMessages = [];

      // Add system message first if it's not already in the messages
      const hasSystemMessage = messages.some(msg => msg.role === 'system');

      if (!hasSystemMessage) {
        formattedMessages.push({
          role: "user",
          parts: [{ text: systemPromptContent }],
        });

        formattedMessages.push({
          role: "model",
          parts: [{ text: "I understand my role as SBC Assistant. I'll follow these guidelines in our conversation." }],
        });
      }

      // Add the rest of the messages
      for (const msg of messages) {
        if (msg.role === 'system') continue; // Skip system messages as we've handled them

        formattedMessages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }

      // If there are no messages after filtering, return a mock response
      if (formattedMessages.length === 0) {
        console.log('No valid messages to send to Gemini');
        return provideMockResponse(messages);
      }

      // Create a chat session
      const chat = model.startChat({
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 2048,
        },
        history: formattedMessages.slice(0, -1), // All messages except the last one
      });

      // Send the last message to get a response
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);

      return {
        content: result.response.text(),
        model: modelName
      };
    } catch (apiError) {
      console.error('Error calling Gemini API:', apiError);
      console.log('Falling back to mock response');
      return provideMockResponse(messages);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    throw new Error(`Failed to process message: ${error.message}`);
  }
};

/**
 * Provide a mock response when the API is not available
 * @param {Array} messages - The conversation history
 * @returns {Object} - A mock response
 */
const provideMockResponse = (messages) => {
  // Get the last user message
  const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
  const userContent = lastUserMessage ? lastUserMessage.content : '';

  // Generate a contextual mock response
  let response;

  if (userContent.toLowerCase().includes('weather')) {
    response = 'No access to weather data. Check Weather.com, your device\'s weather app, or ask a virtual assistant.';
  } else if (userContent.toLowerCase().includes('hello') || userContent.toLowerCase().includes('hi')) {
    response = 'Hello. I\'m SBC Assistant. How can I help you?';
  } else if (userContent.toLowerCase().includes('help')) {
    response = 'I can help with company information, knowledge base queries, and basic tasks. What do you need?';
  } else if (userContent.toLowerCase().includes('thank')) {
    response = 'You\'re welcome.';
  } else {
    response = 'Running in simulation mode. Add a Gemini API key to your .env file and restart for full functionality.';
  }

  return {
    content: response,
    model: 'simulation-mode'
  };
};

module.exports = {
  processMessage,
  genAI,
  modelName
};
