import { Agent } from '../components/agents/types';

export const availableAgents: Agent[] = [
  {
    id: 'central-router',
    name: 'Central Router',
    description: 'Main agent that routes queries to specialized sub-agents',
    icon: 'fas fa-router',
    color: '#39908b', // Primary teal color
    isActive: true,
    status: 'idle'
  },
  {
    id: 'notion-agent',
    name: 'Notion Agent',
    description: 'Retrieves and processes information from Notion databases and pages',
    icon: 'fas fa-book',
    color: '#2E3338',
    source: 'Notion',
    isActive: true,
    status: 'idle'
  }
];
