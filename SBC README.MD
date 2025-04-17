# Multi-Agent Chat Interface for Company Data Retrieval

## Overview

This project implements a ChatGPT-like conversational interface powered by a multi-agent backend system. The interface allows users to interact through a chat function while the backend dynamically retrieves and synthesizes data from multiple internal company data sources (Notion, HubSpot, and other proprietary tools or databases). The goal is to provide a unified, human-like interface that delivers comprehensive internal company information in real time.

## Architecture

### 1. Central Router & Query Refiner

- **Function**:
  - Receives user input via a chat interface
  - Refines the query using company context and predefined data structure
  - Routes the refined query to appropriate sub-agents based on the target source

- **Responsibilities**:
  - Maps initial queries to actionable sub-tasks
  - Maintains high-level awareness of internal data architectures
  - Enables efficient, dynamic retrieval of up-to-date information

### 2. Sub-Agent System

- **General Role**:
  Each specialized sub-agent interfaces with a specific tool or database:

  - **Notion Agent**:
    - Accesses the Notion API
    - Retrieves key structural data (titles, subtitled sections, etc.)
    - Dynamically fetches and synthesizes detailed content from Notion

  - **HubSpot & Other Agents**:
    - Interact with relevant APIs (HubSpot, CRM, scouting databases, etc.)
    - Retrieve and process information according to refined queries
    - Deliver specific details like contact information, event details, or proprietary policies

### 3. User Interface (Chat Function)

- **Features**:
  - ChatGPT-like UI for query input
  - Intuitive display of conversational exchanges
  - Option to "open" specific agents for directed queries

- **Workflow**:
  1. UI sends user query to central router
  2. Router refines query and dispatches to designated sub-agent(s)
  3. Sub-agents retrieve and process data from respective sources
  4. System aggregates responses, summarizes information, and delivers cohesive reply

## Goals & Benefits

- **Unified Data Access**: Single conversational interface to access diverse internal data repositories and services
- **Dynamic Information Retrieval**: Ensures only necessary details are fetched, keeping the system efficient and up-to-date
- **Streamlined Company Awareness**: Provides comprehensive internal insights through multiple specialized agents
- **Human-Like Interaction**: Mimics natural conversation, making information retrieval intuitive

## Technology Stack

- **Frontend**: React with HTML/CSS
- **Backend**: Node.js with Express
- **Integrations**:
  - Notion API (initial integration)
  - HubSpot API (planned)
  - Additional APIs as needed

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Notion API key
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sbc-gpt.git
cd sbc-gpt

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your Notion API key and other credentials

# Start the development server
npm run dev
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
# API Keys
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001/api
```

## Development Roadmap

1. **Phase 1: Project Setup and Core Architecture**
   - Set up project structure
   - Implement basic UI
   - Develop central router framework

2. **Phase 2: Sub-Agent Implementation**
   - Develop Notion agent
   - Develop HubSpot agent
   - Implement additional agents as needed

3. **Phase 3: Integration and Testing**
   - Integrate all components
   - Implement comprehensive testing
   - Refine user experience

4. **Phase 4: Deployment and Documentation**
   - Deploy to production environment
   - Complete documentation
   - Train users

## Project Structure

```
sbc-gpt/
├── .env                  # Environment variables
├── .gitignore           # Git ignore file
├── package.json         # Project dependencies and scripts
├── README.md            # Project documentation
├── public/              # Static assets
├── src/
│   ├── frontend/        # React frontend
│   │   ├── components/  # UI components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   ├── styles/      # CSS styles
│   │   ├── utils/       # Frontend utilities
│   │   ├── App.js       # Main React component
│   │   └── index.js     # Frontend entry point
│   ├── backend/         # Node.js backend
│   │   ├── router/      # Central router logic
│   │   ├── agents/      # Sub-agents for different data sources
│   │   │   ├── notion/  # Notion agent
│   │   │   └── hubspot/ # HubSpot agent (future)
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── utils/       # Backend utilities
│   │   └── server.js    # Server entry point
│   └── shared/          # Shared code between frontend and backend
└── tests/               # Test files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Project Link: [https://github.com/yourusername/sbc-gpt](https://github.com/yourusername/sbc-gpt)
