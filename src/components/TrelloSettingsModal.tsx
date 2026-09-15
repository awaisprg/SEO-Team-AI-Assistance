import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Unlink,
  Check,
  Globe,
  Sliders,
  ShieldAlert,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { TrelloConnectionStatus, UserRole } from '../types';
import { fetchWithAuth } from '../lib/supabaseClient';

interface TrelloSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: TrelloConnectionStatus | null;
  role: UserRole;
  onSaveBoard: (boardId: string, boardName?: string) => Promise<boolean>;
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
  onSaveBoard,
  onSync,
  isSyncing,
  onRefreshStatus,
}) => {
  if (!isOpen) return null;

  // Credential fields
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Board selection
  const [boardId, setBoardId] = useState(connection?.boardId || '');
  const [boardName, setBoardName] = useState(connection?.boardName || '');
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (connection?.boardId) {
      setBoardId(connection.boardId);
    }
    if (connection?.boardName) {
      setBoardName(connection.boardName);
    }
  }, [connection]);

  // Fetch real boards when opening modal
  useEffect(() => {
    fetchBoards();
  }, []);

  // Save and verify Trello credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Only Administrators can configure Trello API credentials.' });
      return;
    }

    if (!apiKeyInput.trim() || !tokenInput.trim()) {
      setFeedback({ type: 'error', message: 'Both Trello API Key and Member Token are required.' });
      return;
    }

    setIsSavingCreds(true);
    setFeedback(null);

    try {
      const res = await fetchWithAuth('/api/trello/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
          token: tokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify and save Trello credentials.');
      }

      setFeedback({
        type: 'success',
        message: `Trello credentials verified and saved for ${data.user?.fullName} (@${data.user?.username}). Found ${data.boardsCount} accessible boards.`,
      });

      // Clear token input from UI memory for security once saved
      setTokenInput('');
      setApiKeyInput('');

      // Refresh connection and board list
      if (onRefreshStatus) onRefreshStatus();
      await fetchBoards();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Credential validation failed' });
    } finally {
      setIsSavingCreds(false);
    }
  };

  // Test server-configured Trello connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);

    try {
      const res = await fetchWithAuth('/api/trello/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim() || undefined,
          token: tokenInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Connected successfully! Trello member: ${data.user?.fullName} (@${data.user?.username}) • ${data.boardsCount} board(s) accessible.`,
        });
        fetchBoards();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to authenticate with Trello API. Please verify your Key and Token.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Connection test request failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch real boards from server
  const fetchBoards = async () => {
    setIsLoadingBoards(true);
    try {
      const res = await fetchWithAuth('/api/trello/boards');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBoards(data);
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch boards:', err);
    } finally {
      setIsLoadingBoards(false);
    }
  };

  // Save selected board
  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Only Administrators can modify board selection.' });
      return;
    }

    if (!boardId) {
      setFeedback({ type: 'error', message: 'Please select or enter a Trello board ID.' });
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSaveBoard(boardId, boardName);
      if (success) {
        setFeedback({
          type: 'success',
          message: `Active Trello board updated to "${boardName || boardId}".`,
        });
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setFeedback({ type: 'error', message: 'Failed to update board selection.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating board' });
    } finally {
      setIsSaving(false);
    }
  };

  // Switch between Real and Demo mode
  const handleToggleMode = async (targetMode: 'real' | 'demo') => {
    if (role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Only Administrators can change operation mode.' });
      return;
    }

    try {
      const res = await fetchWithAuth('/api/trello/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Operating mode switched to ${targetMode === 'real' ? 'Real Trello Board' : 'Demo Dataset'}.`,
        });
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to toggle mode' });
    }
  };

  // Disconnect board
  const handleDisconnect = async () => {
    if (role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Only Administrators can disconnect boards.' });
      return;
    }

    if (!confirm('Are you sure you want to disconnect this board? Team members will not be able to query live data.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetchWithAuth('/api/trello/disconnect', { method: 'POST' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Board disconnected successfully.' });
        setBoardId('');
        setBoardName('');
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to disconnect board' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Trello Integration Settings</h2>
              <p className="text-xs text-slate-500">API credentials, real-time board discovery & sync controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Feedback Notice */}
          {feedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 1. Trello API Key & Token Input Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-900">Trello API Credentials</span>
              </div>
              <div className="flex items-center space-x-2">
                {connection?.apiKeyConfigured && connection?.tokenConfigured ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Credentials Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                    Credentials Missing
                  </span>
                )}
              </div>
            </div>

            {/* Current Credential Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] text-slate-700">API Key</div>
                  <div className="text-[10px] text-slate-400">
                    {connection?.maskedApiKey ? `Key: ${connection.maskedApiKey}` : 'Developer Key'}
                  </div>
                </div>
                {connection?.apiKeyConfigured ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Missing
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] text-slate-700">Member Token</div>
                  <div className="text-[10px] text-slate-400">Personal access token</div>
                </div>
                {connection?.tokenConfigured ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Missing
                  </span>
                )}
              </div>
            </div>

            {/* Input Form for Admin */}
            {role === 'ADMIN' ? (
              <form onSubmit={handleSaveCredentials} className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Trello API Key
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your 32-character Trello API Key"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>From Trello Power-Up Admin Portal</span>
                    <a
                      href="https://trello.com/power-ups/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 inline-flex items-center space-x-0.5"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Trello Member Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Enter Trello Member Authorization Token"
                      className="w-full text-xs pl-3 pr-10 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Scope: read, write • Expiration: never</span>
                    <a
                      href={
                        apiKeyInput.trim()
                          ? `https://trello.com/1/authorize?expiration=never&name=Agency+Management+Portal&scope=read,write&response_type=token&key=${apiKeyInput.trim()}`
                          : 'https://trello.com/power-ups/admin'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center space-x-0.5"
                    >
                      <span>Get Trello Member Token</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingCreds || (!apiKeyInput.trim() && !tokenInput.trim())}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {isSavingCreds ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Verify Credentials</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Only the Administrator (awais7475@prgmd.com) can update Trello API credentials.</span>
              </div>
            )}
          </div>

          {/* 2. Board Selection Form */}
          <form onSubmit={handleSaveBoard} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Target Trello Board
                </label>
                <button
                  type="button"
                  onClick={fetchBoards}
                  disabled={isLoadingBoards}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 inline-flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingBoards ? 'animate-spin' : ''}`} />
                  <span>Refresh Boards</span>
                </button>
              </div>

              {boards.length > 0 ? (
                <select
                  value={boardId}
                  onChange={(e) => {
                    const selected = boards.find((b) => b.id === e.target.value);
                    setBoardId(e.target.value);
                    if (selected) setBoardName(selected.name);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a board...</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  placeholder="Enter Board ID or Shortlink (e.g. 68114872282c6eabcdad8400)"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Display Board Name
              </label>
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="e.g. PDS/GFM-SEO"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {role === 'ADMIN' && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Board...' : 'Save Active Board'}</span>
                </button>

                {connection?.boardId && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="inline-flex items-center space-x-1 text-xs font-medium text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect Board</span>
                  </button>
                )}
              </div>
            )}
          </form>

          {/* 3. Operational Mode Switcher Section */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">Operational Mode</div>
              <div className="text-[11px] text-slate-500">
                Switch between live Trello board polling and sample client workspace.
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleToggleMode('real')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  connection?.mode === 'real'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Real Board
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('demo')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  connection?.mode === 'demo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Demo Dataset
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Role: <strong className="text-slate-700">{role}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
