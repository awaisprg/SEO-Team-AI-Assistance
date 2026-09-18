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
  Users,
  UserPlus,
  Trash2,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
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

interface AppUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
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
  const [activeTab, setActiveTab] = useState<'trello' | 'users'>('trello');

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

  // User management state
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'MANAGER' | 'ADMIN'>('MANAGER');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [tokenAuthUrl, setTokenAuthUrl] = useState<string>('');

  const fetchTokenAuthUrl = async (keyOverride?: string) => {
    try {
      const keyParam = keyOverride ? `?apiKey=${encodeURIComponent(keyOverride)}` : '';
      const res = await fetchWithAuth(`/api/trello/token-auth-url${keyParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.authUrl) {
          setTokenAuthUrl(data.authUrl);
          return data.authUrl;
        }
      }
    } catch (err) {
      console.error('Failed to load token auth URL:', err);
    }
    return null;
  };

  useEffect(() => {
    if (connection?.boardId) {
      setBoardId(connection.boardId);
    }
    if (connection?.boardName) {
      setBoardName(connection.boardName);
    }
  }, [connection]);

  // Fetch boards and users when opening modal as admin
  useEffect(() => {
    if (isOpen && role === 'ADMIN') {
      fetchBoards();
      fetchUsers();
      fetchTokenAuthUrl();
    }
  }, [isOpen, role]);

  const getDirectTokenUrl = () => {
    const key = apiKeyInput.trim();
    if (key) {
      return `https://trello.com/1/authorize?expiration=never&name=TrelloIntelligence&scope=read,write&response_type=token&key=${encodeURIComponent(key)}`;
    }
    if (tokenAuthUrl) {
      return tokenAuthUrl;
    }
    return 'https://trello.com/power-ups/admin';
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetchWithAuth('/api/admin/users');
      if (res.ok) {
        const list = await res.json();
        setUsers(list);
      }
    } catch (err) {
      console.error('Failed to load user list:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      setFeedback({ type: 'error', message: 'Email and password are required.' });
      return;
    }

    setIsCreatingUser(true);
    setFeedback(null);

    try {
      const res = await fetchWithAuth('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setFeedback({
        type: 'success',
        message: `Account created for ${data.user.email} with ${data.user.role} role. They can now log in using the single sign-in screen.`,
      });
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create user' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove account access for ${email}?`)) {
      return;
    }

    setDeletingUserId(userId);
    setFeedback(null);

    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setFeedback({
        type: 'success',
        message: `User access for ${email} has been revoked.`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete user' });
    } finally {
      setDeletingUserId(null);
    }
  };

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

      setTokenInput('');
      setApiKeyInput('');

      if (data.boards && data.boards.length > 0) {
        setBoards(data.boards);
      } else {
        await fetchBoards();
      }

      if (onRefreshStatus) onRefreshStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to connect to Trello API. Please check your credentials.',
      });
    } finally {
      setIsSavingCreds(false);
    }
  };

  const fetchBoards = async () => {
    setIsLoadingBoards(true);
    try {
      const res = await fetchWithAuth('/api/trello/boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data || []);
      }
    } catch (err) {
      console.warn('Could not fetch remote Trello boards:', err);
    } finally {
      setIsLoadingBoards(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await fetchWithAuth('/api/trello/test');
      const data = await res.json();
      if (data.connected) {
        setFeedback({
          type: 'success',
          message: `Connection active! Board "${data.boardName}" contains ${data.listsCount} lists, ${data.cardsCount} cards, and ${data.membersCount} members.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Connection test failed. Verify board ID or API credentials.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Network error while testing Trello connection.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveBoardSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId.trim()) {
      setFeedback({ type: 'error', message: 'Please select or enter a valid Trello Board ID.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const selectedOption = boards.find((b) => b.id === boardId);
    const resolvedName = boardName.trim() || selectedOption?.name || 'Production Board';

    const ok = await onSaveBoard(boardId.trim(), resolvedName);
    setIsSaving(false);

    if (ok) {
      setFeedback({
        type: 'success',
        message: `Connected board "${resolvedName}". Syncing live cards now...`,
      });
      onSync();
    } else {
      setFeedback({
        type: 'error',
        message: 'Could not connect to this Trello board. Ensure permissions are granted.',
      });
    }
  };

  const handleToggleMode = async (mode: 'real' | 'demo') => {
    try {
      const res = await fetchWithAuth('/api/trello/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Switched operational mode to ${mode === 'real' ? 'Live Trello Board' : 'Demo Dataset'}.`,
        });
        if (onRefreshStatus) onRefreshStatus();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to switch mode' });
    }
  };

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

  if (!isOpen || role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Administration Hub</h2>
              <p className="text-xs text-slate-500">Trello integration, API credentials & team access management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('trello')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'trello'
                ? 'border-[#7C52F5] text-[#7C52F5] font-semibold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Trello Board & API</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-[#7C52F5] text-[#7C52F5] font-semibold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team & User Access ({users.length})</span>
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

          {activeTab === 'trello' ? (
            <>
              {/* 1. Trello API Key & Token Input Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-[#7C52F5]" />
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
                      <span className="text-[10px] text-amber-600">Not set</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[11px] text-slate-700">Token</div>
                      <div className="text-[10px] text-slate-400">
                        {connection?.maskedToken ? `Token: ${connection.maskedToken}` : 'Member Token'}
                      </div>
                    </div>
                    {connection?.tokenConfigured ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600">Not set</span>
                    )}
                  </div>
                </div>

                {/* Form to update credentials */}
                <form onSubmit={handleSaveCredentials} className="space-y-3.5 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Update Trello API Key
                      </label>
                      <a
                        href="https://trello.com/power-ups/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[11px] font-medium text-[#7C52F5] hover:text-[#683EE6] hover:underline"
                        title="Open Trello Power-Ups Developer Admin to get your API Key"
                      >
                        <span>Get API Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApiKeyInput(val);
                        if (val.trim()) {
                          fetchTokenAuthUrl(val.trim());
                        }
                      }}
                      placeholder={connection?.apiKeyConfigured ? 'Leave blank to keep current key' : 'Enter 32-char Trello API Key'}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                    />
                    <div className="mt-1 flex items-center justify-between text-[10.5px] text-slate-500">
                      <span>Generate or copy from Trello Developer Admin</span>
                      <a
                        href="https://trello.com/app-key"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-[#7C52F5] hover:underline inline-flex items-center space-x-0.5"
                      >
                        <span>Direct app-key link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Update Trello Member Token
                      </label>
                      <a
                        href={getDirectTokenUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[11px] font-medium text-[#7C52F5] hover:text-[#683EE6] hover:underline"
                        title={
                          apiKeyInput.trim()
                            ? 'Authorize and generate token for your entered API key'
                            : connection?.apiKeyConfigured
                            ? 'Authorize and generate token using your saved API key'
                            : 'Generate token on Trello'
                        }
                      >
                        <span>Get Member Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={connection?.tokenConfigured ? 'Leave blank to keep current token' : 'Enter 64-char Trello Token'}
                        className="w-full text-xs font-mono px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="mt-1 text-[10.5px] text-slate-500">
                      {apiKeyInput.trim() ? (
                        <span className="text-emerald-600 font-medium">Ready: Click "Get Member Token" above for 1-click authorization.</span>
                      ) : connection?.apiKeyConfigured ? (
                        <span>Uses your saved Trello API Key to grant 1-click token authorization.</span>
                      ) : (
                        <span>Tip: Enter your API key above first to generate your token directly in 1 click.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://trello.com/power-ups/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] text-[#7C52F5] hover:underline"
                    >
                      <span>Trello Developer Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="submit"
                      disabled={isSavingCreds || (!apiKeyInput && !tokenInput)}
                      className="px-3 py-1.5 rounded-lg bg-[#7C52F5] hover:bg-[#683EE6] disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      {isSavingCreds ? 'Verifying...' : 'Save & Verify'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Board Selection & Live Connection */}
              <form onSubmit={handleSaveBoardSelection} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#7C52F5]" />
                      <span>Select Trello Board</span>
                    </label>
                    <div className="flex items-center space-x-3">
                      <a
                        href="https://trello.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#7C52F5] hover:underline flex items-center space-x-1"
                      >
                        <span>Open Trello</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={fetchBoards}
                        disabled={isLoadingBoards}
                        className="text-[11px] text-[#7C52F5] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingBoards ? 'animate-spin' : ''}`} />
                        <span>Refresh boards</span>
                      </button>
                    </div>
                  </div>

                  {boards.length > 0 ? (
                    <select
                      value={boardId}
                      onChange={(e) => {
                        setBoardId(e.target.value);
                        const sel = boards.find((b) => b.id === e.target.value);
                        if (sel) setBoardName(sel.name);
                      }}
                      className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                    >
                      <option value="">-- Choose a Trello Board --</option>
                      {(boards || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.closed ? '(Archived)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={boardId}
                      onChange={(e) => setBoardId(e.target.value)}
                      placeholder="Paste 24-character Trello Board ID or Shortlink"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Friendly Board Name (Display)
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="e.g., SEO & Content Production Board"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden"
                  />
                </div>

                {/* Actions Bar */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      type="submit"
                      disabled={isSaving || !boardId}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#7C52F5] hover:bg-[#683EE6] disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Connecting...' : 'Connect & Sync'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !connection?.connected}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {connection?.connected && (
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
            </>
          ) : (
            /* User Management Tab */
            <div className="space-y-6">
              {/* Add New Manager Form */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-[#7C52F5]" />
                    <span className="text-xs font-semibold text-slate-900">Provision User Account</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                    Admin Only Control
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Create credentials for managers. Managers can interact with the intelligence assistant and sync the Trello board, but cannot modify API settings.
                </p>

                <form onSubmit={handleCreateUser} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full pl-8 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Role Access Level
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'MANAGER' | 'ADMIN')}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                      >
                        <option value="MANAGER">Manager (Use Tool & Sync Board)</option>
                        <option value="ADMIN">Administrator (Full Access)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="manager@company.com"
                          className="w-full pl-8 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Initial Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full pl-8 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C52F5] focus:border-[#7C52F5] outline-hidden bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingUser || !newEmail || !newPassword}
                      className="px-4 py-2 rounded-lg bg-[#7C52F5] hover:bg-[#683EE6] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      {isCreatingUser ? 'Provisioning...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Users List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900">Active Authorized Accounts</h3>
                  <button
                    type="button"
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="text-[11px] text-[#7C52F5] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {(users || []).map((u) => {
                    const isAwaisMaster = u.email.toLowerCase() === 'awais7475@prgmd.com';
                    return (
                      <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900">{u.name}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  u.role === 'ADMIN'
                                    ? 'bg-[#09061A] text-white'
                                    : 'bg-violet-50 text-violet-800 border border-violet-200/60'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </div>
                        </div>

                        {!isAwaisMaster && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingUserId === u.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Revoke access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Logged in as: <strong className="text-slate-800">Admin</strong></span>
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
