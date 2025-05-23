# SBC GPT Notion Integration

This module provides integration between SBC GPT and Notion, allowing the system to retrieve and process information from a Notion workspace to answer user queries.

## Overview

The Notion integration enables SBC GPT to:
- Search for relevant content in a Notion workspace
- Retrieve and process information based on the query intent
- Provide structured responses with source information
- Handle different document types appropriately

## Features

- **Structured Knowledge Representation**: Uses a hardcoded representation of the Notion workspace structure for more effective retrieval
- **Two-Stage Retrieval**: Provides potential answer locations first, then detailed information when requested
- **Document Type-Specific Processing**: Handles different types of documents (policies, procedures, etc.) appropriately
- **Query Intent Classification**: Analyzes queries to determine the most effective retrieval strategy
- **Structure-Aware Search**: Leverages the workspace structure to find the most relevant content

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sbc-gpt.git
cd sbc-gpt

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your Notion API key and other credentials
```

## Configuration

### Environment Variables

```
# Notion API Configuration
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_IDS=comma,separated,database,ids
```

### Workspace Structure

The system uses a hardcoded representation of the Notion workspace structure. This is defined in `src/integrations/notion/workspaceStructure.js`.

To update the structure:
1. Edit the `WORKSPACE_STRUCTURE` object in the file
2. Add new sections, document types, or key terms as needed
3. Restart the server for changes to take effect

## Usage

### Basic Usage

The Notion integration is used by the central router to answer queries related to Notion content:

```javascript
// Example of how the central router uses the Notion agent
const notionAgent = new NotionAgent();

// Check if the agent can handle the query
const canHandle = await notionAgent.canHandle(query);

if (canHandle) {
  // Process the query with the Notion agent
  const response = await notionAgent.process(query);
  return response;
}
```

### Two-Stage Retrieval

The system uses a two-stage retrieval process:

1. **Initial Search**: Returns potential answer locations
   ```javascript
   const potentialAnswers = await notionAgent.findPotentialAnswers(query);
   ```

2. **Detailed Retrieval**: Gets detailed information when requested
   ```javascript
   const detailedContent = await notionAgent.getDetailedContent(sourceId, query);
   ```

## Architecture

### Components

- **Notion Agent**: Main entry point for the integration
- **Workspace Structure**: Hardcoded representation of the Notion workspace
- **Page Mapper**: Maps Notion page IDs to the defined structure
- **Structured Search**: Implements structure-aware search functionality
- **Content Processors**: Process different document types appropriately
- **Response Generator**: Formats responses based on content and query intent

### Flow

1. User query is received by the central router
2. Router determines if the Notion agent can handle the query
3. Notion agent analyzes the query intent
4. Agent performs a structure-aware search to find potential answers
5. Initial response with potential answer locations is returned
6. If user requests more detail, detailed content is retrieved
7. Response is formatted based on document type and query intent

## Development

### Project Structure

```
src/
├── agents/
│   └── notionAgent.js         # Main Notion agent implementation
├── integrations/
│   └── notion/
│       ├── api.js             # Notion API client
│       ├── cache.js           # Caching system
│       ├── contentProcessors/ # Document type-specific processors
│       ├── intentClassifier.js # Query intent classification
│       ├── pageMapper.js      # Maps pages to structure
│       ├── responseGenerator.js # Response formatting
│       ├── structuredSearch.js # Structure-aware search
│       ├── utils.js           # Utility functions
│       └── workspaceStructure.js # Hardcoded structure definition
└── tests/
    └── notion/               # Tests for Notion integration
```

### Adding a New Document Type

To add a new document type:

1. Update the `documentTypes` object in `workspaceStructure.js`:
   ```javascript
   'NEW_TYPE': {
     keyTerms: ['term1', 'term2'],
     importance: 'medium',
     contentStructure: 'custom'
   }
   ```

2. Create a new processor in `contentProcessors/`:
   ```javascript
   // newTypeProcessor.js
   function processNewTypeDocument(content) {
     // Process the content
     return {
       type: 'NEW_TYPE',
       // Extracted information
       fullContent: content
     };
   }
   ```

3. Register the processor in `contentProcessors/index.js`

### Testing

```bash
# Run all tests
npm test

# Run Notion integration tests specifically
npm test -- --grep "Notion"
```

## Troubleshooting

### Common Issues

- **API Rate Limits**: If you encounter rate limit errors, adjust the `NOTION_API_RATE_LIMIT` in `.env`
- **Missing Content**: Check that your Notion integration has access to the relevant pages
- **Structure Mapping Errors**: Update the hardcoded structure to match your Notion workspace

### Logging

The integration uses structured logging to help with debugging:

```javascript
// Enable debug logging
process.env.DEBUG_NOTION = 'true';
```

## Roadmap

- **Dynamic Structure Discovery**: Replace hardcoded structure with dynamic discovery
- **Semantic Search**: Add embedding-based search for better matching
- **Learning from Feedback**: Implement a feedback loop to improve retrievals
- **Cross-Document References**: Follow references between documents

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
