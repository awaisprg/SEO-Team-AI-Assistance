import React from 'react';
import {
  Sparkles,
  RefreshCw,
  Database,
  Settings,
  ShieldCheck,
  Eye,
  LogOut,
  Layers,
  ChevronRight,
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
  const role = user?.role || 'VIEWER';
  const isAdmin = role === 'ADMIN';

  return (
    <header
      id="app-header"
      className="bg-white/95 backdrop-blur-md border-b border-[#EAEAEC] sticky top-0 z-40 transition-colors shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand & Product Identity */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <a
              href="https://goldflexmarketing.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group transition-opacity hover:opacity-90"
              title="Gold Flex Marketing Home"
            >
              <img
                src="https://goldflexmarketing.com/wp-content/uploads/2026/01/Gold-Flex-Marketing-Dark-1024x260.png"
                alt="Gold Flex Marketing"
                className="h-7 sm:h-8 w-auto object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('gfm-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="gfm-logo-fallback"
                style={{ display: 'none' }}
                className="items-center space-x-2 font-bold tracking-tight text-[#27272B] text-base"
              >
                <div className="w-8 h-8 rounded-xl bg-[#8963FB] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  GF
                </div>
                <span className="hidden sm:inline">Gold Flex Marketing</span>
              </div>
            </a>

            <div className="h-5 w-px bg-[#EAEAEC] hidden md:block" />

            <div className="hidden md:flex items-center space-x-2">
              <span className="text-xs font-bold text-[#27272B] tracking-tight">
                SEO & Content Intelligence
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#F2F2FD] text-[#2F20A2] rounded-md border border-[#C6C1F3]">
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
                className="group flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F8F8FC] hover:bg-[#F2F2FD] border border-[#EAEAEC] hover:border-[#C6C1F3] text-xs transition-all cursor-pointer shadow-2xs"
                title="Click to manage Trello API credentials & board mapping"
              >
                <span className="relative flex h-2 w-2">
                  {connection?.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#198754] opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      connection?.connected ? 'bg-[#198754]' : 'bg-[#FFBE00]'
                    }`}
                  />
                </span>

                <span className="font-medium text-[#5D5C68] group-hover:text-[#2F20A2] transition-colors">
                  {connection?.isDemoData ? 'Demo Dataset' : 'Trello Board'}:
                </span>

                <span
                  className="font-semibold text-[#27272B] truncate max-w-[140px] xl:max-w-[180px]"
                  title={connection?.boardName || 'Not Connected'}
                >
                  {connection?.boardName || (connection?.connected ? 'Connected' : 'Configure Board')}
                </span>

                {connection?.lastSyncAt && (
                  <span className="text-[11px] text-[#6E6D7B] font-normal border-l border-[#EAEAEC] pl-2 ml-1">
                    {new Date(connection.lastSyncAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <ChevronRight className="w-3 h-3 text-[#6E6D7B] group-hover:text-[#2F20A2] transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F8F8FC] border border-[#EAEAEC] text-xs shadow-2xs"
                title="Trello connection status"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connection?.connected ? 'bg-[#198754]' : 'bg-[#FFBE00]'
                  }`}
                />
                <span className="font-medium text-[#5D5C68]">Board:</span>
                <span className="font-semibold text-[#27272B] truncate max-w-[160px]">
                  {connection?.boardName || 'Active Board'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Actions, User & Settings Cluster */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Admin Action: Sync Trello */}
            {isAdmin && (
              <button
                id="header-sync-btn"
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] text-white focus:outline-hidden disabled:opacity-60 transition-all shadow-xs cursor-pointer group"
                title={syncPhase || 'Synchronize cards, checklists, activities, and client initiatives'}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-white ${
                    isSyncing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isSyncing ? (syncPhase ? `${syncPhase.slice(0, 14)}...` : 'Syncing...') : 'Sync Trello'}
                </span>
              </button>
            )}

            {/* Admin Action: Reset Demo */}
            {isAdmin && (
              <button
                id="header-seed-demo-btn"
                onClick={onSeedDemo}
                className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-white text-[#5D5C68] border border-[#EAEAEC] hover:bg-[#F8F8FC] hover:text-[#27272B] hover:border-[#8963FB]/30 transition-all shadow-2xs cursor-pointer"
                title="Reset to pre-loaded rich demo dataset"
              >
                <Database className="w-3.5 h-3.5 text-[#6E6D7B]" />
                <span className="hidden xl:inline">Reset Demo</span>
              </button>
            )}

            {/* Admin Action: Settings Gear */}
            {isAdmin && (
              <button
                id="header-settings-btn"
                onClick={onOpenSettings}
                className="p-2 rounded-xl text-[#5D5C68] hover:text-[#27272B] hover:bg-[#F2F2FD] border border-transparent hover:border-[#C6C1F3] transition-all cursor-pointer"
                title="Configure Trello integration, API keys & custom credentials"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <div className="h-5 w-px bg-[#EAEAEC]" />

            {/* User Profile Block */}
            {user && (
              <div className="flex items-center space-x-2 pl-1">
                <div
                  className="w-8 h-8 rounded-xl bg-[#27272B] text-white flex items-center justify-center text-xs font-bold tracking-tight shadow-xs shrink-0"
                  title={`${user.name} (${user.email})`}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[#27272B] leading-snug truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-[#0C0528] text-white'
                          : 'bg-[#F2F2FD] text-[#2F20A2] border border-[#C6C1F3]'
                      }`}
                    >
                      {isAdmin && <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-[#A78AFD]" />}
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out Button */}
            <button
              id="header-signout-btn"
              onClick={onSignOut}
              className="p-2 rounded-xl text-[#6E6D7B] hover:text-[#BC2D3B] hover:bg-rose-50 hover:border-rose-200 border border-transparent transition-all cursor-pointer"
              title="Sign Out of Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

