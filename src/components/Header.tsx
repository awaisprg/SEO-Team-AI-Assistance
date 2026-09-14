import React from 'react';
import { Sparkles, RefreshCw, Database, Settings, ShieldCheck, User, Eye } from 'lucide-react';
import { UserRole, TrelloConnectionStatus } from '../types';

interface HeaderProps {
  connection: TrelloConnectionStatus | null;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSync: () => void;
  onSeedDemo: () => void;
  onOpenSettings: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  connection,
  role,
  onRoleChange,
  onSync,
  onSeedDemo,
  onOpenSettings,
  isSyncing,
}) => {
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

          {/* Center: Board Status indicator */}
          <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                connection?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-600 font-medium">Board:</span>
            <span className="font-semibold text-slate-800">
              {connection?.boardName || 'PDS/GFM-SEO'}
            </span>
            {connection?.isDemoData && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Demo
              </span>
            )}
            {connection?.lastSyncAt && (
              <span className="text-slate-400">
                • Synced {new Date(connection.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Sync Now Button */}
            <button
              id="header-sync-btn"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
              title="Synchronize Trello cards, checklists, and activities"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Trello'}</span>
            </button>

            {/* Seed Demo Data Button */}
            <button
              id="header-seed-demo-btn"
              onClick={onSeedDemo}
              className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Reset to rich demo dataset (AI Overviews, clients, checklists)"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>

            {/* Role Switcher */}
            <div className="relative inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                id="role-admin-btn"
                onClick={() => onRoleChange('ADMIN')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                  role === 'ADMIN'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Admin: Full sync, edit list semantics, client aliases"
              >
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden sm:inline">Admin</span>
                </div>
              </button>
              <button
                id="role-manager-btn"
                onClick={() => onRoleChange('MANAGER')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                  role === 'MANAGER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Manager: Query intelligence, generate briefs, trigger sync"
              >
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span className="hidden sm:inline">Manager</span>
                </div>
              </button>
              <button
                id="role-viewer-btn"
                onClick={() => onRoleChange('VIEWER')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                  role === 'VIEWER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Viewer: Read-only query access"
              >
                <div className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Viewer</span>
                </div>
              </button>
            </div>

            {/* Settings Trigger */}
            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Trello API Configuration & Board Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
