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
      const [statusRes, teamRes, clientsRes, listsRes, briefsRes] = await Promise.all([
        fetchWithAuth('/api/trello/status').then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth('/api/team').then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth('/api/clients').then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth('/api/lists').then((r) => (r.ok ? r.json() : [])),
        fetchWithAuth('/api/management-briefs').then((r) => (r.ok ? r.json() : [])),
      ]);

      if (statusRes) setConnection(statusRes);
      if (teamRes?.metrics) setMetrics(teamRes.metrics);
      if (teamRes?.memberOverviews) setMemberOverviews(teamRes.memberOverviews);
      if (teamRes?.activeCards) setAllCards([...teamRes.activeCards, ...(teamRes.recentCompleted || [])]);
      if (Array.isArray(clientsRes)) setClients(clientsRes);
      if (Array.isArray(listsRes)) setLists(listsRes);
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
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get answer from intelligence engine');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
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

  // Generate Executive Brief
  const handleGenerateBrief = async (
    periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
  ) => {
    if (user?.role === 'VIEWER') {
      showNotification('error', 'Viewers cannot generate management briefs.');
      return;
    }

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

  // Asynchronous Job-Based Trello Synchronization with Polling
  const handleSync = async () => {
    if (user?.role === 'VIEWER') {
      showNotification('error', 'Viewers cannot trigger synchronizations.');
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-medium text-slate-300">
          Verifying security credentials & session...
        </div>
      </div>
    );
  }

  // If unauthenticated, display Supabase Auth screen
  if (!user) {
    return <AuthScreen onAuthenticated={checkAuthAndLoad} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <Header
        connection={connection}
        user={user}
        onSignOut={handleSignOut}
        onSync={handleSync}
        onSeedDemo={handleSeedDemo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSyncing={isSyncing}
        syncPhase={syncPhase}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-lg text-xs font-medium shadow-lg flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-white'
                : 'bg-rose-900 text-white'
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

        {/* View Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-200 mb-6 overflow-x-auto pb-px">
          <button
            id="tab-chat-btn"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Management Assistant</span>
          </button>

          <button
            id="tab-brief-btn"
            onClick={() => setActiveTab('brief')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'brief'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Executive Briefs</span>
          </button>

          <button
            id="tab-clients-btn"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Clients & Initiatives</span>
          </button>

          <button
            id="tab-team-btn"
            onClick={() => setActiveTab('team')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Team Overview</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoadingChat}
              onSelectSource={(src) => setSelectedSource(src)}
            />
          )}

          {activeTab === 'brief' && (
            <BriefView
              brief={currentBrief}
              savedBriefs={savedBriefs}
              onSelectBrief={(b) => setCurrentBrief(b)}
              onGenerateBrief={handleGenerateBrief}
              isGenerating={isGeneratingBrief}
              onSelectCard={(cardId) => {
                const found = allCards.find((c) => c.id === cardId);
                if (found) {
                  setSelectedSource({
                    cardId: found.id,
                    title: found.name,
                    url: found.url,
                    relevance: 100,
                    reason: 'Referenced in executive management brief',
                    date: found.dateLastActivity,
                    client: found.clientCanonical,
                    status: found.statusSemantic,
                    listName: found.listName,
                  });
                }
              }}
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

      {/* Source Card Modal */}
      <SourceCardModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
}
