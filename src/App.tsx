import React, { useState, useEffect } from 'react';
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
import {
  ChatMessage,
  ChatSource,
  ManagementBrief,
  ClientEntity,
  TrelloList,
  TeamMetrics,
  TrelloConnectionStatus,
  UserRole,
  TrelloCard,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'brief' | 'clients' | 'team'>('chat');
  const [role, setRole] = useState<UserRole>('ADMIN');
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
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [statusRes, teamRes, clientsRes, listsRes, briefsRes] = await Promise.all([
        fetch('/api/trello/status').then((r) => r.json()),
        fetch('/api/team').then((r) => r.json()),
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/lists').then((r) => r.json()),
        fetch('/api/management-briefs').then((r) => r.json()),
      ]);

      setConnection(statusRes);
      if (teamRes.metrics) setMetrics(teamRes.metrics);
      if (teamRes.memberOverviews) setMemberOverviews(teamRes.memberOverviews);
      if (teamRes.activeCards) setAllCards([...teamRes.activeCards, ...(teamRes.recentCompleted || [])]);
      if (Array.isArray(clientsRes)) setClients(clientsRes);
      if (Array.isArray(listsRes)) setLists(listsRes);
      if (Array.isArray(briefsRes)) {
        setSavedBriefs(briefsRes);
        if (briefsRes.length > 0 && !currentBrief) {
          setCurrentBrief(briefsRes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Send Chat Message
  const handleSendMessage = async (question: string) => {
    setIsLoadingChat(true);
    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process intelligence query');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } catch (err: any) {
      const errorAssistantMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `### Query Processing Notice\n\n${err.message || 'Unable to complete retrieval'}. Please check if Trello synchronization is active or adjust your query.`,
        evidenceStrength: 'low',
        sources: [],
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Generate Executive Brief
  const handleGenerateBrief = async (
    periodType: 'this_week' | 'last_week' | 'this_month' | 'last_month'
  ) => {
    setIsGeneratingBrief(true);
    try {
      const res = await fetch('/api/management-brief', {
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

  // Synchronize Trello Data
  const handleSync = async () => {
    if (role === 'VIEWER') {
      showNotification('error', 'Viewers cannot trigger synchronizations.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/trello/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      await refreshAllData();
      showNotification('success', data.message || 'Trello data synchronized successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Trello synchronization failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset Demo Data
  const handleSeedDemo = async () => {
    if (role === 'VIEWER') {
      showNotification('error', 'Viewers cannot reset database records.');
      return;
    }

    try {
      const res = await fetch('/api/trello/seed-demo', { method: 'POST' });
      const data = await res.json();
      await refreshAllData();
      showNotification('success', data.message || 'Demo workflow loaded successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reset demo');
    }
  };

  // Switch Role
  const handleRoleChange = async (newRole: UserRole) => {
    setRole(newRole);
    try {
      await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      showNotification('success', `Active session role switched to ${newRole}`);
    } catch (err) {
      console.warn('Role switch network issue');
    }
  };

  // Save Trello Credentials
  const handleSaveConnection = async (
    apiKey: string,
    token: string,
    boardId?: string,
    boardName?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/trello/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, token, boardId, boardName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Connection failed');
      }

      await refreshAllData();
      showNotification('success', 'Connected to live Trello board!');
      return true;
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save Trello connection');
      return false;
    }
  };

  // Add Client Alias
  const handleAddAlias = async (clientId: string, alias: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/aliases`, {
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
      const res = await fetch('/api/lists/semantics', {
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

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <Header
        connection={connection}
        role={role}
        onRoleChange={handleRoleChange}
        onSync={handleSync}
        onSeedDemo={handleSeedDemo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSyncing={isSyncing}
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
            <span>Client Accounts</span>
            {clients.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {clients.length}
              </span>
            )}
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
            <span>Workstreams & List Semantics</span>
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex-1">
          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoadingChat}
              onSelectSource={(source) => setSelectedSource(source)}
            />
          )}

          {activeTab === 'brief' && (
            <BriefView
              currentBrief={currentBrief}
              savedBriefs={savedBriefs}
              onGenerateBrief={handleGenerateBrief}
              onSelectBrief={(brief) => setCurrentBrief(brief)}
              isGenerating={isGeneratingBrief}
              onSelectSource={(source) => setSelectedSource(source)}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              role={role}
              onAddAlias={handleAddAlias}
              onAskAboutClient={handleSelectFilter}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              memberOverviews={memberOverviews}
              lists={lists}
              role={role}
              onUpdateListSemantics={handleUpdateListSemantics}
              onAskAboutPerson={handleSelectFilter}
            />
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <TrelloSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        connection={connection}
        role={role}
        onSaveConnection={handleSaveConnection}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* Source Detail Modal */}
      <SourceCardModal
        source={selectedSource}
        cardDetail={
          selectedSource
            ? allCards.find((c) => c.id === selectedSource.cardId)
            : null
        }
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
}
