import React, { useEffect, useState, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Shield, 
  Zap, 
  Database, 
  BrainCircuit, 
  PlayCircle,
  AlertCircle,
  Command
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AgentEvent } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const agentIcons: Record<string, any> = {
  master_orchestrator: Zap,
  data_retrieval: Database,
  decision_engine: BrainCircuit,
  verifier: Shield,
  action_executor: PlayCircle,
  anomaly_detector: Activity,
};

export default function Console() {
  const [logs, setLogs] = useState<AgentEvent[]>([]);
  const [command, setCommand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ cpu: 12, latency: 42, uptime: '99.99%', activeAgents: 12, dailyDecisions: 1420, securityAlerts: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'GET_SYSTEM_STATS' }));
    };

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'SYSTEM_STATS') {
        setStats(data);
      } else if (type === 'COMMAND_RESPONSE') {
        const newLog: AgentEvent = {
          event_type: 'agent_status',
          workflow_id: 'SYS',
          agent: 'master_orchestrator',
          status: 'idle',
          step: 0,
          total_steps: 0,
          message: data.message,
          timestamp: data.timestamp
        };
        setLogs(prev => [...prev, newLog]);
      }
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'GET_SYSTEM_STATS' }));
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  useEffect(() => {
    const path = 'workflow_events';
    const q = query(
      collection(db, path),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs: AgentEvent[] = [];
      snapshot.forEach((doc) => {
        newLogs.push(doc.data() as AgentEvent);
      });
      // Reverse to show oldest at top for terminal feel
      setLogs(prev => {
        const existingIds = new Set(prev.map(l => l.timestamp + l.message));
        const uniqueNew = newLogs.filter(l => !existingIds.has(l.timestamp + l.message));
        return [...prev, ...uniqueNew.reverse()].slice(-100);
      });
      setError(null);
    }, (err) => {
      setError("Console connection interrupted.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    const newLog: AgentEvent = {
      event_type: 'agent_status',
      workflow_id: 'CMD',
      agent: 'master_orchestrator',
      status: 'idle',
      step: 0,
      total_steps: 0,
      message: `> EXECUTING: ${command}`,
      timestamp: new Date().toISOString()
    };
    
    setLogs(prev => [...prev, newLog]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'EXECUTE_COMMAND',
        data: { command }
      }));
    }

    setCommand('');
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 text-gray-900">
            <Terminal className="w-6 h-6 text-indigo-600" />
            Agent Console
          </h1>
          <p className="text-gray-500">Real-time telemetry and command interface for the NEXUS swarm.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-mono text-indigo-600">CPU: {stats.cpu}%</span>
          </div>
          <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-mono text-emerald-600">LATENCY: {stats.latency}ms</span>
          </div>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 bg-[#0a0a0f] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col font-mono relative">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10 opacity-20" />
          
          {/* Header */}
          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between z-20">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            </div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">NEXUS-OS v4.2.0-STABLE</span>
          </div>

          {/* Output */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-thin scrollbar-thumb-white/10"
          >
            {error && (
              <div className="text-red-400 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4" />
                <span>[ERROR] {error}</span>
              </div>
            )}
            
            <div className="text-indigo-400/60 mb-4">
              [SYSTEM] Initializing NEXUS Swarm Telemetry...<br />
              [SYSTEM] Establishing secure tunnel to NEXUS-WS...<br />
              [SYSTEM] Swarm status: ONLINE
            </div>

            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={cn(
                    "shrink-0 font-bold uppercase text-[10px] px-1.5 py-0.5 rounded h-fit",
                    log.agent === 'master_orchestrator' ? "bg-indigo-500/20 text-indigo-400" :
                    log.agent === 'verifier' ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-white/5 text-gray-400"
                  )}>
                    {(log.agent || '').replace('_', ' ')}
                  </span>
                  <span className={cn(
                    "break-all whitespace-pre-wrap",
                    log.message.startsWith('>') ? "text-amber-400" : "text-gray-100"
                  )}>
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input */}
          <form 
            onSubmit={handleCommand}
            className="p-4 bg-white/2 border-t border-white/5 flex items-center gap-3 z-20"
          >
            <Command className="w-4 h-4 text-indigo-400" />
            <input 
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command (e.g. /status, /agents, /alerts)..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-100 placeholder:text-white/10"
              autoFocus
            />
          </form>
        </div>

        {/* Sidebar for Commands */}
        <div className="w-64 space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              Sample Commands
            </h3>
            <div className="space-y-2">
              {[
                { cmd: '/status', desc: 'System health overview' },
                { cmd: '/agents', desc: 'List active swarm agents' },
                { cmd: '/alerts', desc: 'Recent security anomalies' },
                { cmd: '/reset', desc: 'Clear console buffer' },
                { cmd: '/logs', desc: 'Fetch last 50 audit logs' },
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setCommand(item.cmd)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-all group"
                >
                  <p className="text-xs font-mono font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">{item.cmd}</p>
                  <p className="text-[10px] text-gray-400">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Pro Tip</h3>
            <p className="text-[10px] leading-relaxed">
              Use the <span className="font-mono bg-white/20 px-1 rounded">/agents</span> command to see real-time confidence scores for each active node in the swarm.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: stats.activeAgents.toString(), icon: Cpu, color: 'text-indigo-600' },
          { label: 'Daily Decisions', value: stats.dailyDecisions.toLocaleString(), icon: BrainCircuit, color: 'text-emerald-600' },
          { label: 'Security Alerts', value: stats.securityAlerts.toString(), icon: Shield, color: stats.securityAlerts > 0 ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Uptime', value: stats.uptime, icon: Activity, color: 'text-indigo-600' },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl bg-white border border-gray-200 flex items-center gap-4 shadow-sm">
            <div className={cn("p-2 rounded-lg bg-gray-50", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{stat.label}</p>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
