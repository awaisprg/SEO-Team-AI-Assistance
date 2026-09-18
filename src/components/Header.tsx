import React from 'react';
import {
  RefreshCw,
  Database,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';
import { TrelloConnectionStatus, UserSession } from '../types';

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
  const role = user?.role || 'MANAGER';
  const isAdmin = role === 'ADMIN';

  return (
    <header
      id="app-header"
      className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 transition-colors shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Left: Brand & Product Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://goldflexmarketing.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group transition-all"
              title="Gold Flex Marketing Home"
            >
              <img
                src="https://goldflexmarketing.com/wp-content/uploads/2026/01/Gold-Flex-Marketing-Dark-1024x260.png"
                alt="Gold Flex Marketing"
                className="h-7 sm:h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-[1.02]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('gfm-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="gfm-logo-fallback"
                style={{ display: 'none' }}
                className="items-center space-x-2 font-bold tracking-tight text-slate-900 text-base"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C52F5] to-[#2A1C94] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  GF
                </div>
                <span className="hidden sm:inline font-bold tracking-tight text-slate-900">
                  Gold Flex
                </span>
              </div>
            </a>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight font-sans">
                SEO & Content Intelligence
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-violet-50 text-violet-700 rounded-md border border-violet-200/70 shadow-2xs">
                Executive Hub
              </span>
            </div>
          </div>

          {/* Center: Live Board Connection Status */}
          <div className="hidden lg:flex items-center">
            {isAdmin ? (
              <button
                type="button"
                id="header-board-status-btn"
                onClick={onOpenSettings}
                className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-violet-50/70 border border-slate-200/90 hover:border-violet-300 text-xs transition-all cursor-pointer shadow-2xs"
                title="Click to manage Trello API credentials & board configuration"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {connection?.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      connection?.connected ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                  />
                </span>

                <span className="font-medium text-slate-500 group-hover:text-violet-900 transition-colors">
                  {connection?.isDemoData ? 'Demo Board' : 'Trello Board'}:
                </span>

                <span
                  className="font-semibold text-slate-800 truncate max-w-[150px] xl:max-w-[200px]"
                  title={connection?.boardName || 'Not Connected'}
                >
                  {connection?.boardName || (connection?.connected ? 'Connected' : 'Configure Board')}
                </span>

                {connection?.lastSyncAt && (
                  <span className="text-[11px] text-slate-400 font-mono border-l border-slate-200 pl-2 ml-0.5">
                    {new Date(connection.lastSyncAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-700 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </button>
            ) : (
              <div
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs shadow-2xs"
                title="Trello connection status"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    connection?.connected ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                />
                <span className="font-medium text-slate-500">Board:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                  {connection?.boardName || 'Active Board'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Actions, User & Settings Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Sync Trello (Available to both Admin and Manager) */}
            <button
              id="header-sync-btn"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold h-9 px-3.5 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] active:from-[#572FD6] active:to-[#461EC6] text-white focus:outline-hidden disabled:opacity-60 transition-all shadow-xs hover:shadow-sm cursor-pointer group"
              title={syncPhase || 'Synchronize cards, checklists, comments, and activities from Trello'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-white shrink-0 ${
                  isSyncing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'
                }`}
              />
              <span className="hidden sm:inline">
                {isSyncing ? (syncPhase ? `${syncPhase.slice(0, 12)}...` : 'Syncing...') : 'Sync Trello'}
              </span>
            </button>

            {/* Admin Action: Reset Demo */}
            {isAdmin && (
              <button
                id="header-seed-demo-btn"
                onClick={onSeedDemo}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-medium h-9 px-3 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-violet-300/80 transition-all shadow-2xs cursor-pointer"
                title="Reset to pre-loaded rich demo dataset"
              >
                <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden xl:inline">Reset Demo</span>
              </button>
            )}

            {/* Admin Action: Settings Gear */}
            {isAdmin && (
              <button
                id="header-settings-btn"
                onClick={onOpenSettings}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-violet-50/80 border border-slate-200 hover:border-violet-300 transition-all cursor-pointer shadow-2xs"
                title="Configure Trello integration, API keys & custom credentials"
              >
                <Settings className="w-4 h-4 shrink-0" />
              </button>
            )}

            <div className="h-5 w-px bg-slate-200" />

            {/* User Profile Pill */}
            {user && (
              <div className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50/60 shadow-2xs">
                <div
                  className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center text-[11px] font-bold tracking-wider shadow-2xs shrink-0"
                  title={`${user.name} (${user.email})`}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-snug truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-[#09061A] text-white'
                          : 'bg-violet-50 text-violet-800 border border-violet-200/60'
                      }`}
                    >
                      {isAdmin && <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-violet-300 shrink-0" />}
                      {role}
                    </span>
                  </div>
                </div>

                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  className="h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                  title="Sign Out of Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
