import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  RefreshCcw, 
  Bell, 
  Database, 
  Cpu, 
  Lock,
  Save,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Calendar,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  User,
  Building2,
  CreditCard,
  ListTodo,
  Key,
  UserCircle,
  Users2,
  BellRing,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Smartphone,
  Globe,
  MessageSquare,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, query, writeBatch, doc, updateDoc, onSnapshot, setDoc, orderBy } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Toggle } from '../components/Toggle';
import { useAuth } from '../contexts/AuthContext';
import { UserTask, Transaction, Reminder } from '../types';
import Modal from '../components/Modal';

export default function Settings() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'autonomy' | 'notifications' | 'data' | 'users' | 'profile'>('autonomy');
  const [profileTab, setProfileTab] = useState<'info' | 'account' | 'transactions' | 'reminders' | 'tasks' | 'manage' | 'switch' | 'password'>('info');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'confirm' | 'payment' | 'success'>('select');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);
  const [reminderDelayCount, setReminderDelayCount] = useState(0);
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);

  const [editProfile, setEditProfile] = useState({
    displayName: '',
    organization: 'NEXUS Autonomous Systems',
    department: 'Workflow Engineering',
    role: ''
  });

  useEffect(() => {
    if (profile && !isEditingProfile) {
      setEditProfile({
        displayName: profile.displayName || user?.displayName || '',
        organization: profile.organization || 'NEXUS Autonomous Systems',
        department: profile.department || 'Workflow Engineering',
        role: profile.role || (isAdmin ? 'System Admin' : 'Workflow Architect')
      });
    }
  }, [profile, user, isAdmin, isEditingProfile]);

  useEffect(() => {
    if (profileTab === 'reminders') {
      reminderTimeoutRef.current = setTimeout(() => {
        setShowReminderPrompt(true);
      }, 1500);
    } else {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
      setShowReminderPrompt(false);
    }
    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
    };
  }, [profileTab]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams]);
  const [autonomy, setAutonomy] = useState(0.75);
  const [retryBudget, setRetryBudget] = useState(3);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'workflow_builder' | 'operator' | 'viewer' | 'user' | 'guest'>('all');
  const [showToast, setShowToast] = useState(false);
  const [storage, setStorage] = useState({ used: 4.2, total: 10 });
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newReminder, setNewReminder] = useState({ text: '', time: '09:00' });
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [notifications, setNotifications] = useState({
    escalations: true,
    completions: false,
    failures: true,
  });

  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [newTask, setNewTask] = useState({ 
    title: '', 
    severity: 'medium', 
    priority: 'medium',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    if (!user) return;

    // Sync Tasks
    const unsubscribeTasks = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserTask));
      setTasks(taskList);
    });

    // Sync Reminders
    const unsubscribeReminders = onSnapshot(collection(db, 'users', user.uid, 'reminders'), (snapshot) => {
      const reminderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setReminders(reminderList);
    });

    // Sync Storage
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.storage) setStorage(data.storage);
      }
    });

    return () => {
      unsubscribeTasks();
      unsubscribeReminders();
      unsubscribeProfile();
    };
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
      });
      return () => unsubscribe();
    }
  }, [activeTab, isAdmin]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to update user role: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    await handleSaveProfile();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: editProfile.displayName,
        organization: editProfile.organization,
        department: editProfile.department,
        role: editProfile.role || (isAdmin ? 'admin' : 'viewer')
      }, { merge: true });
      setIsEditingProfile(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !user) return;
    setLoading(true);
    try {
      const taskId = editingTask ? editingTask.id : Math.random().toString(36).substr(2, 9);
      const task: UserTask = {
        id: taskId,
        title: newTask.title,
        status: editingTask ? editingTask.status : 'pending',
        severity: newTask.severity as any,
        priority: newTask.priority as any,
        dueDate: newTask.date || (editingTask ? editingTask.dueDate : new Date().toISOString().split('T')[0]),
        dueTime: newTask.time || (editingTask ? (editingTask as any).dueTime : '09:00')
      };
      await setDoc(doc(db, 'users', user.uid, 'tasks', taskId), task);
      setEditingTask(null);
      setNewTask({ 
        title: '', 
        severity: 'medium', 
        priority: 'medium',
        date: new Date().toISOString().split('T')[0],
        time: '09:00'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task: UserTask) => {
    setEditingTask(task);
    setNewTask({ 
      title: task.title, 
      severity: task.severity, 
      priority: task.priority,
      date: task.dueDate || new Date().toISOString().split('T')[0],
      time: (task as any).dueTime || '09:00'
    });
    setProfileTab('manage');
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTaskStatus = async (id: string, status: 'pending' | 'completed') => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'tasks', id), { status }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchProfile = async () => {
    await signOut();
    navigate('/login');
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPasswords({ current: '', new: '', confirm: '' });
      alert('Password updated successfully (Simulated)');
    }, 1000);
  };

  const handleAddReminder = async () => {
    if (!newReminder.text || !user) return;
    setLoading(true);
    try {
      const reminderId = editingReminder ? editingReminder.id : Math.random().toString(36).substr(2, 9);
      const reminder: Reminder = {
        id: reminderId,
        text: newReminder.text,
        time: newReminder.time,
        active: editingReminder ? editingReminder.active : true
      };
      await setDoc(doc(db, 'users', user.uid, 'reminders', reminderId), reminder);
      setNewReminder({ text: '', time: '09:00' });
      setEditingReminder(null);
      setShowReminderModal(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setNewReminder({ text: reminder.text, time: reminder.time });
    setShowReminderModal(true);
  };

  const handleDeleteReminder = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'reminders', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateReminderActive = async (id: string, active: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'reminders', id), { active }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleScaleStorage = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newTotal = storage.total + 10;
      await setDoc(doc(db, 'users', user.uid), {
        storage: { ...storage, total: newTotal }
      }, { merge: true });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      alert("Storage scaled successfully! Added 10GB to your quota.");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const handleSeedData = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Seed some audit logs
      const logs = [
        {
          workflow_id: 'WF-78291',
          step_number: 1,
          agent_id: 'data_retrieval',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          input_context: JSON.stringify({ poId: 'PO-992', vendor: 'Acme Corp' }),
          reasoning: 'Extracted PO details from ERP system. Matching against incoming invoice...',
          decision: 'PO Match Found',
          confidence_score: 0.98,
          outcome: 'Success',
          hash: 'sha256:8f2d...'
        },
        {
          workflow_id: 'WF-78291',
          step_number: 2,
          agent_id: 'verifier',
          timestamp: new Date(Date.now() - 3000000).toISOString(),
          input_context: JSON.stringify({ amount: 12500, limit: 15000 }),
          reasoning: 'Amount is within autonomous approval limits for this vendor.',
          decision: 'Approve Payment',
          confidence_score: 0.95,
          outcome: 'Success',
          hash: 'sha256:a1b2...'
        }
      ];

      for (const log of logs) {
        const docRef = doc(collection(db, 'audit_logs'));
        batch.set(docRef, log);
      }

      // Seed some workflow events
      const events = [
        {
          workflow_id: 'WF-ACTIVE-1',
          agent: 'decision_engine',
          status: 'running',
          step: 3,
          total_steps: 5,
          message: 'Analyzing contract terms for compliance...',
          timestamp: new Date().toISOString()
        }
      ];

      for (const event of events) {
        const docRef = doc(collection(db, 'workflow_events'));
        batch.set(docRef, event);
      }

      await batch.commit();
      alert('Initial data seeded successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to seed data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeLogs = async () => {
    if (!confirm('Are you sure you want to purge all audit logs? This cannot be undone.')) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'audit_logs'));
      const batch = writeBatch(db);
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      alert('Audit logs purged.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'autonomy', label: 'Autonomy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data', icon: Database },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'profile', label: 'My Profile', icon: UserCircle },
  ] as const;

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900">System Settings</h1>
          <p className="text-gray-500">Configure autonomous thresholds, retry policies, and system integrations.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="wait">
          {activeTab === 'autonomy' && (
            <motion.section
              key="autonomy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 text-indigo-600">
                <Shield className="w-6 h-6" />
                <h2 className="text-lg font-bold">Autonomy & Gating</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-bold mb-1 text-gray-900">Autonomy Threshold</h3>
                    <p className="text-sm text-gray-500">Minimum confidence score required for autonomous execution.</p>
                  </div>
                  <span className="text-2xl font-mono font-bold text-indigo-600">{autonomy.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.0" 
                  step="0.05" 
                  value={autonomy}
                  onChange={(e) => setAutonomy(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  <span>High Risk (0.50)</span>
                  <span>Balanced (0.75)</span>
                  <span>Conservative (1.00)</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold mb-1 text-gray-900">Retry Budget</h3>
                  <p className="text-sm text-gray-500">Number of self-healing attempts before human escalation.</p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5].map((val) => (
                    <button 
                      key={val}
                      onClick={() => setRetryBudget(val)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-bold transition-all",
                        retryBudget === val ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'notifications' && (
            <motion.section
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <Bell className="w-6 h-6" />
                <h2 className="text-lg font-bold">Notifications</h2>
              </div>
              
              <div className="space-y-4">
                <Toggle 
                  label="Escalation Alerts" 
                  description="Notify when a workflow requires human intervention."
                  enabled={notifications.escalations}
                  onChange={() => setNotifications({...notifications, escalations: !notifications.escalations})}
                />
                <Toggle 
                  label="Failure Reports" 
                  description="Daily summary of failed self-healing attempts."
                  enabled={notifications.failures}
                  onChange={() => setNotifications({...notifications, failures: !notifications.failures})}
                />
                <Toggle 
                  label="Completion Pings" 
                  description="Real-time notification for every successful workflow."
                  enabled={notifications.completions}
                  onChange={() => setNotifications({...notifications, completions: !notifications.completions})}
                />
              </div>
            </motion.section>
          )}

          {activeTab === 'data' && (
            <motion.section
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <Database className="w-6 h-6" />
                <h2 className="text-lg font-bold">Data & Memory</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleSeedData}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Seed Initial Data</p>
                    <p className="text-xs text-gray-500">Populate Firestore with examples</p>
                  </div>
                </button>
                <button 
                  onClick={handlePurgeLogs}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-red-600">Purge Audit Log</p>
                    <p className="text-xs text-red-500/50">Irreversible action</p>
                  </div>
                </button>
              </div>
            </motion.section>
          )}

          {activeTab === 'users' && isAdmin && (
            <motion.section
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Users className="w-6 h-6" />
                  <h2 className="text-lg font-bold">User Management</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="workflow_builder">Builder</option>
                    <option value="operator">Operator</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                              {u.displayName?.[0] || u.email?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-900">{u.displayName || 'Anonymous'}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="workflow_builder">Builder</option>
                            <option value="operator">Operator</option>
                            <option value="user">User</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        <td className="py-4">
                          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all">
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}

          {activeTab === 'profile' && (
            <motion.section
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Profile Sub-tabs */}
              <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
                {[
                  { id: 'info', label: 'Info', icon: UserCircle },
                  { id: 'account', label: 'Account', icon: Building2 },
                  { id: 'transactions', label: 'Billing', icon: CreditCard },
                  { id: 'reminders', label: 'Reminders', icon: BellRing },
                  { id: 'tasks', label: 'Tasks', icon: ListTodo },
                  { id: 'manage', label: 'Manage', icon: RefreshCcw },
                  { id: 'switch', label: 'Switch', icon: Users2 },
                  { id: 'password', label: 'Security', icon: Key },
                ].map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setProfileTab(pt.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      profileTab === pt.id 
                        ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <pt.icon className="w-3.5 h-3.5" />
                    {pt.label}
                  </button>
                ))}
              </div>

              <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm min-h-[400px]">
                <AnimatePresence mode="wait">
                  {profileTab === 'info' && (
                    <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 rounded-3xl bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 border-4 border-white shadow-xl">
                            {editProfile.displayName?.[0] || user?.email?.[0] || '?'}
                          </div>
                          <div>
                            {isEditingProfile ? (
                              <input 
                                type="text" 
                                value={editProfile.displayName}
                                onChange={(e) => setEditProfile({...editProfile, displayName: e.target.value})}
                                className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <h2 className="text-2xl font-bold text-gray-900">{editProfile.displayName || 'Anonymous User'}</h2>
                            )}
                            <p className="text-gray-500">{profile?.email || user?.email}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                                {editProfile.role}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                                Verified Account
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-all"
                        >
                          {isEditingProfile ? <Save className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                          {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Organization</label>
                          {isEditingProfile ? (
                            <input 
                              type="text" 
                              value={editProfile.organization}
                              onChange={(e) => setEditProfile({...editProfile, organization: e.target.value})}
                              className="font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <p className="font-bold text-gray-900">{editProfile.organization}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Department</label>
                          {isEditingProfile ? (
                            <input 
                              type="text" 
                              value={editProfile.department}
                              onChange={(e) => setEditProfile({...editProfile, department: e.target.value})}
                              className="font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <p className="font-bold text-gray-900">{editProfile.department}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Role</label>
                          {isEditingProfile ? (
                            <input 
                              type="text" 
                              value={editProfile.role}
                              onChange={(e) => setEditProfile({...editProfile, role: e.target.value})}
                              className="font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <p className="font-bold text-gray-900">{editProfile.role}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Member Since</label>
                          <p className="font-bold text-gray-900">January 2026</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'account' && (
                    <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Account Details</h3>
                        <button 
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Upgrade Plan
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Subscription Plan</p>
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900">Enterprise Elite</p>
                            <button onClick={() => setShowUpgradeModal(true)} className="text-xs font-bold text-indigo-600 hover:underline">Manage Subscription</button>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-gray-400 uppercase">Storage Usage</p>
                            <button 
                              onClick={handleScaleStorage}
                              className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                            >
                              Scale Storage
                            </button>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-gray-900">{storage.used.toFixed(1)} GB of {storage.total} GB</p>
                            <p className="text-xs text-gray-500">{Math.round((storage.used / storage.total) * 100)}%</p>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(storage.used / storage.total) * 100}%` }} />
                          </div>
                          <p className="mt-2 text-[10px] text-gray-400 italic">Scalable storage enabled. Auto-scaling at 90% capacity.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'transactions' && (
                    <motion.div key="transactions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                      <div className="space-y-3">
                        {transactions.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                tx.status === 'success' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                              )}>
                                <CreditCard className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-900">{tx.description}</p>
                                <p className="text-xs text-gray-500">{tx.date} • {tx.id}</p>
                              </div>
                            </div>
                            <p className="font-bold text-gray-900">₹{tx.amount.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                   {profileTab === 'reminders' && (
                    <motion.div key="reminders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Reminders</h3>
                        <button 
                          onClick={() => {
                            setEditingReminder(null);
                            setNewReminder({ text: '', time: '09:00' });
                            setShowReminderModal(true);
                          }}
                          className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {showReminderPrompt && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-2xl bg-indigo-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <BellRing className="w-5 h-5" />
                            <p className="text-sm font-bold">Don't forget to set your daily reminders!</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const firstReminder = reminders[0];
                                setProfileTab('manage');
                                setNewTask({
                                  title: 'Daily Reminder: ' + (firstReminder?.text || 'System Sync'),
                                  severity: 'medium',
                                  priority: 'high',
                                  date: new Date().toISOString().split('T')[0],
                                  time: firstReminder?.time || '09:00'
                                });
                                setShowReminderPrompt(false);
                                // Focus the input if possible
                                setTimeout(() => {
                                  const input = document.querySelector('input[placeholder="What needs to be done?"]');
                                  if (input) (input as HTMLInputElement).focus();
                                }, 100);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white text-indigo-600 text-xs font-bold transition-all hover:bg-gray-100"
                            >
                              Got it
                            </button>
                            <button 
                              onClick={() => {
                                setShowReminderPrompt(false);
                                // Snooze for 5 minutes repeatedly
                                if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
                                reminderTimeoutRef.current = setTimeout(() => {
                                  setShowReminderPrompt(true);
                                }, 5 * 60 * 1000);
                                alert("We'll remind you again in 5 minutes.");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-all"
                            >
                              Later
                            </button>
                            <button 
                              onClick={() => {
                                setShowReminderPrompt(false);
                                if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
                                setReminderDelayCount(0);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-500/50 hover:bg-red-500/70 text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-3">
                        {reminders.map(r => (
                          <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200 group">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", r.active ? "bg-indigo-500" : "bg-gray-300")} />
                              <div>
                                <p className="font-bold text-sm text-gray-900">{r.text}</p>
                                <p className="text-xs text-gray-500">{r.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => handleEditReminder(r)}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-indigo-600"
                                >
                                  <RefreshCcw className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteReminder(r.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <Toggle 
                                label="Active" 
                                enabled={r.active} 
                                onChange={() => handleUpdateReminderActive(r.id, !r.active)} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'tasks' && (
                    <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Work Overview</h3>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                          <RefreshCcw className="w-3 h-3 text-gray-500" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Execution Count: {tasks.length}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                          <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Pending</p>
                          <p className="text-2xl font-bold text-indigo-900">{tasks.filter(t => t.status === 'pending').length}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Completed</p>
                          <p className="text-2xl font-bold text-emerald-900">{tasks.filter(t => t.status === 'completed').length}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <div key={task.id} className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                                <p className={cn("font-bold text-sm", task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900")}>
                                  {task.title}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                  task.severity === 'high' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  {task.severity}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                  task.priority === 'high' ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"
                                )}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span>Due: {task.dueDate}</span>
                              {task.status === 'pending' && (
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                  className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                >
                                  Mark Done
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'manage' && (
                    <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900">{editingTask ? 'Edit Task' : 'Manage Tasks'}</h3>
                      <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Task Title</label>
                          <input 
                            type="text" 
                            value={newTask.title}
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                            placeholder="What needs to be done?" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Due Date</label>
                            <input 
                              type="date" 
                              value={newTask.date}
                              onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Time</label>
                            <input 
                              type="time" 
                              value={newTask.time}
                              onChange={(e) => setNewTask({...newTask, time: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 bg-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Severity</label>
                            <select 
                              value={newTask.severity}
                              onChange={(e) => setNewTask({...newTask, severity: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 bg-white"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Priority</label>
                            <select 
                              value={newTask.priority}
                              onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 bg-white"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleAddTask}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {editingTask ? 'Update Task' : 'Add Task'}
                          </button>
                          {editingTask && (
                            <button 
                              onClick={() => {
                                setEditingTask(null);
                                setNewTask({ 
                                  title: '', 
                                  severity: 'medium', 
                                  priority: 'medium',
                                  date: new Date().toISOString().split('T')[0],
                                  time: '09:00'
                                });
                              }}
                              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{task.title}</p>
                              <div className="flex gap-2 mt-1">
                                <span className={cn(
                                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                                  task.severity === 'high' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                )}>{task.severity}</span>
                                <span className={cn(
                                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                                  task.priority === 'high' ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"
                                )}>{task.priority}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEditTask(task)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
                                title="Edit Task"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'switch' && (
                    <motion.div key="switch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900">Switch Profile</h3>
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                              {editProfile.displayName?.[0] || 'U'}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm text-gray-900">Work Profile (Active)</p>
                              <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        </button>
                        <button 
                          onClick={handleSwitchProfile}
                          className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
                              P
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm text-gray-900">Switch to Personal / Other Account</p>
                              <p className="text-xs text-gray-500">Redirects to Login</p>
                            </div>
                          </div>
                          <LogOut className="w-5 h-5 text-gray-300" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'password' && (
                    <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Current Password</label>
                          <input 
                            type="password" 
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">New Password</label>
                          <input 
                            type="password" 
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Confirm New Password</label>
                          <input 
                            type="password" 
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                            placeholder="••••••••"
                          />
                        </div>
                        <button 
                          onClick={handleChangePassword}
                          disabled={loading}
                          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          {loading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="flex justify-end gap-4">
          <button className="px-8 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-all">
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </div>

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 right-8 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center gap-3 z-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold">Changes saved successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReminderModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReminderModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-6">{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Reminder Text</label>
                    <input 
                      type="text" 
                      value={newReminder.text}
                      onChange={(e) => setNewReminder({...newReminder, text: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                      placeholder="e.g., Check system logs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Time</label>
                    <input 
                      type="time" 
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({...newReminder, time: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowReminderModal(false)}
                      className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddReminder}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all"
                    >
                      {editingReminder ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Upgrade Plan Modal */}
        <AnimatePresence>
          {showUpgradeModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowUpgradeModal(false);
                  setUpgradeStep('select');
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 md:p-12">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {upgradeStep === 'select' && 'Upgrade Your Plan'}
                        {upgradeStep === 'confirm' && 'Confirm Subscription'}
                        {upgradeStep === 'payment' && 'Secure Payment'}
                        {upgradeStep === 'success' && 'Upgrade Successful!'}
                      </h2>
                      <p className="text-gray-500">
                        {upgradeStep === 'select' && 'Choose the version that fits your workflow scale.'}
                        {upgradeStep === 'confirm' && 'Review your selected plan and user details.'}
                        {upgradeStep === 'payment' && 'Complete your transaction securely.'}
                        {upgradeStep === 'success' && 'Welcome to your new autonomous tier.'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowUpgradeModal(false);
                        setUpgradeStep('select');
                      }} 
                      className="p-2 rounded-full hover:bg-gray-100 transition-all"
                    >
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  {upgradeStep === 'select' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                      {[
                        { id: 'liteas', name: 'LiteAs', price: '999', features: ['Medium level features', '5 Active Workflows', '10GB Storage', 'Standard Support'] },
                        { id: 'advancias', name: 'Advancias', price: '2,499', features: ['High level features', '25 Active Workflows', '50GB Storage', 'Priority Support'], popular: true },
                        { id: 'maxas', name: 'MaxAs', price: '4,999', features: ['Pro level features', 'Unlimited Workflows', '500GB Storage', '24/7 Dedicated Support'] },
                      ].map((plan) => (
                        <div key={plan.id} className={cn(
                          "relative p-6 rounded-3xl border-2 transition-all",
                          plan.popular ? "border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-600/10" : "border-gray-100 hover:border-gray-200"
                        )}>
                          {plan.popular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                              Most Popular
                            </span>
                          )}
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                          <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                            <span className="text-gray-500 text-sm">/month</span>
                          </div>
                          <ul className="space-y-3 mb-8">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <button 
                            onClick={() => {
                              setSelectedPlan(plan);
                              setUpgradeStep('confirm');
                            }}
                            className={cn(
                              "w-full py-3 rounded-xl font-bold transition-all",
                              plan.popular ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-900 text-white hover:bg-black"
                            )}
                          >
                            Select Plan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {upgradeStep === 'confirm' && selectedPlan && (
                    <div className="space-y-8 mb-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 space-y-4">
                          <h4 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Plan Summary</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Selected Plan:</span>
                            <span className="font-bold text-indigo-600">{selectedPlan.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Monthly Cost:</span>
                            <span className="font-bold text-gray-900">₹{selectedPlan.price}</span>
                          </div>
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-400">Includes all {selectedPlan.name} features and priority autonomous processing.</p>
                          </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 space-y-4">
                          <h4 className="font-bold text-gray-900 uppercase tracking-widest text-xs">User Details</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Name:</span>
                            <span className="font-bold text-gray-900">{editProfile.displayName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Email:</span>
                            <span className="font-bold text-gray-900 truncate max-w-[150px]">{user?.email}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Organization:</span>
                            <span className="font-bold text-gray-900">{editProfile.organization}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setUpgradeStep('select')}
                          className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all"
                        >
                          Back to Plans
                        </button>
                        <button 
                          onClick={() => setUpgradeStep('payment')}
                          className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
                        >
                          Proceed to Payment
                        </button>
                      </div>
                    </div>
                  )}

                  {upgradeStep === 'payment' && (
                    <div className="space-y-8 mb-12">
                      <div className="p-8 rounded-[2rem] bg-indigo-900 text-white relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-12">
                            <ShieldCheck className="w-10 h-10" />
                            <CreditCard className="w-8 h-8 opacity-50" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs opacity-50 uppercase tracking-widest">Amount to Pay</p>
                            <p className="text-4xl font-bold">₹{selectedPlan?.price}</p>
                          </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'net', name: 'Net Banking', icon: Globe, details: 'SBI, HDFC, ICICI' },
                          { id: 'upi', name: 'UPI', icon: Smartphone, details: 'GPay, PhonePe' },
                          { id: 'wa', name: 'WhatsApp', icon: MessageSquare, details: '+91 98765 43210' },
                          { id: 'card', name: 'Credit Card', icon: CreditCard, details: 'Visa, Mastercard' },
                        ].map((method) => (
                          <button 
                            key={method.id}
                            onClick={() => {
                              setLoading(true);
                              setTimeout(() => {
                                setLoading(false);
                                setUpgradeStep('success');
                                setTransactions([{
                                  id: `TX-${Math.floor(Math.random() * 9000) + 1000}`,
                                  amount: parseFloat(selectedPlan.price.replace(',', '')),
                                  date: new Date().toISOString().split('T')[0],
                                  description: `${selectedPlan.name} Subscription`,
                                  status: 'success'
                                }, ...transactions]);
                              }, 2000);
                            }}
                            className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all text-left group hover:bg-indigo-50/30"
                          >
                            <method.icon className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                            <p className="font-bold text-sm text-gray-900">{method.name}</p>
                            <p className="text-[10px] text-gray-500">{method.details}</p>
                          </button>
                        ))}
                      </div>
                      
                      {loading && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                          <RefreshCcw className="w-8 h-8 text-indigo-600 animate-spin" />
                          <p className="text-sm font-bold text-gray-900">Processing Secure Transaction...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {upgradeStep === 'success' && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                      <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Confirmed!</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">Your account has been upgraded to <span className="font-bold text-indigo-600">{selectedPlan?.name}</span>. You now have full access to all premium autonomous features.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setShowUpgradeModal(false);
                          setUpgradeStep('select');
                        }}
                        className="px-12 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  )}

                  {upgradeStep === 'select' && (
                    <div className="pt-8 border-t border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Methods</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer group">
                          <Globe className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                          <p className="font-bold text-sm text-gray-900">Net Banking</p>
                          <p className="text-[10px] text-gray-500">SBI, HDFC, ICICI</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer group">
                          <Smartphone className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                          <p className="font-bold text-sm text-gray-900">UPI</p>
                          <p className="text-[10px] text-gray-500">GPay, PhonePe</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer group">
                          <MessageSquare className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                          <p className="font-bold text-sm text-gray-900">WhatsApp</p>
                          <p className="text-[10px] text-gray-500">+91 98765 43210</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer group">
                          <CreditCard className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                          <p className="font-bold text-sm text-gray-900">Credit Card</p>
                          <p className="text-[10px] text-gray-500">Visa, Mastercard</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}



