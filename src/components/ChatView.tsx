import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, ChatSource } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  onSelectSource: (source: ChatSource) => void;
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
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div id="chat-view" className="flex flex-col h-[calc(100vh-13rem)] bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Suggestions Header Strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap flex items-center">
            <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
            Executive Prompts:
          </span>
          {PROMPT_SUGGESTIONS.map((prompt, idx) => (
            <button
              key={idx}
              id={`prompt-chip-${idx}`}
              onClick={() => onSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50 whitespace-nowrap font-medium transition-colors shadow-2xs cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              SEO & Content Team Assistant
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Ask natural questions about team workstreams, AI Overviews, client deliverables, or accomplishments. Every answer is grounded directly in real Trello cards and activity logs.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full text-left">
              {PROMPT_SUGGESTIONS.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  id={`empty-prompt-btn-${idx}`}
                  onClick={() => onSendMessage(prompt)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-all cursor-pointer group"
                >
                  <span>"{prompt}"</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
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
              <div className="max-w-2xl bg-slate-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-xs">
                {msg.content}
              </div>
            ) : (
              <div className="w-full max-w-4xl space-y-4">
                {/* Assistant Answer Box */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
                  {/* Header: Strength Badge + Copy action */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Intelligence Response
                      </span>
                      {msg.evidenceStrength && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            msg.evidenceStrength === 'high'
                              ? 'bg-emerald-100 text-emerald-800'
                              : msg.evidenceStrength === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {msg.evidenceStrength} Evidence
                        </span>
                      )}
                    </div>
                    <button
                      id={`copy-answer-${msg.id}`}
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-200/60"
                      title="Copy for email or Slack"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Breakdown Strip (if available) */}
                  {msg.statusBreakdown && Object.keys(msg.statusBreakdown).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(msg.statusBreakdown).map(([status, count]) => (
                        <span
                          key={status}
                          className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-slate-700 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5" />
                          {status}: <strong className="ml-1 text-slate-900">{count}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Markdown Answer Body */}
                  <div className="prose prose-slate prose-sm max-w-none text-slate-800 leading-relaxed">
                    <div
                      className="whitespace-pre-wrap font-sans text-sm space-y-2"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdownForDisplay(msg.content),
                      }}
                    />
                  </div>

                  {/* Evidence Drawer */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <button
                        id={`toggle-sources-${msg.id}`}
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            Connected Trello Evidence ({msg.sources.length} Verified Cards)
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-400">
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
                              className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all text-xs cursor-pointer shadow-2xs hover:shadow-xs group"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span className="font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                                  {src.title}
                                </span>
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                  title="Open in Trello"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  List: {src.listName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                  {src.status}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {src.relevance}% relevance
                                </span>
                              </div>
                              {src.snippet && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded border border-slate-100">
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
          <div className="flex items-center space-x-3 text-slate-500 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 w-fit">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing Trello cards, checklists, activities, and synthesizing executive brief...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            id="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about SEO/Content team work, AI Overviews, client deliverables..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-60 transition-all text-slate-900 placeholder:text-slate-400"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center p-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

function formatMarkdownForDisplay(text: string): string {
  // Convert basic markdown headers and bullets to styled html
  let html = text
    .replace(/^### (.*?)$/gm, '<h3 class="font-bold text-slate-900 text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 class="font-bold text-slate-900 text-base mt-4 mb-2">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 class="font-bold text-slate-900 text-lg mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>')
    .replace(/^\s*\*\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>');

  return html;
}
