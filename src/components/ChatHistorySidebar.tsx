import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  X,
  MessageSquare,
  Check,
  PanelLeftClose,
  Filter,
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
  onToggleDesktop?: () => void;
}

type FilterCategory = 'all' | 'ai' | 'clients' | 'team';

function cleanPreviewSnippet(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/gm, '') // remove markdown headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
    .replace(/\*(.*?)\*/g, '$1') // remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove markdown links
    .replace(/^[-*•]\s+/gm, '') // remove list dashes
    .replace(/`{1,3}.*?`{1,3}/g, '') // remove code blocks
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRelativeTime(dateStr: string): string {
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
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onCloseMobile,
  onToggleDesktop,
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

  // Chronological grouping
  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: ChatSession[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Earlier', items: [] },
    ];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    for (const session of filteredSessions) {
      const timestamp = new Date(session.updatedAt || session.createdAt).getTime();
      if (timestamp >= startOfToday) {
        groups[0].items.push(session);
      } else if (timestamp >= startOfYesterday) {
        groups[1].items.push(session);
      } else if (timestamp >= startOf7Days) {
        groups[2].items.push(session);
      } else {
        groups[3].items.push(session);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredSessions]);

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === sessionId) {
      onDeleteSession(sessionId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(sessionId);
      setTimeout(() => {
        setConfirmDeleteId((curr) => (curr === sessionId ? null : curr));
      }, 4000);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      id="chat-history-sidebar"
      className="w-80 md:w-80 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-all z-20 shadow-xs"
    >
      {/* Top Header: Title, Count, Collapse Affordance */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-850/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-[var(--theme-primary)] flex items-center justify-center font-bold text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Saved Queries</h3>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                ({sessions.length})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            {onToggleDesktop && (
              <button
                type="button"
                onClick={onToggleDesktop}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Drawer Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Clean, High-Contrast New Inquiry CTA Button */}
        <button
          type="button"
          id="sidebar-new-query-btn"
          onClick={() => {
            onNewSession();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 active:scale-[0.99] rounded-xl transition-all shadow-xs cursor-pointer group border border-transparent dark:border-slate-700"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--theme-primary)] group-hover:rotate-90 transition-transform duration-200" />
            <span>New Inquiry</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">Fresh</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queries and answers..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Clean Segmented Filter Bar */}
        <div className="grid grid-cols-4 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-[10.5px]">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'ai', label: 'AI' },
              { key: 'clients', label: 'Clients' },
              { key: 'team', label: 'Team' },
            ] as { key: FilterCategory; label: string }[]
          ).map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`py-1 rounded-md font-medium text-center transition-all cursor-pointer truncate ${
                activeCategory === cat.key
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chronologically Grouped Session List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <Search className="w-4 h-4 opacity-50" />
            </div>
            <p className="text-xs font-semibold text-slate-900">
              {searchQuery ? 'No matching inquiries' : 'No query history'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              {searchQuery
                ? `No past sessions match "${searchQuery}".`
                : 'Ask a question above to start recording insights.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.label}
              </div>

              {group.items.map((session) => {
                const isSelected = currentSessionId === session.id;
                const assistantMsg = session.messages?.find((m) => m.role === 'assistant');
                const rawSnippet =
                  assistantMsg?.summary ||
                  assistantMsg?.keyPoints?.[0] ||
                  assistantMsg?.content ||
                  '';
                const cleanSnippet = cleanPreviewSnippet(rawSnippet) || 'Intelligence session recorded.';
                const sourcesCount = assistantMsg?.sources?.length || 0;
                const isConfirming = confirmDeleteId === session.id;

                return (
                  <div
                    key={session.id}
                    id={`session-item-${session.id}`}
                    onClick={() => {
                      onSelectSession(session.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`group relative p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-violet-50/90 text-slate-900 ring-1 ring-violet-200/90 shadow-2xs'
                        : 'hover:bg-slate-100/70 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {/* Left Accent indicator for selected */}
                    {isSelected && (
                      <div className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-violet-600" />
                    )}

                    <div className={isSelected ? 'pl-2' : ''}>
                      {/* Top Row: Title & Relative Time */}
                      <div className="flex items-start justify-between gap-1.5 mb-0.5">
                        <h4
                          className={`text-xs leading-snug line-clamp-1 transition-colors ${
                            isSelected ? 'font-bold text-violet-950' : 'font-semibold text-slate-800 group-hover:text-slate-950'
                          }`}
                        >
                          {session.title || 'Untitled Query'}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium tabular-nums pt-0.5">
                          {formatRelativeTime(session.updatedAt || session.createdAt)}
                        </span>
                      </div>

                      {/* Clean 1-Line Preview Snippet */}
                      <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal mb-1.5">
                        {cleanSnippet}
                      </p>

                      {/* Bottom Row: Metadata (Unboxed) + Quick Delete */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                        <span className="truncate">
                          {sourcesCount > 0 ? `${sourcesCount} sources verified` : 'Grounded inquiry'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isConfirming ? (
                            <div className="flex items-center gap-1 bg-white border border-rose-200 rounded-md px-1.5 py-0.5 shadow-2xs animate-in fade-in duration-100">
                              <span className="text-[9.5px] font-semibold text-rose-700">Delete?</span>
                              <button
                                type="button"
                                id={`delete-session-${session.id}`}
                                onClick={(e) => handleDelete(e, session.id)}
                                className="text-rose-700 hover:text-rose-900 font-bold p-0.5 hover:bg-rose-50 rounded cursor-pointer"
                                title="Confirm deletion"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelDelete}
                                className="text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`delete-session-${session.id}`}
                              onClick={(e) => handleDelete(e, session.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete inquiry"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Clean Bottom Footer: Quiet Grounding Indicator */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Trello Grounded</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium tabular-nums">
          {filteredSessions.length} saved
        </span>
      </div>
    </aside>
  );
};
