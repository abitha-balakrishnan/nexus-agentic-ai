import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Play, 
  Save, 
  Code, 
  Workflow, 
  Plus,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
  Zap,
  Database,
  Cpu,
  Shield,
  Layout,
  Eye,
  Terminal,
  History,
  RotateCcw,
  Clock,
  Info,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  FileText,
  FileJson,
  Download,
  FolderOpen,
  FilePlus,
  Edit3,
  Trash2,
  X,
  Search,
  ChevronRight,
  Settings2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { WorkflowVersion } from '../types';
import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import { useWorkflow } from '../contexts/WorkflowContext';

const agentIcons: Record<string, any> = {
  master_orchestrator: Zap,
  data_retrieval: Database,
  decision_engine: BrainCircuit,
  verifier: Shield,
  action_executor: Play,
  anomaly_detector: Cpu,
};

export default function Builder() {
  const [prompt, setPrompt] = useState('');
  const [parsing, setParsing] = useState(false);
  const { 
    workflow, 
    setWorkflow, 
    workflowStatus, 
    runHistory, 
    running, 
    startWorkflow, 
    stopWorkflow, 
    setWorkflowStatus, 
    setRunHistory 
  } = useWorkflow();
  const [view, setView] = useState<'visual' | 'code'>('visual');
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ title: string; message: string; onConfirm: () => void; type?: 'danger' | 'info' }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isListening, setIsListening] = useState(false);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  const [versionSort, setVersionSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchVersions();
    
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setPrompt(prev => prev + event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (workflowStatus?.status === 'completed' || workflowStatus?.status === 'failed') {
      setShowExecutionDialog(true);
    }
  }, [workflowStatus]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/versions');
      const data = await res.json();
      setVersions(data);
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    }
  };

  const handleSaveVersion = async () => {
    if (!workflow) return;
    setModalConfig({
      title: 'Save Workflow Version',
      message: 'Are you sure you want to save the current workflow as a new version?',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/versions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: workflow.name || 'Untitled Workflow',
              workflow,
              description: prompt.slice(0, 100) + '...'
            })
          });
          if (res.ok) {
            fetchVersions();
            setNotification("Version saved successfully!");
            setTimeout(() => setNotification(null), 3000);
          }
        } catch (e) {
          console.error("Failed to save version:", e);
        }
      }
    });
    setIsModalOpen(true);
  };

  const handleRevert = (version: WorkflowVersion) => {
    setModalConfig({
      title: 'Revert Workflow',
      message: `Are you sure you want to revert to version ${version.version}? Current unsaved changes will be lost.`,
      onConfirm: () => {
        setWorkflow(version.workflow);
        setPrompt(version.description || '');
        setNotification(`Reverted to version ${version.version}`);
        setTimeout(() => setNotification(null), 3000);
      }
    });
    setIsModalOpen(true);
  };

  const handleDeleteVersion = (version: WorkflowVersion) => {
    setModalConfig({
      title: 'Delete Version',
      message: `Are you sure you want to delete version ${version.version}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/versions/${version.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchVersions();
            setNotification("Version deleted successfully!");
            setTimeout(() => setNotification(null), 3000);
          }
        } catch (e) {
          console.error("Failed to delete version:", e);
        }
      }
    });
    setIsModalOpen(true);
  };

  const handleNewWorkflow = () => {
    setModalConfig({
      title: 'New Workflow',
      message: 'Are you sure you want to start a new workflow? All unsaved changes will be lost.',
      onConfirm: () => {
        setWorkflow(null);
        setPrompt('');
        setWorkflowStatus(null);
        setRunHistory([]);
        setNotification("New workflow section opened.");
        setTimeout(() => setNotification(null), 3000);
      }
    });
    setIsModalOpen(true);
  };

  const handleExport = (format: 'pdf' | 'txt' | 'json') => {
    if (!workflow) return;
    const content = format === 'json' ? JSON.stringify(workflow, null, 2) : 
                    `Workflow: ${workflow.name}\n\nAgents:\n` + 
                    workflow.agents.map((a: any) => `- ${a.id} (${a.role}): ${a.description}`).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name || 'workflow'}.${format === 'pdf' ? 'txt' : format}`; // Mock PDF as TXT for now
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification(`Workflow saved as ${format.toUpperCase()}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRunWorkflow = () => {
    if (!workflow) return;
    startWorkflow(workflow);
  };

  const handleParse = async () => {
    if (!prompt) return;
    setParsing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const systemInstruction = `You are an expert enterprise workflow architect. 
      Convert the user's natural language description into a structured JSON workflow.
      Return a JSON object with:
      {
        "name": "String",
        "agents": [
          { 
            "id": "String", 
            "role": "data_retrieval" | "decision_engine" | "verifier" | "action_executor" | "anomaly_detector", 
            "description": "String", 
            "dependencies": ["String"],
            "retries": 3
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const data = JSON.parse(response.text);
      setWorkflow(data);
      setNotification("Workflow generated successfully!");
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setParsing(false);
    }
  };

  const approxTime = useMemo(() => {
    if (!workflow || !workflow.agents) return 0;
    // Each agent takes approx 1.5s + overhead
    return workflow.agents.length * 2;
  }, [workflow]);

  const selectedAgent = useMemo(() => {
    if (!workflow || !selectedAgentId) return null;
    return workflow.agents.find((a: any) => a.id === selectedAgentId);
  }, [workflow, selectedAgentId]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
    }, eds));
    
    // Update dependencies in workflow state
    if (params.source && params.target) {
      setWorkflow(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: prev.agents.map((agent: any) => 
            agent.id === params.target 
              ? { ...agent, dependencies: Array.from(new Set([...(agent.dependencies || []), params.source!])) }
              : agent
          )
        };
      });
    }
  }, [setEdges, setWorkflow]);

  // Convert workflow to React Flow nodes and edges
  useEffect(() => {
    if (!workflow || !workflow.agents) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = workflow.agents.map((agent: any, index: number) => {
      const isRunning = workflowStatus && workflowStatus.agent === agent.id;
      const isCompleted = runHistory.some(h => h.agent === agent.id && h.status === 'completed');
      const isFailed = runHistory.some(h => h.agent === agent.id && h.status === 'failed');

      return {
        id: agent.id,
        data: { 
          label: (
            <div className={cn(
              "p-3 rounded-xl bg-white border shadow-sm min-w-[180px] group relative transition-all duration-500",
              isRunning ? "border-indigo-500 ring-2 ring-indigo-500/20 scale-105" : 
              isCompleted ? "border-emerald-500 bg-emerald-50/30" :
              isFailed ? "border-red-500 bg-red-50/30" : "border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    isRunning ? "bg-indigo-500 text-white animate-pulse" :
                    isCompleted ? "bg-emerald-100 text-emerald-600" :
                    isFailed ? "bg-red-100 text-red-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {React.createElement(agentIcons[agent.role] || Zap, { size: 14 })}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{(agent.role || '').replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isRunning && <Activity className="w-3 h-3 text-indigo-500 animate-spin" />}
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  {isFailed && <AlertCircle className="w-3 h-3 text-red-500" />}
                  <Tooltip content={agent.description || "Autonomous agent responsible for specific workflow tasks."}>
                    <Info className="w-3 h-3 text-gray-300 hover:text-indigo-500 cursor-help transition-colors" />
                  </Tooltip>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-900">{agent.id}</p>
              {isRunning && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                />
              )}
            </div>
          )
        },
        position: { x: 250 * (index % 3), y: 150 * Math.floor(index / 3) },
        style: { background: 'transparent', border: 'none', padding: 0 },
      };
    });

    const newEdges: Edge[] = [];
    workflow.agents.forEach((agent: any) => {
      if (agent.dependencies) {
        agent.dependencies.forEach((depId: string) => {
          newEdges.push({
            id: `e-${depId}-${agent.id}`,
            source: depId,
            target: agent.id,
            animated: workflowStatus && (workflowStatus.agent === depId || workflowStatus.agent === agent.id),
            style: { 
              stroke: workflowStatus && workflowStatus.agent === agent.id ? '#6366f1' : '#cbd5e1', 
              strokeWidth: workflowStatus && workflowStatus.agent === agent.id ? 3 : 2 
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: workflowStatus && workflowStatus.agent === agent.id ? '#6366f1' : '#cbd5e1',
            },
          });
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflow, workflowStatus, runHistory]);

  const filteredVersions = useMemo(() => {
    return versions
      .filter(v => 
        v.name.toLowerCase().includes(versionFilter.toLowerCase()) || 
        v.description?.toLowerCase().includes(versionFilter.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return versionSort === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [versions, versionFilter, versionSort]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />

      {/* Post-Execution Dialog */}
      <Modal
        isOpen={showExecutionDialog}
        onClose={() => setShowExecutionDialog(false)}
        title="Workflow Finished"
        message="The workflow has finished processing. Do you want to close the execution view or keep it visible?"
        onConfirm={() => {
          setWorkflowStatus(null);
          setRunHistory([]);
          setShowExecutionDialog(false);
        }}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onCancel={() => setShowExecutionDialog(false)}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setShowExecutionDialog(false)
        }}
      />

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900">Workflow Architect</h1>
          <p className="text-gray-500">Design multi-agent swarms using natural language reasoning.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button 
              onClick={() => setView('visual')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                view === 'visual' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Layout className="w-4 h-4" />
              Visual
            </button>
            <button 
              onClick={() => setView('code')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                view === 'code' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Code className="w-4 h-4" />
              Schema
            </button>
          </div>
          
          <button 
            onClick={() => setShowVersions(!showVersions)}
            className={cn(
              "p-2 rounded-xl border transition-all",
              showVersions ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
            )}
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <button 
          onClick={handleNewWorkflow}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-600 transition-all whitespace-nowrap"
        >
          <FilePlus className="w-4 h-4 text-indigo-500" />
          New
        </button>
        <button 
          onClick={() => setShowVersions(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-600 transition-all whitespace-nowrap"
        >
          <FolderOpen className="w-4 h-4 text-amber-500" />
          Open
        </button>
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <button 
          onClick={() => handleExport('txt')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-600 transition-all whitespace-nowrap"
        >
          <Save className="w-4 h-4 text-emerald-500" />
          Save
        </button>
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-600 transition-all whitespace-nowrap">
            <Download className="w-4 h-4 text-blue-500" />
            Save As
          </button>
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-600">
              <FileText className="w-4 h-4 text-red-500" />
              PDF Format
            </button>
            <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-600">
              <FileText className="w-4 h-4 text-blue-500" />
              Word Format
            </button>
            <button onClick={() => handleExport('json')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-600">
              <FileJson className="w-4 h-4 text-amber-500" />
              JSON Format
            </button>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <button 
          onClick={handleRunWorkflow}
          disabled={running || !workflow}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-lg",
            running || !workflow 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
          )}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Workflow
        </button>
        <div className="h-6 w-px bg-gray-200 mx-2" />
        <button 
          onClick={() => setView('visual')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-600 transition-all whitespace-nowrap"
        >
          <Edit3 className="w-4 h-4 text-purple-500" />
          Review
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Natural Language Interface</span>
              </div>
              {workflow && (
                <button 
                  onClick={handleSaveVersion}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
                  title="Save Version"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <textarea 
                className="w-full h-64 bg-gray-50 border border-gray-200 rounded-2xl p-6 text-lg focus:outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-gray-400 text-gray-900 pr-12"
                placeholder="e.g., When an invoice is received via email, check if the vendor is approved, match it against the PO, and if it's under ₹50,000, auto-approve the payment. Otherwise, escalate to the finance manager."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                onClick={toggleListening}
                className={cn(
                  "absolute bottom-4 right-4 p-3 rounded-xl transition-all shadow-lg",
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-gray-400 hover:text-indigo-600"
                )}
                title={isListening ? "Stop Listening" : "Voice Input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <button 
              onClick={handleParse}
              disabled={parsing || !prompt}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <BrainCircuit className="w-5 h-5" />
              )}
              <span>{parsing ? 'Architecting Workflow...' : 'Generate Workflow'}</span>
            </button>
          </div>

          {workflow && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield className="w-5 h-5" />
                  <h2 className="font-bold">Validation Status</h2>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  <Clock className="w-3 h-3" />
                  ~{approxTime}s
                </div>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Architecture generated successfully. All agent roles are compliant with NEXUS autonomous safety protocols.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={handleRunWorkflow}
                  disabled={running}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3",
                    running 
                      ? "bg-emerald-100 text-emerald-700 cursor-not-allowed" 
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  )}
                >
                  {running ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                  {running ? 'Workflow Executing...' : 'Run Workflow Now'}
                </button>

                <button 
                  onClick={handleSaveVersion}
                  className="w-full py-3 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save as New Version
                </button>
              </div>

              {workflowStatus && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-4 border-t border-emerald-100 space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    <span>Execution Status</span>
                    <span>{Math.round((workflowStatus.step / workflowStatus.total_steps) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(workflowStatus.step / workflowStatus.total_steps) * 100}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium italic truncate">
                    {workflowStatus.message}
                  </p>

                  <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                    {runHistory.map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-[9px] text-emerald-700/70"
                      >
                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span className="font-mono opacity-50 shrink-0">[{new Date(h.timestamp).toLocaleTimeString()}]</span>
                        <span className="font-bold uppercase shrink-0">{(h.agent || '').replace('_', ' ')}:</span>
                        <span className="italic">"{h.message}"</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-2 relative">
          <AnimatePresence>
            {showVersions && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-200 z-30 shadow-2xl p-6 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    Version History
                  </h3>
                  <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Filter versions..."
                        value={versionFilter}
                        onChange={(e) => setVersionFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Sort by</span>
                      <select 
                        value={versionSort}
                        onChange={(e) => setVersionSort(e.target.value as any)}
                        className="bg-transparent text-[10px] font-bold text-indigo-600 focus:outline-none"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>
                  </div>

                  {filteredVersions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No matching versions found.</p>
                  ) : (
                    filteredVersions.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2 group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">v{v.version}</span>
                          <span className="text-[10px] text-gray-400">{new Date(v.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 truncate">{v.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{v.description}</p>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <button 
                            onClick={() => handleRevert(v)}
                            title="Revert to this version"
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-gray-200 text-[10px] font-bold text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Revert
                          </button>
                          <button 
                            onClick={() => handleDeleteVersion(v)}
                            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-[600px] rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden relative">
            <AnimatePresence mode="wait">
              {view === 'visual' ? (
                <motion.div 
                  key="visual"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex"
                >
                  <div className="flex-1 h-full">
                    {workflow ? (
                      <ReactFlow 
                        nodes={nodes} 
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_, node) => setSelectedAgentId(node.id)}
                        onPaneClick={() => setSelectedAgentId(null)}
                        fitView
                        className="bg-gray-50/50"
                      >
                        <Background color="#e5e7eb" gap={20} />
                        <Controls />
                        <MiniMap nodeStrokeWidth={3} zoomable pannable />
                      </ReactFlow>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <Eye className="w-12 h-12 opacity-20" />
                        <p>Generate an architecture to see the visual flow</p>
                      </div>
                    )}
                  </div>

                  {/* Agent Inspector */}
                  <AnimatePresence>
                    {selectedAgent && (
                      <motion.div 
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto z-10 shadow-xl"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-indigo-600" />
                            Agent Config
                          </h3>
                          <button onClick={() => setSelectedAgentId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agent ID</label>
                            <input 
                              type="text"
                              value={selectedAgent.id}
                              onChange={(e) => {
                                const newId = e.target.value;
                                setWorkflow(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    agents: prev.agents.map((a: any) => a.id === selectedAgentId ? { ...a, id: newId } : a)
                                  };
                                });
                                setSelectedAgentId(newId);
                              }}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Role</label>
                            <select 
                              value={selectedAgent.role}
                              onChange={(e) => {
                                const role = e.target.value;
                                setWorkflow(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    agents: prev.agents.map((a: any) => a.id === selectedAgentId ? { ...a, role } : a)
                                  };
                                });
                              }}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-500"
                            >
                              {Object.keys(agentIcons).map(role => (
                                <option key={role} value={role}>{role.replace('_', ' ')}</option>
                              ))}
                              <option value="custom">Custom Role</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</label>
                            <textarea 
                              value={selectedAgent.description}
                              onChange={(e) => {
                                const description = e.target.value;
                                setWorkflow(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    agents: prev.agents.map((a: any) => a.id === selectedAgentId ? { ...a, description } : a)
                                  };
                                });
                              }}
                              className="w-full h-24 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dependencies</label>
                            <div className="flex flex-wrap gap-2">
                              {workflow.agents.filter((a: any) => a.id !== selectedAgentId).map((a: any) => (
                                <button
                                  key={a.id}
                                  onClick={() => {
                                    const deps = selectedAgent.dependencies || [];
                                    const newDeps = deps.includes(a.id) 
                                      ? deps.filter((d: string) => d !== a.id)
                                      : [...deps, a.id];
                                    
                                    setWorkflow(prev => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        agents: prev.agents.map((ag: any) => ag.id === selectedAgentId ? { ...ag, dependencies: newDeps } : ag)
                                      };
                                    });
                                  }}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                                    (selectedAgent.dependencies || []).includes(a.id)
                                      ? "bg-indigo-600 text-white"
                                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                  )}
                                >
                                  {a.id}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div 
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full bg-gray-900 p-6 overflow-auto font-mono text-xs text-indigo-300"
                >
                  <pre>{JSON.stringify(workflow, null, 2)}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
