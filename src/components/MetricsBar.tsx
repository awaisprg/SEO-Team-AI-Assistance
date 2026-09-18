import React from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { TeamMetrics } from '../types';

interface MetricsBarProps {
  metrics: TeamMetrics | null;
  onSelectFilter: (topic: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, onSelectFilter }) => {
  if (!metrics) return null;

  const cards = [
    {
      id: 'metric-active-btn',
      title: 'Active Workstream',
      prompt: 'What is the team working on right now?',
      value: metrics.activeWork,
      unit: 'in flight',
      badge: 'Active Tasks',
      badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/70',
      icon: Clock,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50/80 border-violet-100',
    },
    {
      id: 'metric-completed-btn',
      title: 'Delivered Work',
      prompt: 'What did the team complete recently?',
      value: metrics.completedThisMonth,
      unit: 'shipped',
      badge: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50/80 border-emerald-100',
    },
    {
      id: 'metric-ai-btn',
      title: 'AI & GEO Initiatives',
      prompt: 'What are our active AI Overview and GEO initiatives?',
      value: metrics.aiInitiatives,
      unit: 'strategic',
      badge: 'AI Search',
      badgeClass: 'bg-[#09061A] text-white border-slate-900',
      icon: Sparkles,
      iconColor: 'text-[#7C52F5]',
      iconBg: 'bg-violet-50 border-violet-200',
      highlight: true,
    },
    {
      id: 'metric-review-btn',
      title: 'Quality & QA Gate',
      prompt: 'What items are currently in review or awaiting approval?',
      value: metrics.inReview,
      unit: 'pending gate',
      badge: 'In Review',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50/80 border-amber-100',
    },
    {
      id: 'metric-content-btn',
      title: 'Content & Editorial',
      prompt: 'What content production and service page work is underway?',
      value: metrics.contentWork,
      unit: 'deliverables',
      badge: 'Publishing',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70',
      icon: FileText,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50/80 border-blue-100',
    },
    {
      id: 'metric-total-btn',
      title: 'Indexed Database',
      prompt: 'Show me an overview of all tracked initiatives',
      value: metrics.totalCards,
      unit: 'cards tracked',
      badge: 'Live Sync',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Layers,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100/80 border-slate-200',
    },
  ];

  return (
    <div id="metrics-bar" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            id={card.id}
            onClick={() => onSelectFilter(card.prompt)}
            className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
              card.highlight
                ? 'bg-gradient-to-b from-violet-50/40 via-white to-white border-violet-200 hover:border-violet-400 ring-1 ring-violet-500/10'
                : 'bg-white border-slate-200/90 hover:border-violet-300'
            }`}
          >
            {/* Top row: Label & Icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-600 tracking-tight truncate pr-1">
                {card.title}
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${card.iconBg}`}
              >
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>

            {/* Middle: Counter Metric */}
            <div className="flex items-baseline space-x-1.5 my-1">
              <span className="text-2xl sm:text-[25px] font-bold text-slate-900 tracking-tight tabular-nums leading-none font-sans">
                {card.value}
              </span>
              <span className="text-[11px] font-medium text-slate-400 tracking-tight">
                {card.unit}
              </span>
            </div>

            {/* Bottom Row: Status badge & prompt trigger */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${card.badgeClass}`}
              >
                {card.badge}
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-[#7C52F5] flex items-center font-medium opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5">
                Query
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
