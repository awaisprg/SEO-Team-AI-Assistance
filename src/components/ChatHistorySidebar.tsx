import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Clock,
  Trash2,
  Sparkles,
  ChevronRight,
  Layers,
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

type FilterCategory = 'all' | 'ai' | 'clients' | 'team';

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered sessions based on search and category
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter((session) => {
      const messages = Array.isArray(session.messages) ? session.messages : [];

      // 1. Text search across title, user prompt, and assistant answers
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = session.title?.toLowerCase().includes(q);
        const matchesMessages = messages.some((m) =>
          m.content?.toLowerCase().includes(q) ||
          m.summary?.toLowerCase().includes(q) ||
          m.keyPoints?.some((kp) => kp.toLowerCase().includes(q))
        );
        if (!matchesTitle && !matchesMessages) {
          return false;
        }
      }

      // 2. Category filter
      if (activeCategory === 'ai') {
        const isAi =
          session.title?.toLowerCase().includes('ai') ||
          messages.some((m) =>
            m.content?.toLowerCase().includes('ai') ||
            m.content?.toLowerCase().includes('overview') ||
            m.content?.toLowerCase().includes('generative')
          );
        if (!isAi) return false;
      } else if (activeCategory === 'clients') {
        const isClient =
          session.title?.toLowerCase().includes('client') ||
          session.title?.toLowerCase().includes('precision') ||
          session.title?.toLowerCase().includes('podiatry') ||
          messages.some((m) =>
            m.sources?.some((s) => Boolean(s.client)) ||
            m.content?.toLowerCase().includes('client') ||
            m.content?.toLowerCase().includes('account')
          );
        if (!isClient) return false;
      } else if (activeCategory === 'team') {
        const isTeam =
          session.title?.toLowerCase().includes('team') ||
          session.title?.toLowerCase().includes('accomplish') ||
          session.title?.toLowerCase().includes('week') ||
          messages.some((m) =>
            m.content?.toLowerCase().includes('sprint') ||
            m.content?.toLowerCase().includes('accomplish') ||
            m.content?.toLowerCase().includes('team')
          );
        if (!isTeam) return false;
      }

      return true;
    });
  }, [sessions, searchQuery, activeCategory]);

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === sessionId) {
      onDeleteSession(sessionId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(sessionId);
      setTimeout(() => setConfirmDeleteId(null), 3500);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      id="chat-history-sidebar"
      className="w-80 md:w-84 shrink-0 bg-slate-50/80 border-r border-slate-200/80 flex flex-col h-full overflow-hidden transition-all z-20"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 text-violet-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-none">Query Archive</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {sessions.length} saved intelligence session{sessions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* New Query CTA Button */}
        <button
          type="button"
          id="sidebar-new-query-btn"
          onClick={() => {
            onNewSession();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] active:from-[#572FD6] active:to-[#461EC6] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>New Intelligence Query</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past queries, topics, answers..."
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#7C52F5] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'ai', label: 'AI Overviews' },
              { key: 'clients', label: 'Clients' },
              { key: 'team', label: 'Team/Sprints' },
            ] as { key: FilterCategory; label: string }[]
          ).map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-violet-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <Search className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-bold text-slate-900">
              {searchQuery ? 'No matching queries' : 'No query history'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {searchQuery
                ? `No past queries or insights contain "${searchQuery}".`
                : 'Send your first question in the assistant to archive insights here.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-semibold text-[#7C52F5] hover:underline cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = currentSessionId === session.id;
            const assistantMsg = session.messages?.find((m) => m.role === 'assistant');
            const summarySnippet =
              assistantMsg?.summary ||
              assistantMsg?.keyPoints?.[0] ||
              assistantMsg?.content?.slice(0, 110) ||
              'Intelligence session recorded.';
            const sourcesCount = assistantMsg?.sources?.length || 0;
            const evidenceStrength = assistantMsg?.evidenceStrength;

            return (
              <div
                key={session.id}
                id={`session-item-${session.id}`}
                onClick={() => {
                  onSelectSession(session.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white border-[#7C52F5] shadow-xs ring-1 ring-[#7C52F5]/30'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-violet-300 shadow-2xs'
                }`}
              >
                {/* Title and Time */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4
                    className={`text-xs font-semibold line-clamp-2 leading-snug transition-colors ${
                      isSelected ? 'text-[#7C52F5]' : 'text-slate-800 group-hover:text-slate-950'
                    }`}
                  >
                    {session.title || 'Untitled Query'}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                    {formatRelativeTime(session.updatedAt || session.createdAt)}
                  </span>
                </div>

                {/* Insight Snippet */}
                <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                  {summarySnippet}
                </p>

                {/* Badges & Meta */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    {evidenceStrength && (
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                          evidenceStrength === 'high'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : evidenceStrength === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        {evidenceStrength}
                      </span>
                    )}
                    {sourcesCount > 0 && (
                      <span className="text-slate-500 font-medium flex items-center">
                        <Layers className="w-2.5 h-2.5 mr-0.5 text-[#7C52F5]" />
                        {sourcesCount} source{sourcesCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    id={`delete-session-${session.id}`}
                    onClick={(e) => handleDelete(e, session.id)}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      confirmDeleteId === session.id
                        ? 'opacity-100 text-rose-700 bg-rose-50 font-bold px-1.5'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100'
                    }`}
                    title={confirmDeleteId === session.id ? 'Click again to confirm delete' : 'Delete session from history'}
                  >
                    {confirmDeleteId === session.id ? (
                      <span className="text-[10px]">Confirm?</span>
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info bar */}
      <div className="p-2.5 bg-white border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-[#7C52F5]" />
          <span>Grounded Trello Evidence</span>
        </div>
        <span className="font-semibold text-slate-700">{filteredSessions.length} visible</span>
      </div>
    </aside>
  );
};
