import React, { useState, useRef, useEffect } from 'react';
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
}

export const CATEGORIZED_PROMPT_SUGGESTIONS: PromptSuggestionItem[] = [
  // Clients (from Clients frontpage tab & metrics)
  { id: 'c1', category: 'Clients', text: 'Which clients are currently on hold and why?', badge: 'On Hold' },
  { id: 'c2', category: 'Clients', text: 'Break down active clients between PDS and GFM', badge: 'PDS vs GFM' },
  { id: 'c3', category: 'Clients', text: 'Which client accounts are closed or terminated?', badge: 'Closed' },
  { id: 'c4', category: 'Clients', text: 'What is happening with Precision Podiatry right now?', badge: 'Client Deep Dive' },
  { id: 'c5', category: 'Clients', text: 'What is the current status of high-priority client accounts?', badge: 'Priority' },
  { id: 'c6', category: 'Clients', text: 'Show all active client accounts being worked on for PDS and GFM', badge: 'Active Clients' },

  // Tasks & Delivery (from Tasks metrics)
  { id: 't1', category: 'Tasks', text: 'What tasks is the team actively working on right now?', badge: 'Active Tasks' },
  { id: 't2', category: 'Tasks', text: 'What items are currently in QA review or awaiting approval?', badge: 'QA Review' },
  { id: 't3', category: 'Tasks', text: 'What tasks did the team complete recently?', badge: 'Completed' },
  { id: 't4', category: 'Tasks', text: 'Are there any delayed or blocked client items?', badge: 'Blockers' },

  // Workload & Team (from Team frontpage tab)
  { id: 'w1', category: 'Team', text: 'Which team members have the heaviest active workload?', badge: 'Capacity' },
  { id: 'w2', category: 'Team', text: 'Show workload and recent accomplishments for Awais Tahir', badge: 'Awais Tahir' },
  { id: 'w3', category: 'Team', text: 'Show workload and active tasks for Sarah Connor', badge: 'Sarah Connor' },
  { id: 'w4', category: 'Team', text: 'What did the team accomplish this week?', badge: 'Accomplishments' },

  // AI & SEO Initiatives (from AI badge & Executive Briefs)
  { id: 'a1', category: 'AI & SEO', text: 'What are we doing with AI Overviews and GEO?', badge: 'AI Overviews' },
  { id: 'a2', category: 'AI & SEO', text: 'What AI productivity tools have been tested by the team?', badge: 'AI Tools' },
  { id: 'a3', category: 'AI & SEO', text: 'What content and SEO experiments were conducted recently?', badge: 'Experiments' },

  // Executive Management (from Executive Briefs tab)
  { id: 'e1', category: 'Executive', text: 'What can I tell senior management about our progress?', badge: 'Executive' },
  { id: 'e2', category: 'Executive', text: 'Show me an overview of all tracked initiatives across the board', badge: 'Board Overview' },
];

export const ChatView: React.FC<ChatViewProps> = ({
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

  const filteredPrompts =
    activeCategoryFilter === 'All'
      ? CATEGORIZED_PROMPT_SUGGESTIONS
      : CATEGORIZED_PROMPT_SUGGESTIONS.filter((p) => p.category === activeCategoryFilter);

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
      className="flex h-[calc(100vh-14.5rem)] bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden relative"
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
        />
      </div>

      {/* Main Chat Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/40">
        {/* Top Control Bar with Sidebar Toggle & Prompts Strip */}
        <div className="bg-white border-b border-slate-200/80 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Desktop Toggle Button */}
            <button
              type="button"
              id="desktop-toggle-history-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title={isSidebarOpen ? 'Collapse query history' : 'Expand query history'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5 text-[#7C52F5]" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#7C52F5]" />
              )}
              <span>Archive</span>
              <span className="px-1.5 py-0.2 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold border border-violet-100">
                {sessions.length}
              </span>
            </button>

            {/* Mobile Open Drawer Button */}
            <button
              type="button"
              id="mobile-toggle-history-btn"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-200 text-xs font-semibold shadow-2xs cursor-pointer"
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
              className="p-1 rounded-md bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
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
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-violet-50/80 text-slate-700 hover:text-[#7C52F5] border border-slate-200 hover:border-[#7C52F5]/60 whitespace-nowrap font-medium transition-all shadow-2xs cursor-pointer shrink-0 text-[11px] flex items-center gap-1.5 group"
                >
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors uppercase">
                    {item.badge}
                  </span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => scrollPrompts('right')}
              disabled={!canScrollRight}
              className="p-1 rounded-md bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              title="Scroll suggestions right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* View All Questions Modal / Dropdown Toggle */}
            <div className="relative shrink-0">
              <button
                type="button"
                id="view-all-prompts-btn"
                onClick={() => setShowAllSuggestionsDropdown(!showAllSuggestionsDropdown)}
                className={`p-1.5 rounded-md border text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                  showAllSuggestionsDropdown
                    ? 'bg-violet-50 text-[#7C52F5] border-violet-200'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
                title="View all categorized question suggestions"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden xl:inline">All Questions</span>
              </button>

              {/* All Questions Dropdown Popover */}
              {showAllSuggestionsDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAllSuggestionsDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[26rem] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                        <Sparkles className="w-3.5 h-3.5 text-[#7C52F5]" />
                        <span>Executive Question Library</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAllSuggestionsDropdown(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Category Filter Pills in Popover */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                      {['All', 'Clients', 'Tasks', 'Team', 'AI & SEO', 'Executive'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors ${
                            activeCategoryFilter === cat
                              ? 'bg-[#7C52F5] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Questions List */}
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {filteredPrompts.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSendMessage(item.text);
                            setShowAllSuggestionsDropdown(false);
                          }}
                          className="w-full text-left py-2 px-1.5 rounded-lg hover:bg-violet-50/60 transition-colors flex items-start justify-between gap-2 group cursor-pointer"
                        >
                          <div className="flex-1">
                            <span className="text-xs text-slate-800 group-hover:text-[#7C52F5] font-medium block leading-snug">
                              {item.text}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {item.category} • {item.badge}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#7C52F5] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

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
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#09061A] to-[#7C52F5] text-white flex items-center justify-center mb-4 shadow-md shadow-violet-500/15">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                SEO & Content Team Executive Intelligence
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-md">
                Query active workstreams, strategic AI Overviews, client deliverables, or team accomplishments. Every response is grounded directly in real Trello cards with verifiable source links.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full text-left">
                {[
                  {
                    category: 'Client Pipeline',
                    badge: 'On Hold',
                    title: 'On Hold Clients & Reasons',
                    prompt: 'Which clients are currently on hold and why?',
                    desc: 'Review accounts awaiting feedback, onboarding, or client input',
                  },
                  {
                    category: 'Task Delivery',
                    badge: 'Active Work',
                    title: 'Active Workstreams & QA',
                    prompt: 'What tasks is the team actively working on right now?',
                    desc: 'Current in-progress cards and deliverables across all boards',
                  },
                  {
                    category: 'Agency Accounts',
                    badge: 'PDS vs GFM',
                    title: 'PDS & GFM Distribution',
                    prompt: 'Break down active clients between PDS and GFM',
                    desc: 'Portfolio balance and active work distribution across agencies',
                  },
                  {
                    category: 'AI Initiatives',
                    badge: 'AI Overviews',
                    title: 'AI Overviews & GEO',
                    prompt: 'What are we doing with AI Overviews and GEO?',
                    desc: 'Generative search optimization, research & team experiments',
                  },
                  {
                    category: 'Team Capacity',
                    badge: 'Capacity',
                    title: 'Team Workload & Capacity',
                    prompt: 'Which team members have the heaviest active workload?',
                    desc: 'Workload distribution, card assignments, and bandwidth',
                  },
                  {
                    category: 'Leadership',
                    badge: 'Executive',
                    title: 'Senior Management Brief',
                    prompt: 'What can I tell senior management about our progress?',
                    desc: 'Executive summaries, completed milestones & team highlights',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`empty-prompt-btn-${idx}`}
                    onClick={() => onSendMessage(item.prompt)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#7C52F5] hover:bg-violet-50/30 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-50 text-violet-700 border border-violet-100 uppercase">
                          {item.badge}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#7C52F5] block mb-1">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-500 block line-clamp-2">
                        {item.desc}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center text-[11px] font-semibold text-[#7C52F5]">
                      <span>Query Insight</span>
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
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
            <div className="flex items-center space-x-3 text-slate-600 text-xs bg-white p-3.5 rounded-xl border border-slate-200/90 w-fit shadow-xs">
              <div className="w-4 h-4 border-2 border-[#7C52F5] border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-slate-900">
                Synthesizing Trello cards, checklists, activities, and verified team context...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200/90 shrink-0">
          <form
            onSubmit={handleSubmit}
            className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3.5 focus-within:border-[#7C52F5] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7C52F5]/10 transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#7C52F5] shrink-0" />
            <input
              id="chat-input-field"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeSession
                  ? `Ask a follow-up inquiry on "${activeSession.title}" or ask a new question...`
                  : 'Ask about team deliverables, AI Overviews, client accounts, or accomplishments...'
              }
              disabled={isLoading}
              className="flex-1 py-1 text-sm bg-transparent border-0 focus:outline-hidden disabled:opacity-60 text-slate-900 placeholder:text-slate-400"
            />
            <div className="hidden sm:flex items-center text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
              <span>Enter</span>
              <CornerDownLeft className="w-3 h-3 ml-1" />
            </div>
            <button
              id="chat-send-btn"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] active:from-[#572FD6] active:to-[#461EC6] text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer shrink-0"
              title="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
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
