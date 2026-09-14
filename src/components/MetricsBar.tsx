import React from 'react';
import { Layers, CheckCircle2, Clock, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { TeamMetrics } from '../types';

interface MetricsBarProps {
  metrics: TeamMetrics | null;
  onSelectFilter: (topic: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, onSelectFilter }) => {
  if (!metrics) return null;

  return (
    <div id="metrics-bar" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Active Work */}
      <button
        id="metric-active-btn"
        onClick={() => onSelectFilter('What is the team working on right now?')}
        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">In Process</span>
          <Clock className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-slate-900">{metrics.activeWork}</span>
          <span className="text-xs text-slate-400 font-normal">cards</span>
        </div>
      </button>

      {/* 2. Completed */}
      <button
        id="metric-completed-btn"
        onClick={() => onSelectFilter('What did the team complete recently?')}
        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Completed</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-slate-900">{metrics.completedThisMonth}</span>
          <span className="text-xs text-slate-400 font-normal">delivered</span>
        </div>
      </button>

      {/* 3. AI & GEO Research */}
      <button
        id="metric-ai-btn"
        onClick={() => onSelectFilter('What are our active AI Overview and GEO initiatives?')}
        className="bg-white p-3 rounded-lg border border-purple-200 hover:border-purple-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group bg-gradient-to-b from-purple-50/30 to-white"
      >
        <div className="flex items-center justify-between text-purple-700 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">AI & GEO</span>
          <Sparkles className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-purple-900">{metrics.aiInitiatives}</span>
          <span className="text-xs text-purple-500 font-medium">projects</span>
        </div>
      </button>

      {/* 4. In Review */}
      <button
        id="metric-review-btn"
        onClick={() => onSelectFilter('What items are currently in review or awaiting approval?')}
        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">In Review</span>
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-slate-900">{metrics.inReview}</span>
          <span className="text-xs text-slate-400 font-normal">pending</span>
        </div>
      </button>

      {/* 5. Content Work */}
      <button
        id="metric-content-btn"
        onClick={() => onSelectFilter('What content production and service page work is underway?')}
        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Content</span>
          <FileText className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-slate-900">{metrics.contentWork}</span>
          <span className="text-xs text-slate-400 font-normal">campaigns</span>
        </div>
      </button>

      {/* 6. Total Indexed Cards */}
      <button
        id="metric-total-btn"
        onClick={() => onSelectFilter('Show me an overview of all tracked initiatives')}
        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Cards</span>
          <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-slate-900">{metrics.totalCards}</span>
          <span className="text-xs text-slate-400 font-normal">indexed</span>
        </div>
      </button>
    </div>
  );
};
