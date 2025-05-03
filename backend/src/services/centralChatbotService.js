const { genAI, modelName } = require('../services/geminiService');

/**
 * Central Chatbot Service
 *
 * This service acts as the final layer between agents and the user.
 * It takes agent responses and formats them in a professional, secretary-like manner.
 * It always uses the Gemini 2.0 Flash model for quick, conversational responses.
 */

/**
 * Process agent responses and format a final response for the user
 * @param {string} userQuery - The original user query
 * @param {Object} agentResponse - The response from the agent system
 * @param {Array} conversationHistory - The full conversation history
 * @returns {Promise<Object>} - The formatted response for the user
 */
const processAgentResponse = async (userQuery, agentResponse, conversationHistory = []) => {
  try {
    // Check if we have a valid API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.log('Central chatbot using mock response because no valid API key is provided');
      return {
        content: agentResponse.message || 'No response from agent',
        model: 'simulation-mode'
      };
    }

    console.log('Central chatbot processing agent response with Gemini Flash');

    // Create the system prompt content
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

    CONTEXT:
    - You have access to SBC Australia's knowledge base and company information
    - You are currently processing information from the company's internal resources
    - Your job is to present this information professionally to colleagues and clients
    - You should answer questions about SBC Australia as an insider with firsthand knowledge

    TONE AND STYLE:
    - Professional and confident
    - Concise and direct
    - Structured and organized
    - Helpful and service-oriented
    - Warm but not overly casual

    IMPORTANT RULES:
    - Always respond as if you are part of SBC Australia ("we", "our", "us")
    - Never mention that you're processing information from an agent or external source
    - Present the information as if it's your own company knowledge
    - Never use phrases like "Based on the information available" or "I can tell you that"
    - Never apologize for the information provided
    - Start with a direct answer to the user's query
    - If the information is incomplete, acknowledge that briefly and provide what you have
    - Format information in a readable way when appropriate (bullet points for lists, etc.)
    - Keep your response professional but conversational
    - If asked about vision, mission, or company information, respond as a knowledgeable insider
    - NEVER confuse SBC Australia with SBS (Special Broadcasting Service)`;

    // Format the agent response information
    const agentInfoContent = `AGENT INFORMATION:
    Agent: ${agentResponse.source || 'Knowledge Base'}
    Response: ${agentResponse.message || 'No specific message provided'}
    Success: ${agentResponse.success ? 'Yes' : 'No'}
    ${agentResponse.metadata ? `Additional context: ${JSON.stringify(agentResponse.metadata)}` : ''}`;

    // Prepare conversation history if available
    let historyContent = '';
    if (conversationHistory && conversationHistory.length > 0) {
      const relevantHistory = conversationHistory.slice(-10); // Last 5 exchanges (10 messages)
      historyContent = 'CONVERSATION HISTORY (for context):\n' +
        relevantHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');
    }

    // Combine all system information
    const fullSystemPrompt = [
      systemPromptContent,
      agentInfoContent,
      historyContent
    ].filter(Boolean).join('\n\n');

    // We'll use the chat-based approach instead of the direct content generation

    try {
      // Get the model
      const model = genAI.getGenerativeModel({ model: modelName });

      // Format the conversation for Gemini
      const formattedMessages = [];

      // Add system message first
      formattedMessages.push({
        role: "user",
        parts: [{ text: fullSystemPrompt }],
      });

      formattedMessages.push({
        role: "model",
        parts: [{ text: "I understand my role as SBC Assistant. I'll process this information professionally." }],
      });

      // Add the user query
      formattedMessages.push({
        role: "user",
        parts: [{ text: userQuery }],
      });

      // Create a chat session
      const chat = model.startChat({
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        history: formattedMessages.slice(0, -1), // All messages except the last one
      });

      // Send the last message to get a response
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);

      return {
        content: result.response.text(),
        model: modelName,
        originalAgentResponse: agentResponse // Keep the original response for debugging
      };
    } catch (apiError) {
      console.error('Error calling Gemini API for central chatbot:', apiError);
      // Fall back to the original agent response
      return {
        content: agentResponse.message || 'No response from agent',
        model: 'central-chatbot-error'
      };
    }
  } catch (error) {
    console.error('Error in central chatbot processing:', error);
    // Return the original agent response if there's an error
    return {
      content: agentResponse.message || 'Error processing response',
      model: 'central-chatbot-error'
    };
  }
};

module.exports = {
  processAgentResponse
};
