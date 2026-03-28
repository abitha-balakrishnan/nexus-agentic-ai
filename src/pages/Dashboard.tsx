import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Clock, 
  Shield, 
  Database, 
  BrainCircuit, 
  PlayCircle, 
  Zap,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AgentEvent, SystemMetrics } from '../types';
import { cn } from '../lib/utils';

const agentIcons: Record<string, any> = {
  master_orchestrator: Zap,
  data_retrieval: Database,
  decision_engine: BrainCircuit,
  verifier: Shield,
  action_executor: PlayCircle,
  anomaly_detector: Activity,
};

const agentColors: Record<string, string> = {
  master_orchestrator: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  data_retrieval: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  decision_engine: 'bg-amber-50 text-amber-600 border-amber-100',
  verifier: 'bg-purple-50 text-purple-600 border-purple-100',
  action_executor: 'bg-blue-50 text-blue-600 border-blue-100',
  anomaly_detector: 'bg-rose-50 text-rose-600 border-rose-100',
};

const statusColors: Record<string, string> = {
  running: 'bg-indigo-600',
  completed: 'bg-emerald-600',
  failed: 'bg-red-600',
  escalated: 'bg-amber-600',
  healing: 'bg-purple-600',
  idle: 'bg-gray-400',
};

import OrchestrationDiagram from '../components/OrchestrationDiagram';
import { useWorkflow } from '../contexts/WorkflowContext';

export default function Dashboard() {
  const { workflowStatus: builderStatus } = useWorkflow();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [activeWorkflows, setActiveWorkflows] = useState<Record<string, AgentEvent>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (events.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.timestamp.startsWith(today));
    const completedToday = todayEvents.filter(e => e.status === 'completed').length;
    const totalToday = new Set(todayEvents.map(e => e.workflow_id)).size;
    const autonomyRate = totalToday > 0 ? (completedToday / totalToday) : 0.92;

    setMetrics({
      completed_today: completedToday || 142,
      avg_completion_time: 4.2,
      escalation_rate: todayEvents.filter(e => e.status === 'escalated').length / (todayEvents.length || 1),
      autonomy_rate: autonomyRate || 0.92
    });
  }, [events]);

  useEffect(() => {
    // Fetch initial events from the API as a fallback/initial load
    const fetchInitialData = async () => {
      try {
        console.log("[Dashboard] Fetching initial audit data...");
        const response = await fetch('/api/audit');
        if (response.ok) {
          const initialEvents: AgentEvent[] = await response.json();
          console.log("[Dashboard] Initial audit data received:", initialEvents.length, "events");
          setEvents(initialEvents.reverse().slice(0, 50));
          
          // Determine active workflows from initial events
          const active: Record<string, AgentEvent> = {};
          const processedIds = new Set<string>();
          
          // Sort by timestamp to get the latest state for each workflow
          const sortedEvents = [...initialEvents].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          sortedEvents.forEach(data => {
            if (!processedIds.has(data.workflow_id)) {
              if (data.status === 'running' || data.status === 'healing' || data.status === 'escalated') {
                active[data.workflow_id] = data;
              }
              processedIds.add(data.workflow_id);
            }
          });
          console.log("[Dashboard] Active workflows from initial data:", Object.keys(active).length);
          setActiveWorkflows(active);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to fetch initial audit data:", err);
      }
    };

    fetchInitialData();

    // Listen for workflow events via Firestore
    const path = 'workflow_events';
    console.log("[Dashboard] Setting up Firestore listener on:", path);
    const q = query(
      collection(db, path),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("[Dashboard] Firestore snapshot received:", snapshot.size, "docs");
      const newEvents: AgentEvent[] = [];
      const active: Record<string, AgentEvent> = {};
      const processedIds = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data() as AgentEvent;
        newEvents.push(data);
        
        if (!processedIds.has(data.workflow_id)) {
          // Keep in active if running OR if completed/failed very recently (within 30s)
          const isRecent = (new Date().getTime() - new Date(data.timestamp).getTime()) < 30000;
          if (data.status === 'running' || data.status === 'healing' || data.status === 'escalated' || isRecent) {
            active[data.workflow_id] = data;
          }
          processedIds.add(data.workflow_id);
        }
      });

      setEvents(newEvents);
      setActiveWorkflows(active);
      setError(null);
    }, (err) => {
      console.error("[Dashboard] Firestore listener error:", err);
      setError("Failed to load real-time updates. Check permissions.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    // WebSocket support for real-time streaming
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => console.log("[Dashboard] WebSocket connected");
    ws.onerror = (err) => {
      console.error("[Dashboard] WebSocket connection error:", err);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'WORKFLOW_UPDATE') {
          const update = message.data as AgentEvent;
          console.log("[Dashboard] WebSocket update received:", update.workflow_id, update.status);
          setActiveWorkflows(prev => {
            const next = { ...prev };
            // Don't delete immediately, let the Firestore listener handle recent completions
            next[update.workflow_id] = update;
            return next;
          });
          setEvents(prev => [update, ...prev].slice(0, 50));
        }
      } catch (e) {
        console.error("[Dashboard] Failed to parse WebSocket message:", e);
      }
    };

    return () => {
      unsubscribe();
      ws.close();
    };
  }, []);

  const chartData = [
    { name: 'Mon', value: 40 },
    { name: 'Tue', value: 30 },
    { name: 'Wed', value: 65 },
    { name: 'Thu', value: 45 },
    { name: 'Fri', value: 90 },
    { name: 'Sat', value: 20 },
    { name: 'Sun', value: 15 },
  ];

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Active Workflows" 
          value={Object.keys(activeWorkflows).length + (builderStatus && builderStatus.status === 'running' ? 1 : 0)} 
          icon={Zap} 
          trend="Live" 
        />
        <MetricCard 
          label="Active Agents" 
          value={new Set([
            ...(Object.values(activeWorkflows) as AgentEvent[]).map(wf => wf.agent),
            ...(builderStatus && builderStatus.status === 'running' ? [builderStatus.agent || 'orchestrator'] : [])
          ]).size || 0} 
          icon={Cpu} 
          trend="Autonomous" 
        />
        <MetricCard 
          label="Workflows Today" 
          value={(metrics?.completed_today || 0) + (builderStatus && builderStatus.status === 'completed' ? 1 : 0)} 
          icon={CheckCircle2} 
          trend="+12%" 
        />
        <MetricCard 
          label="Autonomy Rate" 
          value={`${((metrics?.autonomy_rate || 0) * 100).toFixed(1)}%`} 
          icon={UserCheck} 
          trend="+8%" 
        />
      </div>

      {/* Orchestration Flow Diagram Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Agent Orchestration Flow</h2>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">Live Architecture</span>
        </div>
        <OrchestrationDiagram />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Workflows */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Active Workflows</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                  const ws = new WebSocket(`${protocol}//${window.location.host}`);
                  ws.onopen = () => {
                    ws.send(JSON.stringify({
                      type: 'TRIGGER_WORKFLOW',
                      data: { type: 'procurement', params: 'Simulated from Dashboard' }
                    }));
                    ws.close();
                  };
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all"
              >
                Simulate Activity
              </button>
              <span className="text-sm text-gray-500">{Object.keys(activeWorkflows).length} running</span>
            </div>
          </div>
          
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {builderStatus && (
                <motion.div
                  key="builder-workflow"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-2">
                    <span className="text-[8px] font-bold uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-full">Builder Active</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Custom Builder Workflow</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {(builderStatus.agent || 'Orchestrator').replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Step {builderStatus.step}/{builderStatus.total_steps}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-indigo-600" />
                        <span className="text-sm font-bold text-indigo-600 capitalize">
                          {builderStatus.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-700 font-medium italic">"{builderStatus.message}"</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                        {Math.round((builderStatus.step / builderStatus.total_steps) * 100)}%
                      </span>
                    </div>
                    
                    <div className="relative h-3 w-full bg-indigo-100 rounded-full overflow-hidden border border-indigo-200/50">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(builderStatus.step / builderStatus.total_steps) * 100}%` }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {(Object.values(activeWorkflows) as AgentEvent[]).map((wf) => (
                <motion.div
                  key={wf.workflow_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-indigo-500/30 transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                        agentColors[wf.agent] || 'bg-gray-50 text-gray-400 border-gray-100'
                      )}>
                        {React.createElement(agentIcons[wf.agent] || Zap, { className: "w-6 h-6" })}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Workflow #{wf.workflow_id.slice(0, 8)}</h3>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border",
                            agentColors[wf.agent] || 'bg-gray-50 text-gray-400 border-gray-100'
                          )}>
                            {(wf.agent || '').replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Step {wf.step}/{wf.total_steps}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", (statusColors[wf.status] || '').replace('text-', 'bg-'))} />
                        <span className={cn("text-sm font-bold capitalize", statusColors[wf.status])}>
                          {wf.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(wf.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium italic">"{wf.message}"</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {Math.round((wf.step / wf.total_steps) * 100)}%
                      </span>
                    </div>
                    
                    <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(wf.step / wf.total_steps) * 100}%` }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                      />
                      {/* Granular markers */}
                      <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                        {Array.from({ length: wf.total_steps - 1 }).map((_, i) => (
                          <div key={i} className="w-px h-full bg-white/20" />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex -space-x-1.5">
                        {Array.from({ length: wf.total_steps }).map((_, i) => {
                          const s = i + 1;
                          return (
                            <div 
                              key={s}
                              className={cn(
                                "w-7 h-7 rounded-xl border-2 border-white flex items-center justify-center text-[10px] font-bold transition-all duration-500",
                                s < wf.step ? "bg-emerald-500 text-white border-emerald-200 shadow-sm" :
                                s === wf.step ? "bg-indigo-600 text-white scale-125 z-10 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-100" :
                                "bg-gray-50 text-gray-300 border-gray-100"
                              )}
                            >
                              {s < wf.step ? <CheckCircle2 className="w-3 h-3" /> : s}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all duration-500",
                        agentColors[wf.agent] || 'bg-gray-50 text-gray-400 border-gray-100'
                      )}>
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", (statusColors[wf.status] || '').replace('text-', 'bg-'))} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {(wf.agent || '').replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {Object.keys(activeWorkflows).length === 0 && (
              <div className="p-12 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p>No active workflows detected</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Agent Activity</h2>
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
            <div className="max-h-[600px] overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {events.map((event, i) => (
                <div key={i} className="flex gap-3 relative">
                  {i !== events.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-100" />
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10",
                    (statusColors[event.status] || '').replace('text-', 'bg-').replace('600', '500/10'),
                    statusColors[event.status]
                  )}>
                    {React.createElement(agentIcons[event.agent] || Zap, { className: "w-4 h-4" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium truncate text-gray-900">{(event.agent || '').replace('_', ' ')}</p>
                      <span className="text-[10px] text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 text-gray-900">System Performance</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4f46e5" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, trend, negative }: any) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-200 hover:border-indigo-500/30 transition-all group shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          negative ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  );
}
