import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Unlink,
  Check,
  Globe,
  Sliders,
} from 'lucide-react';
import { TrelloConnectionStatus, UserRole } from '../types';

interface TrelloSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: TrelloConnectionStatus | null;
  role: UserRole;
  onSaveConnection: (apiKey: string, token: string, boardId?: string, boardName?: string) => Promise<boolean>;
  onSync: () => void;
  isSyncing: boolean;
  onRefreshStatus?: () => void;
}

interface BoardOption {
  id: string;
  name: string;
  url: string;
  closed: boolean;
}

export const TrelloSettingsModal: React.FC<TrelloSettingsModalProps> = ({
  isOpen,
  onClose,
  connection,
  role,
  onSaveConnection,
  onSync,
  isSyncing,
  onRefreshStatus,
}) => {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [boardId, setBoardId] = useState(connection?.boardId || '');
  const [boardName, setBoardName] = useState(connection?.boardName || '');
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    username?: string;
    fullName?: string;
    boardsCount?: number;
    error?: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (connection?.boardId) {
      setBoardId(connection.boardId);
    }
    if (connection?.boardName) {
      setBoardName(connection.boardName);
    }
  }, [connection]);

  // Test Trello connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/trello/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          token: token.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data);
        setFeedback({
          type: 'success',
          message: `Connected successfully! Trello member: ${data.user?.fullName} (@${data.user?.username}) • ${data.boardsCount} board(s) accessible.`,
        });
        // Auto-fetch boards
        fetchBoards();
      } else {
        setTestResult({ success: false, error: data.error || 'Authentication failed' });
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to authenticate with Trello API. Please check your credentials.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Connection test request failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch real boards
  const fetchBoards = async () => {
    setIsLoadingBoards(true);
    try {
      const res = await fetch('/api/trello/boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        if (data.length > 0 && !boardId) {
          setBoardId(data[0].id);
          setBoardName(data[0].name);
        }
      }
    } catch (err) {
      console.warn('Failed to load boards:', err);
    } finally {
      setIsLoadingBoards(false);
    }
  };

  const handleBoardSelect = (selectedId: string) => {
    setBoardId(selectedId);
    const selected = boards.find((b) => b.id === selectedId);
    if (selected) {
      setBoardName(selected.name);
    }
  };

  // Save connection
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() && !connection?.apiKeyConfigured) {
      setFeedback({ type: 'error', message: 'API Key is required' });
      return;
    }
    if (!token.trim() && !connection?.tokenConfigured) {
      setFeedback({ type: 'error', message: 'Member Token is required' });
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const ok = await onSaveConnection(apiKey, token, boardId, boardName);
      if (ok) {
        setFeedback({
          type: 'success',
          message: `Trello board "${boardName || boardId}" configured successfully. You can now sync your real data!`,
        });
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setFeedback({
          type: 'error',
          message: 'Failed to verify and save Trello credentials with Atlassian API.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Connection error' });
    } finally {
      setIsTesting(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Trello? Credentials will be cleared.')) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/trello/disconnect', { method: 'POST' });
      if (res.ok) {
        setApiKey('');
        setToken('');
        setBoardId('');
        setBoardName('');
        setBoards([]);
        setTestResult(null);
        setFeedback({ type: 'success', message: 'Disconnected from Trello successfully.' });
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Disconnect failed' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Switch Mode (Real vs Demo)
  const handleSwitchMode = async (mode: 'real' | 'demo') => {
    try {
      const res = await fetch('/api/trello/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Switched application mode to ${mode.toUpperCase()}.`,
        });
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to switch mode' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="trello-settings-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Trello Integration & Board Synchronization
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    connection?.isDemoData
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {connection?.isDemoData ? 'Demo Mode' : 'Real Trello'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure real Atlassian Trello REST API credentials and target board
              </p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Current Status Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    connection?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {connection?.boardName || (connection?.connected ? 'Board Connected' : 'No Board Selected')}
                </span>
                {connection?.isDemoData ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Demo Mode
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Real Data
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {connection?.totalCards || 0} cards • {connection?.totalClients || 0} clients •{' '}
                {connection?.totalActivities || 0} activity events indexed
              </p>
              {connection?.lastSyncAt && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Last synced: {new Date(connection.lastSyncAt).toLocaleString()} ({connection.lastSyncStatus})
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="modal-sync-real-btn"
                onClick={onSync}
                disabled={isSyncing || role === 'VIEWER'}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Board Now'}</span>
              </button>

              {connection?.connected && (
                <button
                  id="disconnect-trello-btn"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || role !== 'ADMIN'}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Disconnect Trello"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mode Selector Toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Application Trello Mode</h3>
              <p className="text-[11px] text-slate-500">
                {connection?.isDemoData
                  ? 'Currently running with isolated demo data for preview testing.'
                  : 'Currently running in Real Trello mode. Real cards are fetched from api.trello.com.'}
              </p>
            </div>
            {role === 'ADMIN' && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => handleSwitchMode('real')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    !connection?.isDemoData ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Real Mode
                </button>
                <button
                  onClick={() => handleSwitchMode('demo')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    connection?.isDemoData ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Demo Mode
                </button>
              </div>
            )}
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveConnection} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Trello API Key</label>
                <a
                  href="https://trello.com/power-ups/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <span>Atlassian Power-Ups Admin</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <input
                id="input-trello-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={connection?.apiKeyConfigured ? '•••••••••••••••••••••••• (Configured)' : 'Enter your 32-character Trello API Key'}
                disabled={role !== 'ADMIN'}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Trello Member Token</label>
                <a
                  href={
                    apiKey
                      ? `https://trello.com/1/authorize?expiration=never&name=SEOIntelligence&scope=read&response_type=token&key=${apiKey}`
                      : 'https://trello.com/power-ups/admin'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <span>Authorize & Generate Token</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <input
                id="input-trello-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={connection?.tokenConfigured ? '•••••••••••••••••••••••• (Configured)' : 'Enter your 64-character Trello Member Token'}
                disabled={role !== 'ADMIN'}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                id="btn-test-connection"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>{isTesting ? 'Testing connection...' : 'Test Trello Connection'}</span>
              </button>

              <button
                type="button"
                id="btn-load-boards"
                onClick={fetchBoards}
                disabled={isLoadingBoards}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <Layers className={`w-3.5 h-3.5 ${isLoadingBoards ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>{isLoadingBoards ? 'Loading boards...' : 'Load Accessible Boards'}</span>
              </button>
            </div>

            {/* Accessible Board Selector */}
            {boards.length > 0 && (
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                <label className="block text-xs font-semibold text-slate-900">
                  Select Accessible Board ({boards.length} found)
                </label>
                <select
                  id="select-trello-board"
                  value={boardId}
                  onChange={(e) => handleBoardSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-200 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="">-- Choose a Trello Board --</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Target Board Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Board Name
                </label>
                <input
                  id="input-board-name"
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="e.g. PDS/GFM-SEO"
                  disabled={role !== 'ADMIN'}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Board ID (or shortlink)
                </label>
                <input
                  id="input-board-id"
                  type="text"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  placeholder="e.g. board_pds_gfm_seo or Trello ID"
                  disabled={role !== 'ADMIN'}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 text-slate-900"
                />
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {role !== 'ADMIN' ? (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                You are currently in <strong>{role}</strong> mode. Switch to <strong>Admin</strong> in the top bar to update credentials.
              </p>
            ) : (
              <button
                id="save-trello-creds-btn"
                type="submit"
                disabled={isTesting}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Trello API...</span>
                  </>
                ) : (
                  <span>Save Connection & Board</span>
                )}
              </button>
            )}
          </form>

          {/* How-to guide callout */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-semibold text-slate-900">How to Connect Your Real Trello Board</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>
                Visit{' '}
                <a
                  href="https://trello.com/power-ups/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline font-medium"
                >
                  Trello Power-Ups Admin
                </a>{' '}
                and generate a new API key.
              </li>
              <li>Click the manual "Token" authorization link to generate a read token.</li>
              <li>Paste your API Key and Token above, then click <strong>"Test Trello Connection"</strong>.</li>
              <li>Select your board (e.g. <strong>PDS/GFM-SEO</strong>) and click <strong>"Sync Board Now"</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
