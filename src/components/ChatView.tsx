import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Layers,
  ArrowRight,
  History,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  User,
  CornerDownLeft,
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

const PROMPT_SUGGESTIONS = [
  'What are we doing with AI Overviews?',
  'What is happening with Precision Podiatry right now?',
  'What did the team accomplish this week?',
  'What can I tell senior management about our progress?',
  'Are there any delayed or blocked client items?',
  'What AI productivity tools have been tested by the team?',
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
      className="flex h-[calc(100vh-14rem)] bg-white rounded-3xl border border-[#EAEAEC] shadow-sm overflow-hidden relative"
    >
      {/* Mobile Sidebar Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-[#1A1A1E]/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Top Control Bar with Sidebar Toggle & Prompts Strip */}
        <div className="bg-[#FAF8FF]/60 border-b border-[#EAEAEC] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 shrink-0">
            {/* Desktop Toggle Button */}
            <button
              type="button"
              id="desktop-toggle-history-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2F2FD] text-[#1A1A1E] hover:text-[#2F20A2] border border-[#EAEAEC] hover:border-[#C6C1F3] text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title={isSidebarOpen ? 'Collapse query history' : 'Expand query history'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5 text-[#8963FB]" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#8963FB]" />
              )}
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#F2F2FD] text-[#8963FB] text-[10px] font-bold">
                {sessions.length}
              </span>
            </button>

            {/* Mobile Open Drawer Button */}
            <button
              type="button"
              id="mobile-toggle-history-btn"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white text-[#1A1A1E] border border-[#EAEAEC] text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#8963FB]" />
              <span>History ({sessions.length})</span>
            </button>

            {/* Quick New Query Button */}
            <button
              type="button"
              id="chat-quick-new-query-btn"
              onClick={onNewSession}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2F2FD] text-[#5D5C68] hover:text-[#2F20A2] border border-[#EAEAEC] hover:border-[#C6C1F3] text-xs font-medium transition-all shadow-2xs cursor-pointer"
              title="Start a fresh query"
            >
              <Plus className="w-3.5 h-3.5 text-[#8963FB]" />
              <span className="hidden sm:inline">New Query</span>
            </button>
          </div>

          {/* Prompt Suggestions Strip */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs flex-1 justify-end">
            <span className="text-[#6E6D7B] font-medium whitespace-nowrap flex items-center shrink-0 pr-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#8963FB]" />
              Quick:
            </span>
            {PROMPT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                id={`prompt-chip-${idx}`}
                onClick={() => onSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full bg-white text-[#5D5C68] border border-[#EAEAEC] hover:border-[#8963FB] hover:text-[#2F20A2] hover:bg-[#F2F2FD] whitespace-nowrap font-medium transition-all shadow-2xs cursor-pointer shrink-0 text-[11px]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Active Session Context Banner */}
        {activeSession && messages.length > 0 && (
          <div className="bg-[#F2F2FD]/80 border-b border-[#C6C1F3]/60 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#2F20A2] truncate">
              <History className="w-3.5 h-3.5 text-[#8963FB] shrink-0" />
              <span className="font-semibold truncate">
                Past Query: <span className="font-normal text-[#1A1A1E]">{activeSession.title}</span>
              </span>
              <span className="text-[10px] text-[#6E6D7B] shrink-0 hidden sm:inline">
                • {new Date(activeSession.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              type="button"
              onClick={onNewSession}
              className="text-[11px] font-bold text-[#8963FB] hover:text-[#2F20A2] cursor-pointer whitespace-nowrap ml-2"
            >
              + Start Fresh
            </button>
          </div>
        )}

        {/* Messages Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2A1C94] to-[#7C52F5] text-white flex items-center justify-center mb-4 shadow-md shadow-purple-500/20">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1E] mb-2 tracking-tight">
                SEO & Content Team Executive Intelligence
              </h3>
              <p className="text-xs text-[#5D5C68] mb-6 leading-relaxed max-w-md">
                Ask executive queries about team workstreams, AI Overviews, client deliverables, or accomplishments. Every answer is grounded directly in real Trello cards with verifiable source links.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
                {[
                  {
                    title: 'AI Overviews & GEO',
                    prompt: 'What are we doing with AI Overviews?',
                    desc: 'Research, testing & rollout status',
                  },
                  {
                    title: 'Client Workstreams',
                    prompt: 'What is happening with Precision Podiatry right now?',
                    desc: 'Deliverables & approval gates',
                  },
                  {
                    title: 'Executive Talking Points',
                    prompt: 'What can I tell senior management about our progress?',
                    desc: 'Accomplishments & leadership highlights',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`empty-prompt-btn-${idx}`}
                    onClick={() => onSendMessage(item.prompt)}
                    className="p-3.5 rounded-2xl border border-[#EAEAEC] hover:border-[#8963FB] hover:bg-[#F2F2FD]/40 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#1A1A1E] group-hover:text-[#2F20A2] block mb-1">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-[#6E6D7B] block line-clamp-2">
                        {item.desc}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center text-[11px] font-semibold text-[#8963FB]">
                      <span>Ask Assistant</span>
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
                <div className="max-w-2xl bg-[#1A1A1E] text-white px-5 py-3 rounded-2xl rounded-tr-xs text-sm shadow-xs font-medium leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full max-w-4xl space-y-4">
                  {/* Assistant Answer Box */}
                  <div className="bg-white border border-[#EAEAEC] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs hover:border-[#C6C1F3] transition-colors">
                    {/* Header: Strength Badge + Download PDF action */}
                    <div className="flex items-center justify-between border-b border-[#EAEAEC] pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#8963FB] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          GF
                        </div>
                        <span className="text-xs font-bold text-[#1A1A1E] uppercase tracking-wider">
                          Intelligence Response
                        </span>
                        {msg.evidenceStrength && (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              msg.evidenceStrength === 'high'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : msg.evidenceStrength === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {msg.evidenceStrength} Evidence
                          </span>
                        )}
                      </div>

                      <button
                        id={`download-pdf-msg-${msg.id}`}
                        onClick={() => {
                          const queryTitle =
                            activeSession?.title ||
                            messages.find((m) => m.role === 'user')?.content ||
                            'Executive Intelligence Response';
                          downloadChatSummaryPDF(msg, queryTitle);
                        }}
                        className="inline-flex items-center space-x-1.5 text-xs text-[#5D5C68] hover:text-[#2F20A2] hover:bg-[#F2F2FD] border border-[#EAEAEC] hover:border-[#C6C1F3] transition-all cursor-pointer px-3 py-1.5 rounded-xl shadow-2xs font-semibold"
                        title="Download executive intelligence response as PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#8963FB]" />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    {/* Status Breakdown Strip (if available) */}
                    {msg.statusBreakdown && Object.keys(msg.statusBreakdown).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#F8F8FC] border border-[#EAEAEC] text-[11px] text-[#5D5C68]">
                        <span className="font-semibold text-[#1A1A1E] mr-1">Status Distribution:</span>
                        {Object.entries(msg.statusBreakdown).map(([status, count]) => (
                          <span
                            key={status}
                            className="bg-white border border-[#EAEAEC] px-2 py-0.5 rounded-md font-medium text-[#5D5C68]"
                          >
                            {status}: <strong className="ml-1 text-[#1A1A1E]">{count}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Markdown Answer Body */}
                    <div className="prose prose-sm max-w-none text-[#1A1A1E] leading-relaxed">
                      <div
                        className="whitespace-pre-wrap font-sans text-sm space-y-2 text-[#27272B]"
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdownForDisplay(msg.content),
                        }}
                      />
                    </div>

                    {/* Evidence Drawer */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#EAEAEC]">
                        <button
                          id={`toggle-sources-${msg.id}`}
                          onClick={() => toggleSources(msg.id)}
                          className="flex items-center justify-between w-full text-xs font-bold text-[#1A1A1E] hover:text-[#2F20A2] py-1 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#8963FB]" />
                            <span>
                              Connected Trello Evidence ({msg.sources.length} Verified Cards)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-[#6E6D7B] font-medium">
                            <span>{expandedSources[msg.id] ? 'Hide' : 'Inspect'}</span>
                            {expandedSources[msg.id] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
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
                                className="bg-[#FAF8FF]/40 hover:bg-[#F2F2FD]/80 p-3.5 rounded-2xl border border-[#EAEAEC] hover:border-[#8963FB] transition-all text-xs cursor-pointer shadow-2xs hover:shadow-xs group"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <span className="font-bold text-[#1A1A1E] group-hover:text-[#2F20A2] line-clamp-1">
                                    {src.title}
                                  </span>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#8963FB] hover:text-white bg-[#F2F2FD] hover:bg-[#8963FB] px-2 py-0.5 rounded-full transition-colors shrink-0"
                                    title="Open Trello Card"
                                  >
                                    <span>Trello</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#EAEAEC] text-[#5D5C68]">
                                    List: {src.listName}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F2FD] text-[#2F20A2] border border-[#C6C1F3]">
                                    {src.status}
                                  </span>
                                  <span className="text-[10px] text-[#6E6D7B] font-medium">
                                    {src.relevance}% relevance
                                  </span>
                                </div>
                                {src.snippet && (
                                  <p className="text-[11px] text-[#5D5C68] line-clamp-2 italic bg-white p-2 rounded-xl border border-[#EAEAEC]">
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
            <div className="flex items-center space-x-3 text-[#5D5C68] text-xs bg-white p-4 rounded-2xl border border-[#EAEAEC] w-fit shadow-xs">
              <div className="w-4 h-4 border-2 border-[#8963FB] border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-[#1A1A1E]">
                Analyzing Trello cards, checklists, activities, and synthesizing executive brief...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-[#EAEAEC]">
          <form
            onSubmit={handleSubmit}
            className="flex items-center space-x-2 bg-[#F8F8FC] border border-[#EAEAEC] rounded-2xl p-1.5 pl-4 focus-within:border-[#8963FB] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#8963FB]/10 transition-all shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#8963FB] shrink-0" />
            <input
              id="chat-input-field"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeSession
                  ? `Ask a follow-up about "${activeSession.title}" or type a new query...`
                  : 'Ask anything about SEO/Content team work, AI Overviews, client deliverables...'
              }
              disabled={isLoading}
              className="flex-1 py-1.5 text-sm bg-transparent border-0 focus:outline-hidden disabled:opacity-60 text-[#1A1A1E] placeholder:text-[#6E6D7B]"
            />
            <div className="hidden sm:flex items-center text-[10px] font-bold text-[#6E6D7B] bg-white border border-[#EAEAEC] px-2 py-1 rounded-lg">
              <span>Return</span>
              <CornerDownLeft className="w-3 h-3 ml-1" />
            </div>
            <button
              id="chat-send-btn"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer shrink-0"
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
  // Convert basic markdown headers and bullets to styled html
  let html = text
    .replace(/^### (.*?)$/gm, '<h3 class="font-bold text-[#1A1A1E] text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="font-bold text-[#1A1A1E] text-base mt-4 mb-2">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="font-bold text-[#1A1A1E] text-lg mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#1A1A1E]">$1</strong>')
    .replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-4 list-disc text-[#4B4A54] my-0.5">$1</li>')
    .replace(/^\s*\*\s*(.*?)$/gm, '<li class="ml-4 list-disc text-[#4B4A54] my-0.5">$1</li>');

  return html;
}
