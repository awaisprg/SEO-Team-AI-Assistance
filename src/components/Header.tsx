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
                className={`h-7 sm:h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-[1.02] ${
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
                className="items-center space-x-2 font-bold tracking-tight text-slate-900 dark:text-white text-base"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                  style={{ background: themeConfig.colors.primaryGradient }}
                >
                  GF
                </div>
                <span className="hidden sm:inline font-bold tracking-tight text-slate-900 dark:text-white">
                  Gold Flex
                </span>
              </div>
            </a>

            <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700/80 hidden md:block" />

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                SEO & Content Intelligence
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase border shadow-2xs select-none backdrop-blur-xs"
                style={{
                  backgroundColor: themeConfig.colors.glow,
                  borderColor: themeConfig.colors.border,
                  color: themeConfig.isDark ? '#F1F5F9' : themeConfig.colors.primary,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: themeConfig.colors.primary }}
                />
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
                className="group h-9 px-3.5 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-xs transition-all cursor-pointer shadow-2xs hover:shadow-xs inline-flex items-center gap-2.5 select-none"
                title="Click to manage Trello API credentials & board configuration"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {connection?.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      connection?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>

                <span className="font-medium text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">
                  {connection?.isDemoData ? 'Demo Board:' : 'Trello Board:'}
                </span>

                <span
                  className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px] xl:max-w-[200px] whitespace-nowrap tracking-tight"
                  title={connection?.boardName || 'Not Connected'}
                >
                  {connection?.boardName || (connection?.connected ? 'Connected' : 'Configure Board')}
                </span>

                {connection?.lastSyncAt && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0 border border-slate-200/60 dark:border-slate-600/60">
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
                className="h-9 px-3.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs inline-flex items-center gap-2.5 select-none"
                title="Trello connection status"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    connection?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="font-medium text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">Board:</span>
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
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold h-9 px-3.5 rounded-xl theme-action-primary text-white focus:outline-hidden disabled:opacity-60 transition-all shadow-xs hover:shadow-sm cursor-pointer group active:scale-[0.98] select-none"
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
                className="inline-flex items-center justify-center gap-1.5 text-xs font-medium h-9 px-3 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs cursor-pointer active:scale-[0.98] select-none"
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
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer shadow-2xs active:scale-[0.98] group select-none"
                title="Configure Trello integration, API keys & custom credentials"
              >
                <Settings className="w-4 h-4 shrink-0 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            )}

            <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-700/80" />

            {/* User Profile Pill */}
            {user && (
              <div className="h-9 pl-1.5 pr-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 shadow-2xs flex items-center gap-2 backdrop-blur-md select-none">
                <div
                  className="w-6.5 h-6.5 rounded-lg text-white flex items-center justify-center text-[10px] font-bold tracking-wider shadow-2xs shrink-0 ring-1 ring-black/5"
                  style={{ background: themeConfig.colors.primaryGradient }}
                  title={`${user.name} (${user.email})`}
                >
                  {displayName.slice(0, 2).toUpperCase() || 'AW'}
                </div>

                <div className="hidden sm:flex flex-col text-left justify-center min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[100px]">
                    {displayName || user.name}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none">
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                        {role}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
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
