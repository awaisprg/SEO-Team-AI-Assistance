import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  X,
  Building2,
  Users,
  Briefcase,
  HelpCircle,
  Tag,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface QuickQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuery: (question: string) => void;
  clientCount?: number;
  activeClientCount?: number;
}

interface CuratedQuery {
  icon: string;
  category: string;
  text: string;
  badge: string;
  desc: string;
}

const CURATED_QUERIES: CuratedQuery[] = [
  {
    icon: '📱',
    category: 'Services',
    text: 'How many clients we have with Social Media services?',
    badge: 'Social Media',
    desc: 'Audit client accounts receiving active social media management and posting',
  },
  {
    icon: '🛠️',
    category: 'Services',
    text: 'Which clients have Website Maintenance services?',
    badge: 'Web Maintenance',
    desc: 'List accounts with site upkeep, speed, and hosting maintenance retainers',
  },
  {
    icon: '💻',
    category: 'Services',
    text: 'Which clients have Website Development services?',
    badge: 'Web Dev',
    desc: 'Review accounts with active website builds, redesigns, or development tasks',
  },
  {
    icon: '⏸️',
    category: 'Clients',
    text: 'Which clients are currently on hold and why?',
    badge: 'On Hold',
    desc: 'Audit client accounts awaiting feedback, onboarding, or client deliverables',
  },
  {
    icon: '⚖️',
    category: 'Clients',
    text: 'Break down active clients between PDS and GFM',
    badge: 'PDS vs GFM',
    desc: 'Portfolio split and active account distribution across agencies',
  },
  {
    icon: '🚀',
    category: 'Tasks',
    text: 'What tasks is the team actively working on right now?',
    badge: 'In Progress',
    desc: 'Real-time sprint deliverables currently being executed across boards',
  },
  {
    icon: '👥',
    category: 'Team',
    text: 'Which team members have the heaviest active workload?',
    badge: 'Capacity',
    desc: 'Team card assignment distribution and current bandwidth analysis',
  },
  {
    icon: '🛡️',
    category: 'Tasks',
    text: 'What items are currently in QA review or awaiting approval?',
    badge: 'In Review',
    desc: 'Cards pending quality assurance check and manager sign-off',
  },
  {
    icon: '📊',
    category: 'Executive',
    text: 'What can I tell senior management about our progress?',
    badge: 'Executive',
    desc: 'High-level executive briefing synthesized directly from verified cards',
  },
];

export const QuickQueryModal: React.FC<QuickQueryModalProps> = ({
  isOpen,
  onClose,
  onSubmitQuery,
  clientCount = 62,
  activeClientCount = 37,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredQueries = CURATED_QUERIES.filter((q) => {
    if (!query.trim()) return true;
    const term = query.toLowerCase();
    return (
      q.text.toLowerCase().includes(term) ||
      q.category.toLowerCase().includes(term) ||
      q.badge.toLowerCase().includes(term) ||
      q.desc.toLowerCase().includes(term)
    );
  });

  const handleSelect = (text: string) => {
    onSubmitQuery(text);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmitQuery(query.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <form onSubmit={handleSubmit} className="relative border-b border-slate-100 flex items-center px-4 py-3.5 gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-[#7C52F5] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything... e.g. 'How many clients we have with Social Media services?'"
            className="flex-1 text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            ESC
          </button>
        </form>

        {/* Dynamic List */}
        <div className="overflow-y-auto p-3 space-y-1.5 flex-1 divide-y divide-slate-50">
          {query.trim() && (
            <button
              type="button"
              onClick={() => handleSelect(query)}
              className="w-full text-left p-3 rounded-xl hover:bg-violet-50/80 border border-transparent hover:border-violet-200 flex items-center justify-between group transition-all cursor-pointer bg-violet-50/40 mb-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#7C52F5] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                  ↵
                </span>
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-900">Ask Custom Query: </span>
                  <span className="text-xs font-medium text-[#7C52F5] italic">"{query}"</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400 group-hover:text-[#7C52F5] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          )}

          <div className="px-2 py-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Instant Intelligence Queries</span>
            <span>{filteredQueries.length} available</span>
          </div>

          {filteredQueries.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item.text)}
              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/90 flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-base select-none mt-0.5 shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#7C52F5] transition-colors leading-tight">
                      {item.text}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#7C52F5] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          ))}

          {filteredQueries.length === 0 && !query.trim() && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching questions found. Type any custom question above.
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span>💡 <strong>Tip:</strong> Press <strong>Enter</strong> to run query</span>
            <span>•</span>
            <span>Grounds answers in real-time Trello cards &amp; checklists</span>
          </div>
          <span className="font-semibold text-slate-700">{clientCount} Accounts Monitored</span>
        </div>
      </div>
    </div>
  );
};
