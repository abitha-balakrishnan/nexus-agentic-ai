export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'escalated' | 'healing';

export interface AgentEvent {
  event_type: 'agent_status';
  workflow_id: string;
  agent: string;
  status: AgentStatus;
  step: number;
  total_steps: number;
  message: string;
  confidence?: number;
  timestamp: string;
}

export interface WorkflowState {
  id: string;
  type: 'procurement' | 'meeting' | 'custom';
  status: 'active' | 'completed' | 'failed' | 'escalated';
  current_step: number;
  total_steps: number;
  progress: number;
  logs: AgentEvent[];
  data: any;
}

export interface AuditLog {
  id: number;
  workflow_id: string;
  step_number: number;
  agent_id: string;
  timestamp: string;
  input_context: string;
  reasoning: string;
  decision: string;
  confidence_score: number;
  outcome: string;
  error_details: string;
  hash: string;
  prevHash: string;
}

export interface SystemMetrics {
  completed_today: number;
  avg_completion_time: number;
  escalation_rate: number;
  autonomy_rate: number;
}

export interface WorkflowVersion {
  id: string;
  name: string;
  version: number;
  workflow: any;
  timestamp: string;
  description: string;
}

export interface UserTask {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  severity: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  active: boolean;
}
