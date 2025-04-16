export type AgentStatus = 'idle' | 'processing' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string; // Font Awesome icon class
  color: string; // CSS color value
  source?: string; // Data source (e.g., "Notion", "HubSpot")
  isActive: boolean;
  status: AgentStatus;
}

export type AgentId = string;
