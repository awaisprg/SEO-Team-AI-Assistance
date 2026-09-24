import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Sparkles,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowRight,
  History,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  CornerDownLeft,
  CheckCircle2,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  X,
  PauseCircle,
  Activity,
  BarChart3,
  Users,
  Briefcase,
  Zap,
} from 'lucide-react';
import { ChatMessage, ChatSource, ChatSession } from '../types';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { downloadChatSummaryPDF } from '../utils/pdfGenerator';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  onSelectSource: (source: ChatSource) => void;
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export interface PromptSuggestionItem {
  id: string;
  category: 'Clients' | 'Tasks' | 'Team' | 'AI & SEO' | 'Executive';
  text: string;
  badge: string;
  desc?: string;
}

export const CATEGORIZED_PROMPT_SUGGESTIONS: PromptSuggestionItem[] = [
  // Clients (from Clients frontpage tab & metrics)
  {
    id: 'c1',
    category: 'Clients',
    text: 'Which clients are currently on hold and why?',
    badge: 'On Hold',
    desc: 'Audit client accounts awaiting feedback, onboarding, or client deliverables',
  },
  {
    id: 'c2',
    category: 'Clients',
    text: 'Break down active clients between PDS and GFM',
    badge: 'PDS vs GFM',
    desc: 'Portfolio split and active account distribution across agencies',
  },
  {
    id: 'c3',
    category: 'Clients',
    text: 'Which client accounts are closed or terminated?',
    badge: 'Closed',
    desc: 'Review discontinued client retainers and completed engagements',
  },
  {
    id: 'c4',
    category: 'Clients',
    text: 'What is happening with Precision Podiatry right now?',
    badge: 'Client Deep Dive',
    desc: 'Active sprint deliverables, recent updates, and checklist progress',
  },
  {
    id: 'c5',
    category: 'Clients',
    text: 'What is the current status of high-priority client accounts?',
    badge: 'Priority',
    desc: 'Check progress on high-tier client deliverables and upcoming deadlines',
  },
  {
    id: 'c6',
    category: 'Clients',
    text: 'Show all active client accounts being worked on for PDS and GFM',
    badge: 'Active Clients',
    desc: 'Comprehensive view of all in-flight client accounts across both boards',
  },

  // Tasks & Delivery (from Tasks metrics)
  {
    id: 't1',
    category: 'Tasks',
    text: 'What tasks is the team actively working on right now?',
    badge: 'Active Tasks',
    desc: 'In-progress cards, sprint tasks, and current deliverables across boards',
  },
  {
    id: 't2',
    category: 'Tasks',
    text: 'What items are currently in QA review or awaiting approval?',
    badge: 'QA Review',
    desc: 'Cards pending quality assurance check and manager sign-off',
  },
  {
    id: 't3',
    category: 'Tasks',
    text: 'What tasks did the team complete recently?',
    badge: 'Completed',
    desc: 'Finished deliverables, resolved tickets, and closed checklist items',
  },
  {
    id: 't4',
    category: 'Tasks',
    text: 'Are there any delayed or blocked client items?',
    badge: 'Blockers',
    desc: 'Flag cards stuck in review, awaiting client inputs, or past due dates',
  },

  // Workload & Team (from Team frontpage tab)
  {
    id: 'w1',
    category: 'Team',
    text: 'Which team members have the heaviest active workload?',
    badge: 'Capacity',
    desc: 'Team card assignment distribution and current bandwidth analysis',
  },
  {
    id: 'w2',
    category: 'Team',
    text: 'Show workload and recent accomplishments for Awais Tahir',
    badge: 'Awais Tahir',
    desc: 'Assigned cards, activity feed, and deliverable completions for Awais',
  },
  {
    id: 'w3',
    category: 'Team',
    text: 'Show workload and active tasks for Sarah Connor',
    badge: 'Sarah Connor',
    desc: 'Assigned cards, activity feed, and deliverable completions for Sarah',
  },
  {
    id: 'w4',
    category: 'Team',
    text: 'What did the team accomplish this week?',
    badge: 'Accomplishments',
    desc: 'Sprint retrospective and major deliverables checked off this week',
  },

  // AI & SEO Initiatives (from AI badge & Executive Briefs)
  {
    id: 'a1',
    category: 'AI & SEO',
    text: 'What are we doing with AI Overviews and GEO?',
    badge: 'AI Overviews',
    desc: 'Generative search optimization, team experiments, and strategy',
  },
  {
    id: 'a2',
    category: 'AI & SEO',
    text: 'What AI productivity tools have been tested by the team?',
    badge: 'AI Tools',
    desc: 'Internal AI tooling trials, workflows, and prompts evaluated',
  },
  {
    id: 'a3',
    category: 'AI & SEO',
    text: 'What content and SEO experiments were conducted recently?',
    badge: 'Experiments',
    desc: 'Structured data experiments, organic tests, and pilot campaigns',
  },

  // Executive Management (from Executive Briefs tab)
  {
    id: 'e1',
    category: 'Executive',
    text: 'What can I tell senior management about our progress?',
    badge: 'Executive',
    desc: 'High-level executive briefing synthesized directly from verified cards',
  },
  {
    id: 'e2',
    category: 'Executive',
    text: 'Show me an overview of all tracked initiatives across the board',
    badge: 'Board Overview',
    desc: 'Snapshot of all active workstreams, list distributions, and metrics',
  },
];

const ChatViewComponent: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onSelectSource,
  sessions = [],
  currentSessionId = null,
  onSelectSession = () => {},
  onNewSession = () => {},
  onDeleteSession = () => {},
}) => {
  const [input, setInput] = useState('');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions scroll and filter state
  const promptScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [showAllSuggestionsDropdown, setShowAllSuggestionsDropdown] = useState(false);
  const [popoverSearch, setPopoverSearch] = useState('');

  // Handle escape key to dismiss questions modal and manage body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAllSuggestionsDropdown) {
        setShowAllSuggestionsDropdown(false);
      }
    };
    if (showAllSuggestionsDropdown) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showAllSuggestionsDropdown]);

  const checkScroll = () => {
    if (promptScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = promptScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    const el = promptScrollRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [activeCategoryFilter]);

  const scrollPrompts = (direction: 'left' | 'right') => {
    if (promptScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      promptScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const filteredPrompts = useMemo(() => {
    return activeCategoryFilter === 'All'
      ? CATEGORIZED_PROMPT_SUGGESTIONS
      : CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  const categoriesWithCounts = useMemo(() => {
    return [
      { name: 'All', count: CATEGORIZED_PROMPT_SUGGESTIONS.length },
      { name: 'Clients', count: CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === 'Clients').length },
      { name: 'Tasks', count: CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === 'Tasks').length },
      { name: 'Team', count: CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === 'Team').length },
      { name: 'AI & SEO', count: CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === 'AI & SEO').length },
      { name: 'Executive', count: CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === 'Executive').length },
    ];
  }, []);

  const popoverPrompts = useMemo(() => {
    return CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => {
      const matchCat = activeCategoryFilter === 'All' || p.category === activeCategoryFilter;
      const q = popoverSearch.toLowerCase().trim();
      if (!q) return matchCat;
      const matchSearch =
        p.text.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        Boolean(p.desc && p.desc.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [activeCategoryFilter, popoverSearch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const activeSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div
      id="chat-view"
      className="flex h-[calc(100vh-14.5rem)] bg-white/95 backdrop-blur-xl overflow-hidden relative"
    >
      {/* Mobile Sidebar Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ChatHistorySidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
          isOpen={true}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />
      </div>

      {/* Desktop Persistent / Toggleable Sidebar */}
      <div className="hidden md:block h-full">
        <ChatHistorySidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
          isOpen={isSidebarOpen}
          onToggleDesktop={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/40">
        {/* Top Control Bar with Sidebar Toggle & Prompts Strip */}
        <div className="relative z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Desktop Toggle Button */}
            <button
              type="button"
              id="desktop-toggle-history-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
              title={isSidebarOpen ? 'Collapse query history' : 'Open query history'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5 text-[#7C52F5] group-hover:scale-105 transition-transform" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#7C52F5] group-hover:scale-105 transition-transform" />
              )}
              <span>{isSidebarOpen ? 'Sidebar' : 'History'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold border border-violet-100">
                {sessions.length}
              </span>
            </button>

            {/* Mobile Open Drawer Button */}
            <button
              type="button"
              id="mobile-toggle-history-btn"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-200 text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#7C52F5]" />
              <span>Archive ({sessions.length})</span>
            </button>
          </div>

          {/* Prompt Suggestions Strip with Scroll Controls */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end relative">
            <span className="text-slate-400 font-medium whitespace-nowrap hidden lg:flex items-center shrink-0 pr-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#7C52F5]" />
              Suggested:
            </span>

            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => scrollPrompts('left')}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              title="Scroll suggestions left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scrollable Prompts Container */}
            <div
              ref={promptScrollRef}
              onScroll={checkScroll}
              className="flex items-center space-x-1.5 overflow-x-auto scroll-smooth scrollbar-none text-xs py-0.5 max-w-full"
            >
              {filteredPrompts.map((item) => (
                <button
                  key={item.id}
                  id={`prompt-chip-${item.id}`}
                  onClick={() => onSendMessage(item.text)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-violet-50/70 text-slate-700 hover:text-violet-700 border border-slate-200/90 hover:border-violet-300 whitespace-nowrap font-medium transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0 text-[11px] group"
                >
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-[#7C52F5] tracking-tight">
                    {item.badge} ·
                  </span>
                  <span className="group-hover:translate-x-0.5 transition-transform">{item.text}</span>
                </button>
              ))}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => scrollPrompts('right')}
              disabled={!canScrollRight}
              className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              title="Scroll suggestions right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* View All Questions Modal Trigger */}
            <button
              type="button"
              id="view-all-prompts-btn"
              onClick={() => setShowAllSuggestionsDropdown(true)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 ${
                showAllSuggestionsDropdown
                  ? 'bg-violet-50 text-[#7C52F5] border-violet-200 ring-2 ring-violet-500/20'
                  : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title="Open full executive question library"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#7C52F5]" />
              <span className="text-[11px] font-medium hidden sm:inline">All Questions</span>
            </button>
          </div>
        </div>

        {/* Executive Question Library Modal (Portal to body: completely immune to stacking context & overflow clipping) */}
        {showAllSuggestionsDropdown &&
          createPortal(
            <div
              id="all-questions-modal-overlay"
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAllSuggestionsDropdown(false);
                }
              }}
            >
              <div
                id="all-questions-library-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-modal-title"
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-[#7C52F5] border border-violet-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 id="library-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                          Executive Question Library
                        </h3>
                        <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200/60">
                          {popoverPrompts.length} questions
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pre-configured queries verified against live Trello sprint boards & deliverables
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="close-questions-library-btn"
                    onClick={() => setShowAllSuggestionsDropdown(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Close question library (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Controls: Search & Category Tabs */}
                <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      id="library-search-input"
                      value={popoverSearch}
                      onChange={(e) => setPopoverSearch(e.target.value)}
                      placeholder="Filter by keyword (e.g. 'Precision Podiatry', 'GEO', 'QA', 'workload')..."
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10 transition-all"
                      autoFocus
                    />
                    {popoverSearch && (
                      <button
                        type="button"
                        onClick={() => setPopoverSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {categoriesWithCounts.map(({ name, count }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setActiveCategoryFilter(name)}
                        className={`px-3 py-1 rounded-lg font-medium text-xs whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                          activeCategoryFilter === name
                            ? 'bg-[#7C52F5] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                        }`}
                      >
                        <span>{name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                            activeCategoryFilter === name
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 max-h-[48vh]">
                  {popoverPrompts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="font-semibold text-slate-600">No matching questions found</p>
                      <p className="text-[11px] mt-1 text-slate-400">
                        Try searching for a different keyword or select the "All" category filter.
                      </p>
                    </div>
                  ) : (
                    popoverPrompts.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 px-3 rounded-xl hover:bg-violet-50/60 transition-colors group cursor-pointer flex items-center justify-between gap-3"
                        onClick={() => {
                          onSendMessage(item.text);
                          setShowAllSuggestionsDropdown(false);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200/60 px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#7C52F5] transition-colors leading-snug">
                            {item.text}
                          </h4>
                          {item.desc && (
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-1">
                              {item.desc}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="text-xs font-semibold text-[#7C52F5] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                            Query
                          </span>
                          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[#7C52F5] text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Select any query to run instant AI synthesis with citations</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllSuggestionsDropdown(false)}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Active Session Context Banner */}
        {activeSession && messages.length > 0 && (
          <div className="bg-violet-50/70 border-b border-violet-100 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center space-x-2 text-violet-900 truncate">
              <History className="w-3.5 h-3.5 text-[#7C52F5] shrink-0" />
              <span className="font-semibold truncate">
                Active Inquiry: <span className="font-medium text-slate-900">{activeSession.title}</span>
              </span>
              <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                • {new Date(activeSession.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              type="button"
              onClick={onNewSession}
              className="text-[11px] font-bold text-[#7C52F5] hover:text-[#683EE6] cursor-pointer whitespace-nowrap ml-2 hover:underline"
            >
              + New Session
            </button>
          </div>
        )}

        {/* Messages Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && (
            <div className="relative flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-6 sm:py-8 px-2 sm:px-4">
              {/* Luminous Ambient Glow Background */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 sm:w-96 h-36 bg-gradient-to-b from-violet-200/40 via-indigo-100/20 to-transparent blur-3xl pointer-events-none rounded-full" />

              {/* Eyebrow Capsule */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50/90 border border-violet-200/70 text-violet-700 text-[11px] font-semibold tracking-wide mb-3 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#7C52F5]" />
                <span>Executive Intelligence • Verified Trello Workstreams</span>
              </div>

              {/* Center Hero Icon */}
              <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 text-white flex items-center justify-center mb-3.5 shadow-[0_8px_20px_-4px_rgba(124,82,245,0.35)] ring-4 ring-violet-500/10 border border-violet-400/20 group hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-violet-200" />
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
                SEO & Content Team <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Executive Intelligence</span>
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-lg">
                Query active workstreams, strategic AI Overviews, client deliverables, or team accomplishments. Every response is grounded directly in real Trello cards with verifiable source links.
              </p>

              {/* 6 High-Fidelity Insight Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full text-left">
                {[
                  {
                    title: 'On Hold Clients & Reasons',
                    prompt: 'Which clients are currently on hold and why?',
                    desc: 'Review accounts awaiting feedback, onboarding, or client input',
                    icon: PauseCircle,
                    badge: 'On Hold',
                    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/70',
                    iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
                    accentHover: 'hover:border-amber-300',
                  },
                  {
                    title: 'Active Workstreams & QA',
                    prompt: 'What tasks is the team actively working on right now?',
                    desc: 'Current in-progress cards and deliverables across all boards',
                    icon: Activity,
                    badge: 'In Progress',
                    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200/70',
                    iconBg: 'bg-violet-50 text-violet-600 border-violet-200/80',
                    accentHover: 'hover:border-violet-300',
                  },
                  {
                    title: 'PDS & GFM Distribution',
                    prompt: 'Break down active clients between PDS and GFM',
                    desc: 'Portfolio balance and active work distribution across agencies',
                    icon: BarChart3,
                    badge: 'Portfolio',
                    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200/70',
                    iconBg: 'bg-sky-50 text-sky-600 border-sky-200/80',
                    accentHover: 'hover:border-sky-300',
                  },
                  {
                    title: 'AI Overviews & GEO',
                    prompt: 'What are we doing with AI Overviews and GEO?',
                    desc: 'Generative search optimization, research & team experiments',
                    icon: Zap,
                    badge: 'Search AI',
                    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
                    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
                    accentHover: 'hover:border-indigo-300',
                  },
                  {
                    title: 'Team Workload & Capacity',
                    prompt: 'Which team members have the heaviest active workload?',
                    desc: 'Workload distribution, card assignments, and bandwidth',
                    icon: Users,
                    badge: 'Capacity',
                    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
                    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
                    accentHover: 'hover:border-emerald-300',
                  },
                  {
                    title: 'Senior Management Brief',
                    prompt: 'What can I tell senior management about our progress?',
                    desc: 'Executive summaries, completed milestones & team highlights',
                    icon: Briefcase,
                    badge: 'Executive',
                    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200/80',
                    iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
                    accentHover: 'hover:border-slate-400',
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      id={`empty-prompt-btn-${idx}`}
                      onClick={() => onSendMessage(item.prompt)}
                      className={`group p-4 rounded-2xl border border-slate-200/85 bg-white/90 hover:bg-white ${item.accentHover} hover:shadow-[0_10px_25px_-5px_rgba(124,82,245,0.12)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden text-left`}
                    >
                      {/* Top Row: Icon & Tag */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${item.iconBg} shadow-2xs group-hover:scale-105 transition-transform`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-violet-600 transition-colors">
                            {item.badge}
                          </span>
                        </div>

                        {/* Title & Desc */}
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors mb-1.5 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-[#7C52F5] transition-colors">
                        <span>Query Insight</span>
                        <div className="w-5 h-5 rounded-full bg-slate-50 group-hover:bg-violet-50 border border-slate-200/60 group-hover:border-violet-200 flex items-center justify-center transition-all">
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              id={`message-${msg.id}`}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-2xl bg-[#09061A] text-slate-50 px-4.5 py-3 rounded-2xl rounded-tr-xs text-sm shadow-xs font-medium leading-relaxed border border-slate-800">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full max-w-4xl space-y-3">
                  {/* Assistant Answer Box */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs hover:border-violet-200 transition-colors">
                    {/* Header: Strength Badge + Download PDF action */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#09061A] to-[#7C52F5] text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
                          GF
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wider">
                          Executive Synthesis
                        </span>
                        {msg.evidenceStrength && (
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              msg.evidenceStrength === 'high'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                : msg.evidenceStrength === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                            }`}
                          >
                            {msg.evidenceStrength} Confidence
                          </span>
                        )}
                      </div>

                      <button
                        id={`download-pdf-msg-${msg.id}`}
                        onClick={() => {
                          // Find the specific user query that triggered this exact assistant answer
                          const msgIndex = messages.findIndex((m) => m.id === msg.id);
                          let queryTitle = '';
                          if (msgIndex > 0) {
                            for (let j = msgIndex - 1; j >= 0; j--) {
                              if (messages[j].role === 'user') {
                                queryTitle = messages[j].content;
                                break;
                              }
                            }
                          }
                          if (!queryTitle) {
                            queryTitle = activeSession?.title || 'Executive Intelligence Response';
                          }
                          downloadChatSummaryPDF(msg, queryTitle);
                        }}
                        className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer px-2.5 py-1.5 rounded-lg shadow-2xs font-semibold"
                        title="Download executive intelligence response as PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#7C52F5]" />
                        <span>Export PDF</span>
                      </button>
                    </div>

                    {/* Status Breakdown Strip (if available) */}
                    {msg.statusBreakdown && Object.keys(msg.statusBreakdown).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-900 mr-1">Status Distribution:</span>
                        {Object.entries(msg.statusBreakdown).map(([status, count]) => (
                          <span
                            key={status}
                            className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs"
                          >
                            {status}: <strong className="ml-1 text-slate-900">{count}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Markdown Answer Body */}
                    <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans">
                      <div
                        className="whitespace-pre-wrap text-sm space-y-2.5 text-slate-800"
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdownForDisplay(msg.content),
                        }}
                      />
                    </div>

                    {/* Evidence Drawer */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          id={`toggle-sources-${msg.id}`}
                          onClick={() => toggleSources(msg.id)}
                          className="flex items-center justify-between w-full text-xs font-semibold text-slate-800 hover:text-[#7C52F5] py-1 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#7C52F5]" />
                            <span>
                              Verified Trello Sources ({msg.sources.length} Cards)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-slate-400 font-medium text-[11px]">
                            <span>{expandedSources[msg.id] ? 'Hide' : 'Inspect Cards'}</span>
                            {expandedSources[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3 pt-2">
                            {msg.sources.map((src, i) => (
                              <div
                                key={i}
                                id={`source-card-${msg.id}-${i}`}
                                onClick={() => onSelectSource(src)}
                                className="bg-slate-50/70 hover:bg-violet-50/30 p-3 rounded-xl border border-slate-200 hover:border-violet-300 transition-all text-xs cursor-pointer shadow-2xs hover:shadow-xs group"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <span className="font-semibold text-slate-900 group-hover:text-[#7C52F5] line-clamp-1">
                                    {src.title}
                                  </span>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#7C52F5] hover:text-white bg-violet-50 hover:bg-[#7C52F5] px-1.5 py-0.5 rounded transition-colors shrink-0"
                                    title="Open in Trello"
                                  >
                                    <span>Trello</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-600">
                                    List: {src.listName}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                                    {src.status}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {src.relevance}% match
                                  </span>
                                </div>
                                {src.snippet && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-white p-2 rounded-lg border border-slate-100">
                                    "{src.snippet}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3 max-w-3xl animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C52F5] to-[#683EE6] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-4 h-4 animate-spin text-white" />
              </div>
              <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#7C52F5]">
                    Synthesizing intelligence...
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Indexing Trello cards, checklists & team activities
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded shimmer-box" />
                  <div className="h-3.5 w-5/6 rounded shimmer-box" />
                  <div className="h-3.5 w-3/4 rounded shimmer-box" />
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="h-9 w-40 rounded-lg shimmer-box" />
                  <div className="h-9 w-48 rounded-lg shimmer-box" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shrink-0">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center gap-2.5 bg-slate-50/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 focus-within:bg-white dark:focus-within:bg-slate-850 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-1.5 pl-3.5 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.03)] transition-all"
          >
            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            </div>

            <input
              id="chat-input-field"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeSession
                  ? `Ask a follow-up inquiry on "${activeSession.title}" or query new live context...`
                  : 'Ask about team deliverables, AI Overviews, client accounts, or accomplishments...'
              }
              disabled={isLoading}
              className="flex-1 py-1.5 text-xs sm:text-sm bg-transparent border-0 focus:outline-hidden disabled:opacity-60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />

            <div className="hidden sm:flex items-center text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-1 rounded-lg shadow-2xs">
              <span>Enter</span>
              <CornerDownLeft className="w-3 h-3 ml-1" />
            </div>

            <button
              id="chat-send-btn"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl theme-action-primary active:scale-95 text-white disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer shrink-0"
              title="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Subtext info */}
          <div className="flex items-center justify-between mt-2 px-2 text-[10.5px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Evidence grounded in verified Trello cards, boards & checklists
            </span>
            <span className="hidden md:inline text-slate-400">
              Instant AI synthesis with verifiable source links
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatMarkdownForDisplay(text: string): string {
  let html = text
    .replace(/^### (.*?)$/gm, '<h3 class="font-bold text-slate-900 text-sm mt-3.5 mb-1">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="font-bold text-slate-900 text-base mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="font-bold text-slate-900 text-lg mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-1 leading-relaxed">$1</li>')
    .replace(/^\s*\*\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-1 leading-relaxed">$1</li>');

  return html;
}

export const ChatView = React.memo(ChatViewComponent);
