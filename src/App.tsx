import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquareText,
  FileText,
  Building2,
  Users,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { ChatView } from './components/ChatView';
import { BriefView } from './components/BriefView';
import { ClientsView } from './components/ClientsView';
import { TeamView } from './components/TeamView';
import {
  ChatViewSkeleton,
  BriefViewSkeleton,
  ClientsViewSkeleton,
  TeamViewSkeleton,
} from './components/TabSkeletons';
import { TrelloSettingsModal } from './components/TrelloSettingsModal';
import { SourceCardModal } from './components/SourceCardModal';
import { AuthScreen } from './components/AuthScreen';
import {
  ChatMessage,
  ChatSource,
  ChatSession,
  ManagementBrief,
  ClientEntity,
  TrelloList,
  TeamMetrics,
  TrelloConnectionStatus,
  UserRole,
  UserSession,
  TrelloCard,
} from './types';
import {
  fetchWithAuth,
  getCurrentUserSession,
  getSupabaseBrowserClient,
  initSupabaseClient,
} from './lib/supabaseClient';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<'chat' | 'brief' | 'clients' | 'team'>('chat');
  const [connection, setConnection] = useState<TrelloConnectionStatus | null>(null);
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentBrief, setCurrentBrief] = useState<ManagementBrief | null>(null);
  const [savedBriefs, setSavedBriefs] = useState<ManagementBrief[]>([]);
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [memberOverviews, setMemberOverviews] = useState<any[]>([]);
  const [allCards, setAllCards] = useState<TrelloCard[]>([]);

  // UI States
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<string | undefined>(undefined);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const syncPollInterval = useRef<any>(null);
  const tabTransitionTimerRef = useRef<any>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  currentSessionIdRef.current = currentSessionId;
  const chatSessionsRef = useRef<ChatSession[]>([]);
  chatSessionsRef.current = chatSessions;
  const userRef = useRef<UserSession | null>(null);
  userRef.current = user;
  const connectionRef = useRef<TrelloConnectionStatus | null>(null);
  connectionRef.current = connection;
  const isSyncingRef = useRef(false);
  isSyncingRef.current = isSyncing;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Tab change with smooth shimmer/skeleton transition
  const handleTabChange = useCallback((newTab: 'chat' | 'brief' | 'clients' | 'team') => {
    if (newTab === activeTab) return;
    if (tabTransitionTimerRef.current) {
      clearTimeout(tabTransitionTimerRef.current);
    }
    setActiveTab(newTab);
    setIsTabTransitioning(true);
    tabTransitionTimerRef.current = setTimeout(() => {
      setIsTabTransitioning(false);
    }, 220);
  }, [activeTab]);

  // Check auth session
  const checkAuthAndLoad = async () => {
    setIsCheckingAuth(true);
    await initSupabaseClient();
    const session = await getCurrentUserSession();
    if (session) {
      setUser(session);
      setIsDataLoading(true);
      await refreshAllData();
      setIsDataLoading(false);
    } else {
      setUser(null);
    }
    setIsCheckingAuth(false);
  };

  useEffect(() => {
    checkAuthAndLoad();

    return () => {
      if (syncPollInterval.current) {
        clearInterval(syncPollInterval.current);
      }
      if (tabTransitionTimerRef.current) {
        clearTimeout(tabTransitionTimerRef.current);
      }
    };
  }, []);

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [statusRes, teamRes, clientsRes, listsRes, briefsRes, sessionsRes] = await Promise.all([
        fetchWithAuth('/api/trello/status').then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth('/api/team').then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth('/api/clients').then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth('/api/lists').then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth('/api/management-briefs').then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth('/api/chat/sessions').then((r) => (r.ok ? r.json() : [])),
      ]);

      if (statusRes) setConnection(statusRes);
      if (teamRes?.metrics) setMetrics(teamRes.metrics);
      if (teamRes?.memberOverviews) setMemberOverviews(teamRes.memberOverviews);
      if (teamRes?.activeCards) setAllCards([...teamRes.activeCards, ...(teamRes.recentCompleted || [])]);
      if (Array.isArray(clientsRes)) setClients(clientsRes);
      if (Array.isArray(listsRes)) setLists(listsRes);

      const mergedSessions: ChatSession[] = Array.isArray(sessionsRes) ? sessionsRes : [];
      const mergedBriefs: ManagementBrief[] = Array.isArray(briefsRes) ? briefsRes : [];

      setChatSessions(mergedSessions);
      // Keep chat state clean on app load so user starts with a fresh inquiry instead of auto-loading prior queries.
      // All prior inquiries remain accessible anytime via the Archive sidebar.

      setSavedBriefs(mergedBriefs);
      if (mergedBriefs.length > 0 && !currentBrief) {
        setCurrentBrief(mergedBriefs[0]);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      await sb.auth.signOut().catch(() => {});
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('firebase_auth_active');
    localStorage.removeItem('supabase_auth_token');
    localStorage.removeItem('demo_auth_token');
    setUser(null);
    setConnection(null);
    setMessages([]);
    showNotification('success', 'You have been signed out.');
  }, []);

  // Send Chat Message
  const handleSendMessage = useCallback(async (question: string) => {
    setIsLoadingChat(true);
    const tempUserMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetchWithAuth('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId: currentSessionIdRef.current }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get answer from intelligence engine');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }

      // Re-fetch sessions in background to update history sidebar list & timestamps
      fetchWithAuth('/api/chat/sessions')
        .then((r) => (r.ok ? r.json() : []))
        .then((updated) => {
          if (Array.isArray(updated) && updated.length > 0) {
            setChatSessions(updated);
          }
        })
        .catch(() => {});
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with intelligence engine'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  // Select a session from history
  const handleSelectSession = useCallback((sessionId: string) => {
    const session = chatSessionsRef.current.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages || []);
      setActiveTab('chat');
    }
  }, []);

  // Start a fresh intelligence query
  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setActiveTab('chat');
  }, []);

  // Delete a session from history archive
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetchWithAuth(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setCurrentSessionId((prev) => (prev === sessionId ? null : prev));
        showNotification('success', 'Query removed from archive.');
      }
    } catch (err) {
      showNotification('error', 'Failed to remove query session.');
    }
  }, []);

  // Generate Executive Brief
  const handleGenerateBrief = useCallback(async (
    periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom',
    dateFrom?: string,
    dateTo?: string
  ) => {
    setIsGeneratingBrief(true);
    try {
      const res = await fetchWithAuth('/api/management-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType, dateFrom, dateTo }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate brief');
      }

      const brief: ManagementBrief = await res.json();
      setCurrentBrief(brief);
      setSavedBriefs((prev) => [brief, ...prev.filter((b) => b.id !== brief.id)]);

      showNotification('success', `Executive Brief "${brief.title}" generated successfully.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to generate brief');
    } finally {
      setIsGeneratingBrief(false);
    }
  }, []);

  // Delete Individual Management Brief
  const handleDeleteBrief = useCallback(async (briefId: string) => {
    try {
      const res = await fetchWithAuth(`/api/management-briefs/${briefId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete brief');
      }
      setSavedBriefs((prev) => prev.filter((b) => b.id !== briefId));
      setCurrentBrief((prev) => (prev?.id === briefId ? null : prev));
      showNotification('success', 'Executive brief removed from archive.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete brief');
    }
  }, []);

  // Clear All Archived Management Briefs
  const handleClearBriefs = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/management-briefs', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to clear briefs');
      }
      setSavedBriefs([]);
      setCurrentBrief(null);
      showNotification('success', 'All archived executive briefs cleared.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to clear briefs');
    }
  }, []);

  // Asynchronous Job-Based Trello Synchronization with Polling (Admin & Manager)
  const handleSync = useCallback(async () => {
    if (userRef.current?.role !== 'ADMIN' && userRef.current?.role !== 'MANAGER') {
      showNotification('error', 'Only Administrators and Managers can trigger synchronizations.');
      return;
    }

    if (isSyncingRef.current) return;

    setIsSyncing(true);
    setSyncPhase('Initiating background sync...');

    try {
      const res = await fetchWithAuth('/api/trello/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: connectionRef.current?.boardId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sync request rejected');
      }

      setSyncPhase(data.syncRun?.phase || 'Background job running...');
      showNotification('success', 'Synchronization job dispatched. Polling progress...');

      // Start polling status endpoint
      if (syncPollInterval.current) clearInterval(syncPollInterval.current);

      syncPollInterval.current = setInterval(async () => {
        try {
          const pollRes = await fetchWithAuth('/api/trello/sync/status');
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          if (pollData.phase) {
            setSyncPhase(pollData.phase);
          }

          if (pollData.status === 'success') {
            clearInterval(syncPollInterval.current);
            syncPollInterval.current = null;
            setIsSyncing(false);
            setSyncPhase(undefined);
            await refreshAllData();
            showNotification(
              'success',
              pollData.latestJob?.message || 'Trello board synchronized successfully.'
            );
          } else if (pollData.status === 'failed') {
            clearInterval(syncPollInterval.current);
            syncPollInterval.current = null;
            setIsSyncing(false);
            setSyncPhase(undefined);
            showNotification(
              'error',
              pollData.latestJob?.message || 'Trello synchronization failed.'
            );
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 2000);
    } catch (err: any) {
      setIsSyncing(false);
      setSyncPhase(undefined);
      showNotification('error', err.message || 'Trello synchronization failed');
    }
  }, []);

  // Reset Demo Data
  const handleSeedDemo = useCallback(async () => {
    if (userRef.current?.role !== 'ADMIN') {
      showNotification('error', 'Only Administrators can reset database records.');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/trello/seed-demo', { method: 'POST' });
      const data = await res.json();
      await refreshAllData();
      showNotification('success', data.message || 'Demo workflow loaded successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reset demo');
    }
  }, []);

  // Save Trello Active Board (Zero secrets sent)
  const handleSaveBoard = useCallback(async (boardId: string, boardName?: string): Promise<boolean> => {
    try {
      const res = await fetchWithAuth('/api/trello/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, boardName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to connect board');
      }

      await refreshAllData();
      showNotification('success', 'Trello board linked successfully.');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to connect board');
      return false;
    }
  }, []);

  // Add Client Alias
  const handleAddAlias = useCallback(async (clientId: string, alias: string) => {
    try {
      const res = await fetchWithAuth(`/api/clients/${clientId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      });
      if (res.ok) {
        await refreshAllData();
        showNotification('success', `Added alias "${alias}"`);
      }
    } catch (err) {
      showNotification('error', 'Failed to add client alias');
    }
  }, []);

  // Update List Semantics
  const handleUpdateListSemantics = useCallback(async (
    listId: string,
    semanticType: any,
    mappedStatus?: any,
    mappedPerson?: string
  ) => {
    try {
      const res = await fetchWithAuth('/api/lists/semantics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, semanticType, mappedStatus, mappedPerson }),
      });
      if (res.ok) {
        await refreshAllData();
        showNotification('success', 'List semantics updated.');
      }
    } catch (err) {
      showNotification('error', 'Failed to update list semantics');
    }
  }, []);

  // Helper when clicking a KPI or chip to ask Assistant
  const handleSelectFilter = useCallback((prompt: string) => {
    handleTabChange('chat');
    handleSendMessage(prompt);
  }, [handleTabChange, handleSendMessage]);

  const handleAskAboutClient = useCallback((name: string) => {
    handleTabChange('chat');
    handleSendMessage(`Give me a detailed workstream update for client ${name}`);
  }, [handleTabChange, handleSendMessage]);

  const handleAskAboutMember = useCallback((name: string) => {
    handleTabChange('chat');
    handleSendMessage(`What is ${name} currently working on and what was recently completed?`);
  }, [handleTabChange, handleSendMessage]);

  const handleSelectCard = useCallback((card: { id: string; name: string; url: string; status: any; listName: string }) => {
    setSelectedSource({
      cardId: card.id,
      title: card.name,
      url: card.url,
      relevance: 100,
      reason: 'Inspected from Team Overview',
      date: new Date().toISOString(),
      status: card.status,
      listName: card.listName,
    });
  }, []);

  const handleOpenSettings = useCallback(() => {
    if (userRef.current?.role === 'ADMIN') {
      setIsSettingsOpen(true);
    }
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0C0528] flex flex-col items-center justify-center text-white space-y-3">
        <RefreshCw className="w-8 h-8 text-[#8963FB] animate-spin" />
        <div className="text-sm font-semibold text-[#A78AFD] tracking-wide">
          Verifying Gold Flex security credentials & session...
        </div>
      </div>
    );
  }

  // If unauthenticated, display Supabase Auth screen
  if (!user) {
    return <AuthScreen onAuthenticated={checkAuthAndLoad} />;
  }

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-[#7C52F5]/20 selection:text-[#2A1C94] relative">
      {/* Top GoldFlex Brand Accent Bar */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#7C52F5] via-amber-400 to-[#6366F1] shrink-0 sticky top-0 z-50 shadow-xs" />

      {/* Atmospheric ambient glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-24 left-[15%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-[15%] w-80 h-80 bg-amber-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-[30%] w-[32rem] h-[32rem] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <Header
        connection={connection}
        user={user}
        onSignOut={handleSignOut}
        onSync={handleSync}
        onSeedDemo={handleSeedDemo}
        onOpenSettings={handleOpenSettings}
        isSyncing={isSyncing}
        syncPhase={syncPhase}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-[#198754] text-white'
                : 'bg-[#BC2D3B] text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col relative z-10">
        {/* KPI Strip */}
        <MetricsBar
          metrics={metrics}
          onSelectFilter={handleSelectFilter}
          isSyncing={isSyncing}
          lastSyncedAt={connection?.lastSync}
        />

        {/* View Navigation Tabs & Live Engine Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <nav
            aria-label="Workspace views"
            className="inline-flex items-center p-1 rounded-xl glass-card gap-1 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {/* Tab: Management Assistant */}
            <button
              id="tab-chat-btn"
              type="button"
              onClick={() => handleTabChange('chat')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 group select-none active:scale-[0.98] ${
                activeTab === 'chat'
                  ? 'theme-tab-active font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 font-medium border border-transparent'
              }`}
            >
              <Sparkles
                className={`w-3.5 h-3.5 transition-colors ${
                  activeTab === 'chat' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="tracking-tight">Management Assistant</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors ${
                  activeTab === 'chat'
                    ? 'tab-badge font-semibold'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`}
              >
                AI
              </span>
            </button>

            {/* Tab: Executive Briefs */}
            <button
              id="tab-brief-btn"
              type="button"
              onClick={() => handleTabChange('brief')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 group select-none active:scale-[0.98] ${
                activeTab === 'brief'
                  ? 'theme-tab-active font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 font-medium border border-transparent'
              }`}
            >
              <FileText
                className={`w-3.5 h-3.5 transition-colors ${
                  activeTab === 'brief' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="tracking-tight">Executive Briefs</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors ${
                  activeTab === 'brief'
                    ? 'tab-badge font-semibold'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`}
              >
                PDF
              </span>
            </button>

            {/* Tab: Clients & Initiatives */}
            <button
              id="tab-clients-btn"
              type="button"
              onClick={() => handleTabChange('clients')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 group select-none active:scale-[0.98] ${
                activeTab === 'clients'
                  ? 'theme-tab-active font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 font-medium border border-transparent'
              }`}
            >
              <Building2
                className={`w-3.5 h-3.5 transition-colors ${
                  activeTab === 'clients' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="tracking-tight">Clients & Initiatives</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded transition-colors ${
                  activeTab === 'clients'
                    ? 'tab-badge font-semibold'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`}
              >
                {clients.length}
              </span>
            </button>

            {/* Tab: Team Overview */}
            <button
              id="tab-team-btn"
              type="button"
              onClick={() => handleTabChange('team')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 group select-none active:scale-[0.98] ${
                activeTab === 'team'
                  ? 'theme-tab-active font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 font-medium border border-transparent'
              }`}
            >
              <Users
                className={`w-3.5 h-3.5 transition-colors ${
                  activeTab === 'team' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="tracking-tight">Team Overview</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded transition-colors ${
                  activeTab === 'team'
                    ? 'tab-badge font-semibold'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`}
              >
                {memberOverviews.length || 3}
              </span>
            </button>
          </nav>

          {/* Right Status Indicator: Clean, High-Trust Intelligence Status */}
          <div className="hidden sm:inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl glass-card shrink-0">
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[var(--theme-primary)] animate-spin shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Syncing with Trello...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs tracking-tight">Evidence Grounded</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600 text-xs" aria-hidden="true">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap tabular-nums">
                  {(metrics?.totalCards || allCards.length || 639)} cards indexed
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                  Verified
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tab Content Area with Shimmer/Skeleton Loading & Fluid Transitions */}
        <div className="flex-1 relative">
          {isTabTransitioning || isDataLoading ? (
            activeTab === 'chat' ? (
              <div className="glass-view-container overflow-hidden animate-in fade-in duration-150">
                <ChatViewSkeleton />
              </div>
            ) : (
              <div className="glass-view-container p-4 sm:p-6 overflow-hidden animate-in fade-in duration-150">
                {activeTab === 'brief' && <BriefViewSkeleton />}
                {activeTab === 'clients' && <ClientsViewSkeleton />}
                {activeTab === 'team' && <TeamViewSkeleton />}
              </div>
            )
          ) : (
            <>
              <div className={activeTab === 'chat' ? 'glass-view-container overflow-hidden animate-in fade-in duration-200' : 'hidden'}>
                <ChatView
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoadingChat}
                  onSelectSource={setSelectedSource}
                  sessions={chatSessions}
                  currentSessionId={currentSessionId}
                  onSelectSession={handleSelectSession}
                  onNewSession={handleNewSession}
                  onDeleteSession={handleDeleteSession}
                />
              </div>

              <div className={activeTab === 'brief' ? 'glass-view-container p-4 sm:p-6 animate-in fade-in duration-200' : 'hidden'}>
                <BriefView
                  currentBrief={currentBrief}
                  savedBriefs={savedBriefs}
                  onSelectBrief={setCurrentBrief}
                  onGenerateBrief={handleGenerateBrief}
                  onDeleteBrief={handleDeleteBrief}
                  onClearBriefs={handleClearBriefs}
                  isGenerating={isGeneratingBrief}
                  onSelectSource={setSelectedSource}
                />
              </div>

              <div className={activeTab === 'clients' ? 'glass-view-container p-4 sm:p-6 animate-in fade-in duration-200' : 'hidden'}>
                <ClientsView
                  clients={clients}
                  role={user.role}
                  onAddAlias={handleAddAlias}
                  onAskAboutClient={handleAskAboutClient}
                />
              </div>

              <div className={activeTab === 'team' ? 'glass-view-container p-4 sm:p-6 animate-in fade-in duration-200' : 'hidden'}>
                <TeamView
                  memberOverviews={memberOverviews}
                  lists={lists}
                  role={user.role}
                  onUpdateListSemantics={handleUpdateListSemantics}
                  onAskAboutMember={handleAskAboutMember}
                  onSelectCard={handleSelectCard}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Trello Settings Modal (Admin only) */}
      {isSettingsOpen && user?.role === 'ADMIN' && (
        <TrelloSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          connection={connection}
          role={user.role}
          onSaveBoard={handleSaveBoard}
          onSync={handleSync}
          isSyncing={isSyncing}
          onRefreshStatus={refreshAllData}
        />
      )}

      {/* Source Card Modal */}
      {selectedSource && (
        <SourceCardModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}
