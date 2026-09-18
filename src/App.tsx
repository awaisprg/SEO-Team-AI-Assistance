import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { ChatView } from './components/ChatView';
import { BriefView } from './components/BriefView';
import { ClientsView } from './components/ClientsView';
import { TeamView } from './components/TeamView';
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

  const syncPollInterval = useRef<any>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Check auth session
  const checkAuthAndLoad = async () => {
    setIsCheckingAuth(true);
    await initSupabaseClient();
    const session = await getCurrentUserSession();
    if (session) {
      setUser(session);
      await refreshAllData();
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
      if (Array.isArray(sessionsRes)) {
        setChatSessions(sessionsRes);
        if (sessionsRes.length > 0 && !currentSessionId && messages.length === 0) {
          setCurrentSessionId(sessionsRes[0].id);
          setMessages(sessionsRes[0].messages || []);
        }
      }
      if (Array.isArray(briefsRes)) {
        setSavedBriefs(briefsRes);
        if (briefsRes.length > 0 && !currentBrief) {
          setCurrentBrief(briefsRes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      await sb.auth.signOut().catch(() => {});
    }
    localStorage.removeItem('supabase_auth_token');
    localStorage.removeItem('demo_auth_token');
    setUser(null);
    setConnection(null);
    setMessages([]);
    showNotification('success', 'You have been signed out.');
  };

  // Send Chat Message
  const handleSendMessage = async (question: string) => {
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
        body: JSON.stringify({ question, sessionId: currentSessionId }),
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
          if (Array.isArray(updated)) setChatSessions(updated);
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
  };

  // Select a session from history
  const handleSelectSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages || []);
      setActiveTab('chat');
    }
  };

  // Start a fresh intelligence query
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setActiveTab('chat');
  };

  // Delete a session from history archive
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetchWithAuth(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
        showNotification('success', 'Query removed from archive.');
      }
    } catch (err) {
      showNotification('error', 'Failed to remove query session.');
    }
  };

  // Generate Executive Brief
  const handleGenerateBrief = async (
    periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
  ) => {
    setIsGeneratingBrief(true);
    try {
      const res = await fetchWithAuth('/api/management-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodType }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate brief');
      }

      const brief: ManagementBrief = await res.json();
      setCurrentBrief(brief);
      setSavedBriefs((prev) => [brief, ...prev.filter((b) => b.id !== brief.id)]);
      showNotification('success', `Executive Brief for ${brief.title} generated successfully.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to generate brief');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // Asynchronous Job-Based Trello Synchronization with Polling (Admin only)
  const handleSync = async () => {
    if (user?.role !== 'ADMIN') {
      showNotification('error', 'Only Administrators can trigger synchronizations.');
      return;
    }

    if (isSyncing) return;

    setIsSyncing(true);
    setSyncPhase('Initiating background sync...');

    try {
      const res = await fetchWithAuth('/api/trello/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: connection?.boardId }),
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
  };

  // Reset Demo Data
  const handleSeedDemo = async () => {
    if (user?.role !== 'ADMIN') {
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
  };

  // Save Trello Active Board (Zero secrets sent)
  const handleSaveBoard = async (boardId: string, boardName?: string): Promise<boolean> => {
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
  };

  // Add Client Alias
  const handleAddAlias = async (clientId: string, alias: string) => {
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
  };

  // Update List Semantics
  const handleUpdateListSemantics = async (
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
  };

  // Helper when clicking a KPI or chip to ask Assistant
  const handleSelectFilter = (prompt: string) => {
    setActiveTab('chat');
    handleSendMessage(prompt);
  };

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
    <div className="min-h-screen bg-[#F8F8FC] text-[#27272B] flex flex-col font-sans selection:bg-[#8963FB]/20 selection:text-[#2F20A2]">
      {/* Top Header */}
      <Header
        connection={connection}
        user={user}
        onSignOut={handleSignOut}
        onSync={handleSync}
        onSeedDemo={handleSeedDemo}
        onOpenSettings={() => {
          if (user?.role === 'ADMIN') setIsSettingsOpen(true);
        }}
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
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        {/* KPI Strip */}
        <MetricsBar metrics={metrics} onSelectFilter={handleSelectFilter} />

        {/* View Navigation Tabs & Live Engine Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <nav className="inline-flex p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 shadow-2xs gap-1 overflow-x-auto max-w-full">
            <button
              id="tab-chat-btn"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'chat' ? 'text-[#7C52F5]' : 'text-slate-400'}`} />
              <span>Management Assistant</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  activeTab === 'chat' ? 'bg-violet-50 text-violet-700 border border-violet-200/60' : 'bg-slate-200 text-slate-600'
                }`}
              >
                AI
              </span>
            </button>

            <button
              id="tab-brief-btn"
              onClick={() => setActiveTab('brief')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                activeTab === 'brief'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${activeTab === 'brief' ? 'text-[#7C52F5]' : 'text-slate-400'}`} />
              <span>Executive Briefs</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  activeTab === 'brief' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-200 text-slate-600'
                }`}
              >
                PDF
              </span>
            </button>

            <button
              id="tab-clients-btn"
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                activeTab === 'clients'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'clients' ? 'text-[#7C52F5]' : 'text-slate-400'}`} />
              <span>Clients & Initiatives</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  activeTab === 'clients' ? 'bg-violet-50 text-violet-700 border border-violet-200/60' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {clients.length}
              </span>
            </button>

            <button
              id="tab-team-btn"
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                activeTab === 'team'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === 'team' ? 'text-[#7C52F5]' : 'text-slate-400'}`} />
              <span>Team Overview</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  activeTab === 'team' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {memberOverviews.length || '3'}
              </span>
            </button>
          </nav>

          {/* Right Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800">Evidence Grounded</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">639 Cards & 515 Comments Indexed</span>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoadingChat}
              onSelectSource={(src) => setSelectedSource(src)}
              sessions={chatSessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'brief' && (
            <BriefView
              currentBrief={currentBrief}
              savedBriefs={savedBriefs}
              onSelectBrief={(b) => setCurrentBrief(b)}
              onGenerateBrief={handleGenerateBrief}
              isGenerating={isGeneratingBrief}
              onSelectSource={(source) => setSelectedSource(source)}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              role={user.role}
              onAddAlias={handleAddAlias}
              onAskAboutClient={(name) => {
                setActiveTab('chat');
                handleSendMessage(`Give me a detailed workstream update for client ${name}`);
              }}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              memberOverviews={memberOverviews}
              lists={lists}
              role={user.role}
              onUpdateListSemantics={handleUpdateListSemantics}
              onAskAboutMember={(name) => {
                setActiveTab('chat');
                handleSendMessage(`What is ${name} currently working on and what was recently completed?`);
              }}
              onSelectCard={(card) => {
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
              }}
            />
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
