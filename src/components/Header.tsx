import React from 'react';
import { Sparkles, RefreshCw, Database, Settings, ShieldCheck, User, Eye, LogOut } from 'lucide-react';
import { UserRole, TrelloConnectionStatus, UserSession } from '../types';

interface HeaderProps {
  connection: TrelloConnectionStatus | null;
  user: UserSession | null;
  onSignOut: () => void;
  onSync: () => void;
  onSeedDemo: () => void;
  onOpenSettings: () => void;
  isSyncing: boolean;
  syncPhase?: string;
}

export const Header: React.FC<HeaderProps> = ({
  connection,
  user,
  onSignOut,
  onSync,
  onSeedDemo,
  onOpenSettings,
  isSyncing,
  syncPhase,
}) => {
  const role = user?.role || 'VIEWER';

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                  SEO & Content Team Intelligence
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Management Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Trello workstream retrieval, AI initiative tracking & executive briefs
              </p>
            </div>
          </div>

          {/* Center: Board Status indicator (clickable to open settings) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden md:flex items-center space-x-2 text-xs bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
            title="Click to view Trello integration settings & connection status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connection?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {connection?.isDemoData ? (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Demo Mode
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Real Trello
              </span>
            )}
            <span className="text-slate-500 font-medium">Board:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[160px]" title={connection?.boardName || 'Not Connected'}>
              {connection?.boardName || (connection?.connected ? 'Connected' : 'Configure Board')}
            </span>
            {connection?.lastSyncAt && (
              <span className="text-slate-400 text-[11px]">
                • Synced {new Date(connection.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Sync Now Button */}
            {role !== 'VIEWER' && (
              <button
                id="header-sync-btn"
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
                title={syncPhase || 'Synchronize Trello cards, checklists, and activities'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{isSyncing ? (syncPhase ? `${syncPhase.slice(0, 16)}...` : 'Syncing...') : 'Sync Trello'}</span>
              </button>
            )}

            {/* Seed Demo Data Button (Admin only) */}
            {role === 'ADMIN' && (
              <button
                id="header-seed-demo-btn"
                onClick={onSeedDemo}
                className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Reset to rich demo dataset (AI Overviews, clients, checklists)"
              >
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden lg:inline">Reset Demo</span>
              </button>
            )}

            {/* Authenticated User Profile & Role Badge */}
            {user && (
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[110px]">
                    {user.email}
                  </div>
                </div>

                {/* Server-verified role badge */}
                <span
                  className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : role === 'MANAGER'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                  title={`Role: ${role} (verified server-side)`}
                >
                  {role === 'ADMIN' ? (
                    <ShieldCheck className="w-2.5 h-2.5" />
                  ) : role === 'MANAGER' ? (
                    <User className="w-2.5 h-2.5" />
                  ) : (
                    <Eye className="w-2.5 h-2.5" />
                  )}
                  <span>{role}</span>
                </span>
              </div>
            )}

            {/* Settings Trigger */}
            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={role === 'ADMIN' ? 'Configure Trello API Key, Token & Board' : 'View Trello Integration Status'}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Sign Out Button */}
            <button
              id="header-signout-btn"
              onClick={onSignOut}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
