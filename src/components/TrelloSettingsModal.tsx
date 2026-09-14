import React, { useState } from 'react';
import {
  X,
  Key,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Database,
  Layers,
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
}

export const TrelloSettingsModal: React.FC<TrelloSettingsModalProps> = ({
  isOpen,
  onClose,
  connection,
  role,
  onSaveConnection,
  onSync,
  isSyncing,
}) => {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [boardId, setBoardId] = useState(connection?.boardId || 'board_pds_gfm_seo');
  const [boardName, setBoardName] = useState(connection?.boardName || 'PDS/GFM-SEO');
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !token.trim()) {
      setFeedback({ type: 'error', message: 'API Key and Token are required' });
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const ok = await onSaveConnection(apiKey, token, boardId, boardName);
      if (ok) {
        setFeedback({
          type: 'success',
          message: 'Trello credentials verified & saved successfully!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Failed to verify Trello credentials with Atlassian API.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Connection error' });
    } finally {
      setIsTesting(false);
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
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Trello Integration & Synchronization
              </h2>
              <p className="text-xs text-slate-500">
                Connect live Trello boards or configure sync settings
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
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    connection?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {connection?.boardName || 'PDS/GFM-SEO'}
                </span>
                {connection?.isDemoData && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    High-Fidelity Demo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {connection?.totalCards || 0} cards • {connection?.totalClients || 0} clients •{' '}
                {connection?.totalActivities || 0} activity records indexed
              </p>
            </div>

            <button
              onClick={onSync}
              disabled={isSyncing || role === 'VIEWER'}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Trello API Key</label>
                <a
                  href="https://trello.com/power-ups/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <input
                id="input-trello-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={connection?.apiKeyConfigured ? '••••••••••••••••••••••••' : 'Enter Trello API key'}
                disabled={role !== 'ADMIN'}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Trello Member Token</label>
                <a
                  href="https://trello.com/1/authorize?expiration=never&name=SEOIntelligence&scope=read&response_type=token&key=YOUR_API_KEY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <span>Generate Token</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <input
                id="input-trello-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={connection?.tokenConfigured ? '••••••••••••••••••••••••' : 'Enter Trello member token'}
                disabled={role !== 'ADMIN'}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Board Name
                </label>
                <input
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
                  type="text"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  placeholder="e.g. board_pds_gfm_seo"
                  disabled={role !== 'ADMIN'}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600 text-slate-900"
                />
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
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
                  <span>Test Connection & Save</span>
                )}
              </button>
            )}
          </form>

          {/* How-to guide callout */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-semibold text-slate-900">How to Connect Your Trello Board</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Log in to Atlassian / Trello and go to Trello Power-Ups Admin.</li>
              <li>Create a new Power-Up integration to obtain your API Key.</li>
              <li>Click the manual "Token" link next to the API Key field to authorize read access.</li>
              <li>Enter your Key and Token above, then click "Test Connection & Save".</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
