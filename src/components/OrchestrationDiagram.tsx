import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType,
  Node,
  Edge,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Zap, 
  Database, 
  BrainCircuit, 
  Shield, 
  PlayCircle, 
  Activity,
  Save
} from 'lucide-react';

const CustomNode = ({ data }: any) => {
  const Icon = data.icon;
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-white shadow-xl flex flex-col items-center gap-2 min-w-[140px] ${data.color}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-300" />
      <div className={`p-2 rounded-lg ${data.bg}`}>
        <Icon className={`w-5 h-5 ${data.iconColor}`} />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-gray-900">{data.label}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{data.role}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-300" />
      
      {/* Side handles for loops */}
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-indigo-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!bg-indigo-400" />
    </div>
  );
};

const nodeTypes = {
  agent: CustomNode,
};

export default function OrchestrationDiagram() {
  const initialNodes: Node[] = [
    {
      id: 'orchestrator',
      type: 'agent',
      position: { x: 250, y: 150 },
      data: { 
        label: 'Master Orchestrator', 
        role: 'Central Control',
        icon: Zap,
        color: 'border-indigo-500',
        bg: 'bg-indigo-50',
        iconColor: 'text-indigo-600'
      },
    },
    {
      id: 'retrieval',
      type: 'agent',
      position: { x: 50, y: 50 },
      data: { 
        label: 'Data Retrieval', 
        role: 'Context Gatherer',
        icon: Database,
        color: 'border-blue-500',
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600'
      },
    },
    {
      id: 'decision',
      type: 'agent',
      position: { x: 450, y: 50 },
      data: { 
        label: 'Decision Engine', 
        role: 'RAG & Planning',
        icon: BrainCircuit,
        color: 'border-purple-500',
        bg: 'bg-purple-50',
        iconColor: 'text-purple-600'
      },
    },
    {
      id: 'verifier',
      type: 'agent',
      position: { x: 50, y: 250 },
      data: { 
        label: 'Verifier', 
        role: 'Safety Check',
        icon: Shield,
        color: 'border-emerald-500',
        bg: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
      },
    },
    {
      id: 'executor',
      type: 'agent',
      position: { x: 450, y: 250 },
      data: { 
        label: 'Action Executor', 
        role: 'Execution',
        icon: PlayCircle,
        color: 'border-orange-500',
        bg: 'bg-orange-50',
        iconColor: 'text-orange-600'
      },
    },
    {
      id: 'memory',
      type: 'agent',
      position: { x: 250, y: -50 },
      data: { 
        label: 'Memory Agent', 
        role: 'Context Storage',
        icon: Save,
        color: 'border-gray-500',
        bg: 'bg-gray-50',
        iconColor: 'text-gray-600'
      },
    },
    {
      id: 'anomaly',
      type: 'agent',
      position: { x: 250, y: 350 },
      data: { 
        label: 'Anomaly Detector', 
        role: 'Self-Healing',
        icon: Activity,
        color: 'border-red-500',
        bg: 'bg-red-50',
        iconColor: 'text-red-600'
      },
    },
  ];

  const initialEdges: Edge[] = [
    // Main Flow
    { id: 'e1', source: 'orchestrator', target: 'retrieval', animated: true, label: 'Fetch Context' },
    { id: 'e2', source: 'retrieval', target: 'orchestrator', animated: true, label: 'Raw Data' },
    { id: 'e3', source: 'orchestrator', target: 'decision', animated: true, label: 'Plan Request' },
    { id: 'e4', source: 'decision', target: 'orchestrator', animated: true, label: 'Strategy' },
    { id: 'e5', source: 'orchestrator', target: 'verifier', animated: true, label: 'Validate' },
    { id: 'e6', source: 'verifier', target: 'orchestrator', animated: true, label: 'Approval' },
    { id: 'e7', source: 'orchestrator', target: 'executor', animated: true, label: 'Execute' },
    
    // Memory Integration
    { id: 'e8', source: 'memory', target: 'decision', style: { strokeDasharray: '5,5' }, label: 'RAG Context' },
    { id: 'e9', source: 'orchestrator', target: 'memory', style: { strokeDasharray: '5,5' }, label: 'Store Experience' },
    
    // Self-Healing Loops
    { 
      id: 'e10', 
      source: 'executor', 
      target: 'anomaly', 
      animated: true, 
      label: 'Monitor',
      markerEnd: { type: MarkerType.ArrowClosed }
    },
    { 
      id: 'e11', 
      source: 'anomaly', 
      target: 'orchestrator', 
      animated: true, 
      label: 'Heal/Retry',
      style: { stroke: '#ef4444' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
    },
  ];

  return (
    <div className="h-[500px] w-full bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-inner">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-dots-pattern"
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
