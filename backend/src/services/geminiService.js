const { proModel, flashModel } = require('../config/gemini');

/**
 * Determine which model to use based on the conversation context
 * @param {Array} messages - The conversation history
 * @returns {Object} - The appropriate Gemini model
 */
const determineModel = (messages) => {
  // Check if this is a routing decision or complex query
  const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');

  if (!lastUserMessage) {
    return proModel; // Default to pro model if no user message
  }

  const content = lastUserMessage.content.toLowerCase();

  // Use pro model for complex queries, routing, or thinking tasks
  if (
    content.includes('analyze') ||
    content.includes('explain') ||
    content.includes('compare') ||
    content.includes('summarize') ||
    content.length > 200 // Longer messages might need more complex reasoning
  ) {
    console.log('Using pro model for complex query');
    return proModel;
  }

  // Use flash model for simpler, conversational responses
  console.log('Using flash model for standard response');
  return flashModel;
};

/**
 * Process a message with the appropriate Gemini model
 * @param {Array} messages - The conversation history
 * @returns {Promise<string>} - The AI response
 */
const processMessage = async (messages) => {
  try {
    // Check if we have a valid API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.log('Using mock response because no valid API key is provided');
      return provideMockResponse(messages);
    }

    const model = determineModel(messages);

    // Format messages for Gemini - filter out system messages
    const formattedMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));

    // If there are no messages after filtering, return a mock response
    if (formattedMessages.length === 0) {
      console.log('No valid messages to send to Gemini after filtering system messages');
      return provideMockResponse(messages);
    }

    try {
      // Generate response
      const result = await model.generateContent({
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 2048,
        }
      });

      return {
        content: result.response.text(),
        model: model === proModel ? 'gemini-2.5-pro-preview-03-25' : 'gemini-2.0-flash'
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
    response = "I don't have access to real-time weather data. To get accurate weather information, you could check a weather service like Weather.com or AccuWeather, or use a weather app on your device.";
  } else if (userContent.toLowerCase().includes('hello') || userContent.toLowerCase().includes('hi')) {
    response = "Hello! I'm a simulated AI assistant. How can I help you today?";
  } else if (userContent.toLowerCase().includes('help')) {
    response = "I'm here to help answer your questions. You can ask me about a wide range of topics, and I'll do my best to provide useful information.";
  } else if (userContent.toLowerCase().includes('thank')) {
    response = "You're welcome! If you have any other questions, feel free to ask.";
  } else {
    response = "I'm currently running in simulation mode without access to the Gemini API. To use the full capabilities, please add a valid Gemini API key to your .env file. In the meantime, I can still help with basic conversations.";
  }

  return {
    content: response,
    model: 'simulation-mode'
  };
};

module.exports = {
  processMessage
};
