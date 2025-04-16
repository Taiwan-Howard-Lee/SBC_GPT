import { Agent, AgentStatus } from '../components/agents/types';

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
  },
  {
    id: 'hubspot-agent',
    name: 'HubSpot Agent',
    description: 'Accesses customer data, contacts, and marketing information from HubSpot',
    icon: 'fas fa-users',
    color: '#FF7A59',
    source: 'HubSpot',
    isActive: true,
    status: 'idle'
  },
  {
    id: 'policy-agent',
    name: 'Policy Agent',
    description: 'Provides information about company policies, procedures, and guidelines',
    icon: 'fas fa-clipboard-list',
    color: '#6C63FF',
    source: 'Internal Docs',
    isActive: true,
    status: 'idle'
  },
  {
    id: 'events-agent',
    name: 'Events Agent',
    description: 'Retrieves information about company events, meetings, and schedules',
    icon: 'fas fa-calendar-alt',
    color: '#4CAF50',
    source: 'Calendar',
    isActive: true,
    status: 'idle'
  },
  {
    id: 'analytics-agent',
    name: 'Analytics Agent',
    description: 'Provides business metrics, KPIs, and performance data',
    icon: 'fas fa-chart-line',
    color: '#FF5722',
    source: 'Analytics DB',
    isActive: false,
    status: 'offline'
  },
  {
    id: 'hr-agent',
    name: 'HR Agent',
    description: 'Handles human resources related queries and information',
    icon: 'fas fa-user-tie',
    color: '#9C27B0',
    source: 'HR System',
    isActive: true,
    status: 'idle'
  }
];
