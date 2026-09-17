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
      title: 'Active Pipeline',
      prompt: 'What is the team working on right now?',
      value: metrics.activeWork,
      unit: 'in progress',
      badge: 'Active Work',
      badgeClass: 'bg-indigo-50 text-[#2F20A2] border-[#C6C1F3]',
      icon: Clock,
      iconColor: 'text-[#2F20A2]',
      iconBg: 'bg-indigo-50/80 border-indigo-100',
    },
    {
      id: 'metric-completed-btn',
      title: 'Delivered Work',
      prompt: 'What did the team complete recently?',
      value: metrics.completedThisMonth,
      unit: 'verified',
      badge: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
    },
    {
      id: 'metric-ai-btn',
      title: 'AI & GEO Research',
      prompt: 'What are our active AI Overview and GEO initiatives?',
      value: metrics.aiInitiatives,
      unit: 'initiatives',
      badge: 'Strategic',
      badgeClass: 'bg-[#F2F2FD] text-[#8963FB] border-[#C6C1F3]',
      icon: Sparkles,
      iconColor: 'text-[#8963FB]',
      iconBg: 'bg-[#F2F2FD] border-[#C6C1F3]',
      highlight: true,
    },
    {
      id: 'metric-review-btn',
      title: 'In QA & Review',
      prompt: 'What items are currently in review or awaiting approval?',
      value: metrics.inReview,
      unit: 'pending gate',
      badge: 'Quality Gate',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
    },
    {
      id: 'metric-content-btn',
      title: 'Content & E-E-A-T',
      prompt: 'What content production and service page work is underway?',
      value: metrics.contentWork,
      unit: 'workstreams',
      badge: 'Editorial',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: FileText,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50 border-purple-100',
    },
    {
      id: 'metric-total-btn',
      title: 'Indexed Board Cards',
      prompt: 'Show me an overview of all tracked initiatives',
      value: metrics.totalCards,
      unit: 'total items',
      badge: 'Trello Sync',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Layers,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100 border-slate-200',
    },
  ];

  return (
    <div id="metrics-bar" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            id={card.id}
            onClick={() => onSelectFilter(card.prompt)}
            className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden ${
              card.highlight
                ? 'bg-gradient-to-b from-[#FAF8FF] to-white border-[#C6C1F3] hover:border-[#8963FB] shadow-xs hover:shadow-md'
                : 'bg-white border-[#EAEAEC] hover:border-[#C6C1F3] shadow-xs hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Top row: Label & Icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#5D5C68] tracking-tight truncate pr-1">
                {card.title}
              </span>
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${card.iconBg}`}
              >
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>

            {/* Middle: Big Metric */}
            <div className="flex items-baseline space-x-1.5 my-0.5">
              <span className="text-2xl sm:text-[26px] font-extrabold text-[#27272B] tracking-tight tabular-nums leading-none">
                {card.value}
              </span>
              <span className="text-[11px] font-medium text-[#6E6D7B] tracking-tight">
                {card.unit}
              </span>
            </div>

            {/* Bottom Row: Micro-badge + prompt indicator */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0F0F3]">
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${card.badgeClass}`}
              >
                {card.badge}
              </span>
              <span className="text-[11px] text-[#6E6D7B] group-hover:text-[#2F20A2] flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
