import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Zap, PenTool, Settings, ShieldCheck, LogOut, Terminal, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import HeaderSettings from './HeaderSettings';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', minRole: 'viewer' },
  { to: '/console', icon: Terminal, label: 'Console', minRole: 'viewer' },
  { to: '/audit', icon: ShieldCheck, label: 'Audit Trail', minRole: 'viewer' },
  { to: '/trigger', icon: Zap, label: 'Trigger', minRole: 'viewer' },
  { to: '/history', icon: Clock, label: 'History', minRole: 'viewer' },
  { to: '/builder', icon: PenTool, label: 'Builder', minRole: 'workflow_builder' },
  { to: '/settings', icon: Settings, label: 'Settings', minRole: 'viewer' },
];

export default function Layout() {
  const { user, profile, isAdmin, isWorkflowBuilder, isOperator, isViewer, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const canAccess = (minRole: string) => {
    if (minRole === 'admin') return isAdmin;
    if (minRole === 'workflow_builder') return isWorkflowBuilder;
    if (minRole === 'operator') return isOperator;
    if (minRole === 'viewer') return isViewer;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 bg-white z-50">
        <div className="p-6 flex items-center gap-3 border-b border-gray-200">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">NEXUS</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.filter(item => canAccess(item.minRole)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
              {profile?.displayName?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">{profile?.displayName || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{profile?.role || 'User'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 min-h-screen">
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">System Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Autonomy: 85%</span>
            </div>
            <HeaderSettings />
          </div>
        </header>
        
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
