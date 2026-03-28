import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  UserCircle, 
  Shield, 
  HelpCircle, 
  BookOpen, 
  LogOut, 
  ChevronRight,
  User,
  Check,
  Zap,
  PenTool,
  Search,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Database,
  Play,
  X,
  History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function HeaderSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { user, profile, updateProfile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleRole = async () => {
    const newRole = profile?.role === 'admin' ? 'user' : 'admin';
    try {
      await updateProfile({ role: newRole });
    } catch (error) {
      console.error("Failed to switch role:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isOpen ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-500"
        )}
      >
        <Settings className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Account Settings</p>
              <p className="text-sm font-medium truncate text-gray-900">{user?.email}</p>
            </div>

            <div className="p-2">
              <button 
                onClick={() => { navigate('/settings?tab=profile'); setIsOpen(false); }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <UserCircle className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm">My Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button 
                onClick={toggleRole}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <div className="text-left">
                    <p className="text-sm">Switch Role</p>
                    <p className="text-[10px] text-gray-400">Current: <span className="capitalize text-amber-600 font-medium">{profile?.role || 'User'}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {profile?.role === 'admin' ? <Check className="w-3 h-3 text-emerald-500" /> : null}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <div className="h-px bg-gray-100 my-2" />

              <button 
                onClick={() => { setShowHelp(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span className="text-sm">Help & Support</span>
              </button>

              <button 
                onClick={() => { setShowGuide(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-all"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-sm">Instructions & Guide</span>
              </button>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-all mt-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <Modal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        title="Help & Support"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Need assistance with NEXUS? Our support team is here to help you optimize your autonomous workflows.</p>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Support Email</span>
              <span className="text-sm text-indigo-600 font-medium">supportfornexusai@gmail.com</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Documentation</span>
              <span className="text-sm text-indigo-600 font-medium">docs.nexus-ai.com</span>
            </div>
          </div>
          <button 
            onClick={() => setShowHelp(false)}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Guide Modal */}
      <Modal 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
        title="NEXUS User Guide"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Zap className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">1. Triggering Workflows</h4>
            </div>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p className="font-medium text-gray-700">How to initiate a process:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Navigate to the <span className="font-semibold">Trigger</span> tab in the sidebar.</li>
                <li>Select your input type: <span className="font-semibold">Document</span> (PDF/Text), <span className="font-semibold">Audio</span> (Meeting recordings), or <span className="font-semibold">Manual</span>.</li>
                <li>Upload your file or enter the context for the agent swarm.</li>
                <li>Click <span className="font-semibold text-indigo-600">"Launch Autonomous Workflow"</span>.</li>
                <li>Monitor real-time progress in the <span className="font-semibold">Dashboard</span> or <span className="font-semibold">Console</span>.</li>
              </ol>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <History className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">2. Audit Trail Interpretation</h4>
            </div>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p className="font-medium text-gray-700">Understanding the immutable ledger:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Go to the <span className="font-semibold">Audit Trail</span> page.</li>
                <li>Each row represents a discrete agent decision or action.</li>
                <li>Click on a row to expand the <span className="font-semibold">Reasoning & Context</span> view.</li>
                <li>Check the <span className="font-semibold">Confidence Score</span>: Scores below your threshold (set in Settings) trigger human escalation.</li>
                <li>Use <span className="font-semibold text-emerald-600">"Verify Integrity"</span> to cryptographically validate the hash chain.</li>
              </ol>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <PenTool className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">3. Workflow Builder (Admin)</h4>
            </div>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p className="font-medium text-gray-700">Architecting new agent swarms:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Access the <span className="font-semibold">Builder</span> (Admin only).</li>
                <li>Describe your business process in natural language (e.g., "Handle invoice approvals...").</li>
                <li>Click <span className="font-semibold text-indigo-600">"Generate Architecture"</span>.</li>
                <li>Review the generated <span className="font-semibold">JSON Schema</span> and the <span className="font-semibold">Visual Flow Chart</span>.</li>
                <li>Click <span className="font-semibold text-emerald-600">"Activate Workflow"</span> to deploy the swarm to production.</li>
              </ol>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 mt-2">
                <p className="font-bold text-indigo-900 mb-1">Understanding Agent Roles:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><span className="font-semibold">Orchestrator:</span> Manages swarm state and task delegation.</li>
                  <li><span className="font-semibold">Retrieval:</span> Fetches data from ERP/CRM systems.</li>
                  <li><span className="font-semibold">Verifier:</span> Validates decisions against business rules.</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={() => setShowGuide(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all"
            >
              Got it, let's build!
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 pt-24">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
