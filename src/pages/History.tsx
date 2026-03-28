import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History as HistoryIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Search,
  Workflow,
  Zap,
  Shield,
  Activity,
  Database,
  BrainCircuit,
  PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface WorkflowHistory {
  workflow_id: string;
  timestamp: string;
  status: string;
  steps: any[];
}

const agentIcons: Record<string, any> = {
  master_orchestrator: Zap,
  data_retrieval: Database,
  decision_engine: BrainCircuit,
  verifier: Shield,
  action_executor: PlayCircle,
  anomaly_detector: Activity,
};

export default function History() {
  const [history, setHistory] = useState<WorkflowHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowHistory | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        setHistory(data);
      } catch (e) {
        console.error("Failed to fetch history:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredHistory = history.filter(h => 
    h.workflow_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.steps.some(s => s.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-indigo-600" />
            Workflow History
          </h1>
          <p className="text-gray-500">Review previously executed autonomous workflows and their outcomes.</p>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search workflows..."
            className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-gray-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* History List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p>Loading history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <Workflow className="w-12 h-12 mb-4 opacity-20" />
              <p>No history found</p>
            </div>
          ) : (
            filteredHistory.map((wf) => (
              <button
                key={wf.workflow_id}
                onClick={() => setSelectedWorkflow(wf)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all group",
                  selectedWorkflow?.workflow_id === wf.workflow_id
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-gray-200 hover:border-indigo-100 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-gray-400">#{wf.workflow_id.slice(0, 8)}</span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    wf.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                    wf.status === 'failed' ? "bg-red-50 text-red-600" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    {wf.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : 
                     wf.status === 'failed' ? <XCircle className="w-3 h-3" /> : 
                     <Clock className="w-3 h-3" />}
                    {wf.status}
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 truncate">
                  {wf.steps[0]?.message || 'Untitled Workflow'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{new Date(wf.timestamp).toLocaleString()}</span>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    selectedWorkflow?.workflow_id === wf.workflow_id ? "translate-x-1 text-indigo-600" : "text-gray-300"
                  )} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Workflow Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedWorkflow ? (
              <motion.div
                key={selectedWorkflow.workflow_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Workflow Execution Details</h2>
                    <span className="text-xs font-mono text-gray-400">ID: {selectedWorkflow.workflow_id}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{new Date(selectedWorkflow.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{selectedWorkflow.steps.length} Steps Executed</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedWorkflow.steps.map((step: any, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      {i !== selectedWorkflow.steps.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100" />
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 border",
                        step.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        step.status === 'failed' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-indigo-50 text-indigo-600 border-indigo-100"
                      )}>
                        {React.createElement(agentIcons[step.agent] || Zap, { className: "w-5 h-5" })}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900 capitalize">{(step.agent || '').replace('_', ' ')}</h3>
                          <span className="text-[10px] text-gray-400">{new Date(step.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{step.message}"</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                            step.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                            step.status === 'failed' ? "bg-red-100 text-red-700" :
                            "bg-indigo-100 text-indigo-700"
                          )}>
                            {step.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Confidence: {Math.round(step.confidence_score * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-12">
                <HistoryIcon className="w-16 h-16 mb-4 opacity-10" />
                <h3 className="text-lg font-bold text-gray-500">Select a workflow to view details</h3>
                <p className="text-sm text-center max-w-xs mt-2">
                  Click on any workflow from the left sidebar to see its full execution path and agent decisions.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
