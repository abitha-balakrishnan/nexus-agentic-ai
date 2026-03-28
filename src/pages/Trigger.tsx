import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Mic, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';

export default function Trigger() {
  const [activeTab, setActiveTab] = useState<'procurement' | 'meeting' | 'manual' | 'custom'>('procurement');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [manualParams, setManualParams] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTrigger = async () => {
    setLoading(true);
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setLoading(false);
          alert("Connection timeout. Please try again.");
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(JSON.stringify({
          type: 'TRIGGER_WORKFLOW',
          data: {
            type: activeTab,
            params: manualParams,
            fileName: selectedFile?.name
          }
        }));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setLoading(false);
        setSelectedFile(null);
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error("WebSocket Error:", err);
        setLoading(false);
        alert("Failed to connect to NEXUS server.");
      };
    } catch (e) {
      console.error("Trigger Error:", e);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Trigger Workflow</h1>
        <p className="text-gray-500">Initiate autonomous enterprise processes manually or via file upload.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 p-1 rounded-2xl bg-gray-100 border border-gray-200">
        <TabButton 
          active={activeTab === 'procurement'} 
          onClick={() => setActiveTab('procurement')}
          icon={FileText}
          label="Procurement"
        />
        <TabButton 
          active={activeTab === 'meeting'} 
          onClick={() => setActiveTab('meeting')}
          icon={Mic}
          label="Meeting Intel"
        />
        <TabButton 
          active={activeTab === 'manual'} 
          onClick={() => setActiveTab('manual')}
          icon={PenTool}
          label="Manual Input"
        />
        <TabButton 
          active={activeTab === 'custom'} 
          onClick={() => setActiveTab('custom')}
          icon={Zap}
          label="Custom"
        />
      </div>

      <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'procurement' && (
            <motion.div
              key="procurement"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <label className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center group hover:border-indigo-500 transition-all cursor-pointer bg-gray-50/50">
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt" 
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors shadow-sm">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  {selectedFile ? selectedFile.name : 'Upload Invoice PDF'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">Drag and drop your invoice here. NEXUS will automatically extract data and match against POs.</p>
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Select PO (Optional)</p>
                  <select className="w-full bg-transparent text-sm focus:outline-none text-gray-900">
                    <option>PO-001 (₹25,000)</option>
                    <option>PO-002 (₹45,000)</option>
                    <option>PO-003 (₹1,20,000)</option>
                  </select>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vendor</p>
                  <p className="text-sm font-medium text-gray-900">Auto-detect from PDF</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'meeting' && (
            <motion.div
              key="meeting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <label className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center group hover:border-indigo-500 transition-all cursor-pointer bg-gray-50/50">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="audio/*" 
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors shadow-sm">
                  <Mic className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">
                  {selectedFile ? selectedFile.name : 'Upload Meeting Audio'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs">NEXUS will transcribe and extract action items, owners, and deadlines automatically.</p>
              </label>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Or Paste Transcript</p>
                <textarea 
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none text-gray-900 placeholder:text-gray-400"
                  placeholder="Paste meeting notes or transcript here..."
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <PenTool className="w-5 h-5" />
                  <h3 className="font-bold">Manual Workflow Parameters</h3>
                </div>
                <p className="text-sm text-gray-500">Provide specific parameters for the autonomous swarm in JSON or plain text format.</p>
                <textarea 
                  value={manualParams}
                  onChange={(e) => setManualParams(e.target.value)}
                  className="w-full h-64 bg-gray-900 border border-gray-800 rounded-2xl p-6 text-indigo-300 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-indigo-900"
                  placeholder='{ "priority": "high", "department": "finance", "target_id": "9928" }'
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Select a pre-defined custom workflow or describe one in the Builder.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Inventory Restock', 
                    'Employee Onboarding', 
                    'SLA Escalation', 
                    'Compliance Audit',
                    'Customer Sentiment Analysis',
                    'Automated Code Review'
                  ].map((wf) => (
                    <button 
                      key={wf} 
                      onClick={() => {
                        setManualParams(JSON.stringify({ workflow: wf }, null, 2));
                        handleTrigger();
                      }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Zap className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{wf}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Dry-run mode disabled. Real actions will be taken.</span>
          </div>
          
          <button 
            onClick={handleTrigger}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
              success ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>{loading ? 'Processing...' : success ? 'Workflow Started' : 'Launch Workflow'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
        active ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}
