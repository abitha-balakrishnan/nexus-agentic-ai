import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AgentEvent } from '../types';

interface WorkflowContextType {
  workflow: any | null;
  setWorkflow: (workflow: any) => void;
  workflowStatus: any | null;
  runHistory: any[];
  running: boolean;
  startWorkflow: (workflow: any) => void;
  stopWorkflow: (confirm?: boolean) => void;
  setWorkflowStatus: (status: any) => void;
  setRunHistory: (history: any[]) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflow, setWorkflow] = useState<any>(null);
  const [workflowStatus, setWorkflowStatus] = useState<any | null>(null);
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'WORKFLOW_UPDATE') {
        setWorkflowStatus(data);
        setRunHistory(prev => [...prev, data]);
        if (data.status === 'completed' || data.status === 'failed') {
          setRunning(false);
        }
      }
    };

    return () => ws.close();
  }, []);

  const startWorkflow = (workflow: any) => {
    if (!wsRef.current) return;
    setRunning(true);
    setRunHistory([]);
    setWorkflowStatus({ 
      message: 'Initializing constructed workflow...', 
      status: 'running', 
      step: 0, 
      total_steps: workflow.agents.length 
    });
    
    wsRef.current.send(JSON.stringify({
      type: 'TRIGGER_WORKFLOW',
      data: {
        type: 'custom_builder',
        params: { source: 'builder' },
        workflow: workflow
      }
    }));
  };

  const stopWorkflow = (confirm = true) => {
    if (confirm && !window.confirm('Are you sure you want to stop the current workflow execution?')) {
      return;
    }
    setRunning(false);
    setWorkflowStatus(null);
    setRunHistory([]);
  };

  return (
    <WorkflowContext.Provider value={{ 
      workflow,
      setWorkflow,
      workflowStatus, 
      runHistory, 
      running, 
      startWorkflow, 
      stopWorkflow,
      setWorkflowStatus,
      setRunHistory
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
