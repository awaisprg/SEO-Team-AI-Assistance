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
  Sparkles,
} from 'lucide-react';
import { TrelloConnectionStatus, UserSession } from '../types';
import { ThemeDropdown } from './ThemeDropdown';
import { useTheme } from '../utils/theme';

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

const HeaderComponent: React.FC<HeaderProps> = ({
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
  const { themeConfig } = useTheme();
  const displayName = user ? user.name.replace(/\s*\((Admin|Manager)\)/i, '').trim() : '';

  return (
    <header
      id="app-header"
      className="backdrop-blur-xl border-b sticky top-0 z-40 transition-all shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 sm:h-[68px] gap-3 sm:gap-4 py-2 sm:py-2.5">
          {/* Left: Brand & Product Identity */}
          <div className="flex flex-col justify-center shrink-0">
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
                className={`h-7 sm:h-7.5 w-auto object-contain shrink-0 transition-transform group-hover:scale-[1.01] ${
                  themeConfig.isDark ? 'brightness-0 invert' : ''
                }`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('gfm-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                id="gfm-logo-fallback"
                style={{ display: 'none' }}
                className="items-center space-x-2 font-bold tracking-tight text-slate-900 dark:text-white"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                  style={{ background: themeConfig.colors.primaryGradient }}
                >
                  GF
                </div>
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
                  Gold Flex Marketing
                </span>
              </div>
            </a>

            {/* Product Tagline directly under logo: High-contrast, crystal clear readability */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight leading-none whitespace-nowrap">
                SEO & Content Intelligence
              </span>
              <span className="text-slate-300 dark:text-slate-600 select-none text-xs">·</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 tracking-tight whitespace-nowrap">
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
                className="group h-9 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700/90 border border-slate-200/90 dark:border-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600 text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs inline-flex items-center gap-2.5 select-none backdrop-blur-md"
                title="Click to manage Trello API credentials & board configuration"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {connection?.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      connection?.connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    }`}
                  />
                </span>

                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {connection?.isDemoData ? 'Demo' : 'Board'}
                </span>

                <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

                <span
                  className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] xl:max-w-[220px] whitespace-nowrap tracking-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                  title={connection?.boardName || 'Not Connected'}
                >
                  {connection?.boardName || (connection?.connected ? 'Connected' : 'Configure Board')}
                </span>

                {connection?.lastSyncAt && (
                  <span className="text-[10.5px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 border border-slate-200/70 dark:border-slate-600/70 font-medium">
                    {new Date(connection.lastSyncAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ) : (
              <div
                className="h-9 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 text-xs shadow-2xs inline-flex items-center gap-2.5 select-none backdrop-blur-md"
                title="Trello connection status"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    connection?.connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Board</span>
                <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] whitespace-nowrap">
                  {connection?.boardName || 'Active Board'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Actions, Theme Selector & User Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Theme Dropdown */}
            <ThemeDropdown />

            {/* Sync Trello Button */}
            <button
              id="header-sync-btn"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold h-9 px-3.5 rounded-xl theme-action-primary text-white focus:outline-hidden disabled:opacity-60 transition-all shadow-xs hover:shadow-sm cursor-pointer group active:scale-[0.97] select-none"
              title={syncPhase || 'Synchronize cards, checklists, comments, and activities from Trello'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-white shrink-0 ${
                  isSyncing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform duration-200'
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
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold h-9 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/90 hover:bg-white dark:hover:bg-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.97] select-none"
                title="Reset to pre-loaded rich demo dataset"
              >
                <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="hidden xl:inline">Reset Demo</span>
              </button>
            )}

            {/* Admin Action: Settings Gear */}
            {isAdmin && (
              <button
                id="header-settings-btn"
                onClick={onOpenSettings}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700/90 border border-slate-200/90 dark:border-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.97] group select-none"
                title="Configure Trello integration, API keys & custom credentials"
              >
                <Settings className="w-4 h-4 shrink-0 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            )}

            <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-slate-700 mx-0.5" />

            {/* User Profile Pill */}
            {user && (
              <div className="h-9 pl-1.5 pr-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center gap-2.5 backdrop-blur-md select-none">
                <div
                  className="w-6.5 h-6.5 rounded-lg text-white flex items-center justify-center text-[10px] font-bold tracking-wider shadow-xs shrink-0 ring-1 ring-black/10"
                  style={{ background: themeConfig.colors.primaryGradient }}
                  title={`${user.name} (${user.email})`}
                >
                  {displayName.slice(0, 2).toUpperCase() || 'AW'}
                </div>

                <div className="hidden sm:flex flex-col text-left justify-center min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[105px]">
                    {displayName || user.name}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-200/90 dark:border-amber-800/80 uppercase tracking-wider leading-none shadow-2xs">
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                        {role}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center transition-all cursor-pointer ml-0.5"
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

export const Header = React.memo(HeaderComponent);
