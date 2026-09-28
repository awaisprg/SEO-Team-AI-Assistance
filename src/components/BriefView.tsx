import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  CalendarRange,
  Trash2,
  CheckCircle2,
  Clock,
  Activity,
  Copy,
  Check,
  Filter,
  Users,
  Target,
  Eye,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { ManagementBrief, ChatSource, ClientEntity } from '../types';
import { downloadBriefPDF } from '../utils/pdfGenerator';
import { BriefDocumentSkeleton } from './TabSkeletons';

interface BriefViewProps {
  currentBrief: ManagementBrief | null;
  savedBriefs: ManagementBrief[];
  clients?: ClientEntity[];
  onGenerateBrief: (
    periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom',
    dateFrom?: string,
    dateTo?: string,
    client?: string
  ) => void;
  onSelectBrief: (brief: ManagementBrief) => void;
  onDeleteBrief?: (briefId: string) => void;
  onClearBriefs?: () => void;
  isGenerating: boolean;
  onSelectSource: (source: ChatSource) => void;
}

const BriefViewComponent: React.FC<BriefViewProps> = ({
  currentBrief,
  savedBriefs,
  clients = [],
  onGenerateBrief,
  onSelectBrief,
  onDeleteBrief,
  onClearBriefs,
  isGenerating,
  onSelectSource,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'
  >('overall');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'management' | 'client'>('management');
  const [copied, setCopied] = useState<boolean>(false);

  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const handleDownloadPDF = () => {
    if (!currentBrief) return;
    downloadBriefPDF(currentBrief);
  };

  const handleCopyClientSummary = () => {
    if (!currentBrief) return;
    const lines: string[] = [
      `📊 ${currentBrief.title}`,
      `Reporting Window: ${currentBrief.dateFrom || 'Overall'} to ${currentBrief.dateTo}`,
      '',
      '🎯 EXECUTIVE OVERVIEW:',
      currentBrief.executiveSummary,
      '',
      '⭐ KEY MILESTONE ACCOMPLISHMENTS:',
      ...(currentBrief.majorAccomplishments || []).map((m) => `• ${m}`),
      '',
      '🚀 NEXT STRATEGIC PRIORITIES:',
      ...(currentBrief.currentPriorities || []).map((p) => `• ${p}`),
    ];
    if (currentBrief.clientProgress && currentBrief.clientProgress.length > 0) {
      lines.push('', '📈 CLIENT PROGRESS HIGHLIGHTS:');
      currentBrief.clientProgress.slice(0, 4).forEach((cp) => {
        lines.push(`• ${cp.client}: ${cp.summary}`);
      });
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Dynamic executive calculations for active brief
  const scorecard = useMemo(() => {
    if (!currentBrief) return null;
    const blockedCount = (currentBrief.blockedWork || (currentBrief as any).blockedItems || []).length;
    const status = currentBrief.healthStatus || (blockedCount >= 3 ? 'at_risk' : blockedCount >= 1 ? 'needs_attention' : 'on_track');
    const score = currentBrief.healthScore || (blockedCount >= 3 ? 74 : blockedCount >= 1 ? 86 : 96);
    const label = currentBrief.healthStatusLabel || (blockedCount >= 3 ? 'At Risk • Critical Blockers Active' : blockedCount >= 1 ? 'Needs Attention • Client Dependencies' : 'On Track • Strong Delivery Velocity');

    const completed = currentBrief.cardsCompletedCount ?? 0;
    const active = currentBrief.activePipelineCount ?? 0;
    const total = completed + active || 1;
    const velocity = currentBrief.deliveryVelocityRate ?? Math.min(100, Math.max(30, Math.round((completed / total) * 100)));

    const inReviewCount = (currentBrief.sourceCards || []).filter((s) => s.status === 'In Review').length;

    const bluf = currentBrief.bluf || {
      currentState: `${currentBrief.clientTarget ? `For ${currentBrief.clientTarget}, the` : 'The'} team is advancing ${active} active deliverables, having verified ${completed} cards completed in this reporting cycle.`,
      criticalBlocker: blockedCount > 0
        ? (currentBrief.blockedWork || (currentBrief as any).blockedItems || [])[0]
        : 'No critical blockers identified. Client approval gates and technical pipelines are progressing on schedule.',
      managementPriority: (currentBrief.currentPriorities && currentBrief.currentPriorities.length > 0)
        ? currentBrief.currentPriorities[0]
        : 'Maintain scheduled velocity on service page expansions and ensure 48-hour turnarounds on quality review items.',
    };

    return {
      status,
      score,
      label,
      velocity,
      inReviewCount,
      bluf,
      resourceAllocation: currentBrief.resourceAllocation || [],
    };
  }, [currentBrief]);

  return (
    <div id="brief-view" className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Left Sidebar: Controls & Saved Briefs */}
      <div className="lg:col-span-1 space-y-4">
        {/* Generator Card */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-900 font-bold mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C52F5]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Synthesize Dossier</span>
          </div>
          <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
            Generate an executive management report with verified deliverables, operational velocity, and client dependencies.
          </p>

          <div className="space-y-3">
            {/* Target Client Scope Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-[#7C52F5]" />
                <span>Target Client Focus</span>
              </label>
              <select
                id="brief-client-scope-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#7C52F5] transition-all cursor-pointer"
              >
                <option value="all">⭐ All Clients (Full Agency Portfolio)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.canonicalName}>
                    {c.canonicalName} ({c.activeCardCount || 0} active cards)
                  </option>
                ))}
              </select>
            </div>

            {/* Reporting Window */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Reporting Window</span>
              </label>
              <div className="space-y-1.5">
                <button
                  id="period-btn-overall"
                  onClick={() => setSelectedPeriod('overall')}
                  className={`w-full px-3 py-2 text-xs rounded-lg border font-semibold transition-all cursor-pointer text-center ${
                    selectedPeriod === 'overall'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  Overall Summary (Active Pipeline)
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'this_week', label: 'Last 7 Days' },
                    { id: 'last_week', label: 'Last Week' },
                    { id: 'this_month', label: 'Last 30 Days' },
                    { id: 'last_month', label: 'Last Month' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      id={`period-btn-${item.id}`}
                      onClick={() => setSelectedPeriod(item.id as any)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border font-semibold transition-all cursor-pointer text-center ${
                        selectedPeriod === item.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  id="period-btn-custom"
                  onClick={() => setSelectedPeriod('custom')}
                  className={`w-full mt-1 px-3 py-1.5 text-xs rounded-lg border font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    selectedPeriod === 'custom'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Custom Date Window</span>
                </button>

                {selectedPeriod === 'custom' && (
                  <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-lg space-y-2 mt-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Start Date (From)
                      </label>
                      <input
                        type="date"
                        id="custom-date-from"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#7C52F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        End Date (To)
                      </label>
                      <input
                        type="date"
                        id="custom-date-to"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#7C52F5]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              id="generate-brief-btn"
              onClick={() =>
                onGenerateBrief(
                  selectedPeriod,
                  selectedPeriod === 'custom' ? customFrom : undefined,
                  selectedPeriod === 'custom' ? customTo : undefined,
                  selectedClient !== 'all' ? selectedClient : undefined
                )
              }
              disabled={isGenerating}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] active:from-[#572FD6] active:to-[#461EC6] text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs hover:shadow-md disabled:opacity-60 cursor-pointer group"
            >
              <FileText className="w-3.5 h-3.5 group-hover:scale-105 transition-transform" />
              <span>{isGenerating ? 'Synthesizing Dossier...' : 'Generate Executive Brief'}</span>
            </button>
          </div>
        </div>

        {/* Saved Briefs History & Archive */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Brief Archive
              </span>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {(savedBriefs || []).length} saved
              </span>
            </div>
            {onClearBriefs && (savedBriefs || []).length > 0 && (
              <button
                id="clear-all-briefs-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all archived executive briefs?')) {
                    onClearBriefs();
                  }
                }}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-medium flex items-center space-x-1 hover:underline cursor-pointer"
                title="Clear all archived executive briefs"
              >
                <span>Clear</span>
              </button>
            )}
          </div>

          {(savedBriefs || []).length === 0 ? (
            <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
              No briefs generated yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {(savedBriefs || []).map((brief) => {
                const isSelected = currentBrief?.id === brief.id;
                return (
                  <div
                    key={brief.id}
                    onClick={() => onSelectBrief(brief)}
                    className={`group p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-violet-50/70 border-[#7C52F5]/60 text-slate-900 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {brief.clientTarget && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 shrink-0">
                            {brief.clientTarget}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(brief.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-xs font-semibold truncate leading-snug">
                        {brief.title}
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                        {brief.cardsCompletedCount
                          ? `${brief.cardsCompletedCount} completed`
                          : `${brief.activePipelineCount || 0} active`}
                        {' • '}
                        {brief.periodType.replace('_', ' ')}
                      </div>
                    </div>

                    {onDeleteBrief && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBrief(brief.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Delete brief"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Rendered Executive Brief Document */}
      <div className="lg:col-span-3">
        {isGenerating ? (
          <BriefDocumentSkeleton isSynthesizing={true} />
        ) : currentBrief ? (
          <div
            id="brief-document"
            className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5 relative overflow-hidden"
          >
            {/* Top Decorative Brand Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#09061A] via-[#7C52F5] to-[#683EE6]" />

            {/* Document Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7C52F5] bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100">
                    <Sparkles className="w-3 h-3" />
                    <span>{viewMode === 'client' ? 'Client Presentation Summary' : 'Executive Management Dossier'}</span>
                  </div>

                  {currentBrief.clientTarget && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      <Target className="w-3 h-3 text-amber-600" />
                      {currentBrief.clientTarget}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                  {currentBrief.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5 font-medium">
                  <span className="flex items-center bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    <Calendar className="w-3 h-3 mr-1 text-[#7C52F5]" />
                    Window: {currentBrief.dateFrom || 'Overall'} to {currentBrief.dateTo}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-[11px] text-slate-400">
                    Compiled: {new Date(currentBrief.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* View Switcher & Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* View Mode Toggle Pill */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('management')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'management'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 text-[#7C52F5]" />
                    <span>Management</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('client')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'client'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3 h-3 text-indigo-600" />
                    <span>Client View</span>
                  </button>
                </div>

                {/* Copy Summary Button */}
                <button
                  type="button"
                  onClick={handleCopyClientSummary}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                  title="Copy executive bullet points to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Brief</span>
                    </>
                  )}
                </button>

                {/* PDF Download Button */}
                <button
                  id="brief-download-pdf-btn"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer group"
                  title="Download executive brief as a formatted vector PDF"
                >
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* TOP-LINE EXECUTIVE HEALTH & VELOCITY SCORECARD */}
            {scorecard && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-sm">
                {/* Account / Portfolio Health */}
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      scorecard.status === 'on_track'
                        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                        : scorecard.status === 'needs_attention'
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Operational Health
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                          scorecard.status === 'on_track'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : scorecard.status === 'needs_attention'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            scorecard.status === 'on_track'
                              ? 'bg-emerald-400 animate-pulse'
                              : scorecard.status === 'needs_attention'
                              ? 'bg-amber-400'
                              : 'bg-rose-400 animate-ping'
                          }`}
                        />
                        {scorecard.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                      {scorecard.label}
                    </div>
                  </div>
                </div>

                {/* Delivery Velocity */}
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                      Delivery Velocity
                    </span>
                    <span className="text-indigo-300 font-mono text-xs">{scorecard.velocity}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C52F5] to-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${scorecard.velocity}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    {currentBrief.cardsCompletedCount ?? 0} delivered • {currentBrief.activePipelineCount ?? 0} active in pipeline
                  </div>
                </div>

                {/* Review Gate & SLA */}
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Quality Review Gate
                    </span>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <span>{scorecard.inReviewCount} items in review</span>
                      <span className="text-[10px] text-emerald-400 font-medium font-mono">
                        (48hr target SLA)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Doctor & Leadership verification gate
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BLUF (BOTTOM LINE UP FRONT) MANAGEMENT HIGHLIGHT BOX */}
            {scorecard?.bluf && (
              <div className="bg-gradient-to-br from-violet-50/70 via-white to-amber-50/40 border border-violet-200/90 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-violet-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#7C52F5]" />
                    <span>BLUF: Bottom Line Up Front (Executive Summary)</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Leadership Takeaways
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Current State */}
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Current Operational State:
                    </span>
                    <p className="text-slate-700 leading-relaxed text-[11.5px]">
                      {scorecard.bluf.currentState}
                    </p>
                  </div>

                  {/* Critical Blocker */}
                  <div className="space-y-1">
                    <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      Critical Risk / Blocker:
                    </span>
                    <p className="text-amber-950/90 leading-relaxed text-[11.5px]">
                      {scorecard.bluf.criticalBlocker}
                    </p>
                  </div>

                  {/* Immediate Leadership Priority */}
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-900 flex items-center gap-1 text-[11px]">
                      <Target className="w-3 h-3 text-indigo-600 shrink-0" />
                      Immediate Management Priority:
                    </span>
                    <p className="text-indigo-950/90 leading-relaxed text-[11.5px]">
                      {scorecard.bluf.managementPriority}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {currentBrief.periodType === 'overall' ? (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 col-span-2 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                      Total Active Deliverables
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 block tabular-nums">
                      {currentBrief.activePipelineCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-400">Active board pipeline items</span>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3.5 col-span-2 shadow-2xs">
                    <span className="text-[10px] font-semibold text-emerald-700 block uppercase tracking-wider">
                      Quality Review Gate
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-0.5 block tabular-nums">
                      {(currentBrief.sourceCards || []).filter((s) => s.status === 'In Review').length || 'Active'}
                    </span>
                    <span className="text-[11px] text-emerald-600/80">Completed by team, pending review</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-semibold text-emerald-700 block uppercase tracking-wider">
                      Cards Completed
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 mt-0.5 block tabular-nums">
                      {currentBrief.cardsCompletedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-emerald-600/80">Delivered in period</span>
                  </div>
                  <div className="bg-violet-50/60 border border-violet-200/70 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-semibold text-violet-700 block uppercase tracking-wider">
                      Tasks Completed
                    </span>
                    <span className="text-2xl font-bold text-violet-700 mt-0.5 block tabular-nums">
                      {currentBrief.checklistTasksCompletedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-violet-600/80">Checklists finalized</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-600 block uppercase tracking-wider">
                      Cards Created
                    </span>
                    <span className="text-2xl font-bold text-slate-900 mt-0.5 block tabular-nums">
                      {currentBrief.cardsCreatedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">Initiated in window</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-600 block uppercase tracking-wider">
                      Active Pipeline
                    </span>
                    <span className="text-2xl font-bold text-slate-900 mt-0.5 block tabular-nums">
                      {currentBrief.activePipelineCount ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400">Currently in progress</span>
                  </div>
                </>
              )}
            </div>

            {/* Specialist Workload Allocation Strip (Management View only) */}
            {viewMode === 'management' && scorecard?.resourceAllocation && scorecard.resourceAllocation.length > 0 && (
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7C52F5]" />
                    <span>Specialist Workload & Resource Allocation</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Active vs Delivered Tasks</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {scorecard.resourceAllocation.map((ra, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs text-left"
                    >
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {ra.specialist}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] mt-1 text-slate-500">
                        <span className="font-semibold text-violet-700 bg-violet-50 px-1 rounded">
                          {ra.activeCount} active
                        </span>
                        <span>•</span>
                        <span className="font-medium text-emerald-700">
                          {ra.completedCount} done
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executive Summary Narrative */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4.5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7C52F5]" />
                <span>Executive Narrative Overview</span>
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {currentBrief.executiveSummary}
              </p>
            </div>

            {/* Major Accomplishments */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4.5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Major Accomplishments & Milestones</span>
              </h3>
              <ul className="space-y-2">
                {(currentBrief.majorAccomplishments || []).map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 mr-2.5 shrink-0" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SEO & Content Activities (2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-2.5 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7C52F5]" />
                  <span>Technical SEO & Infrastructure</span>
                </h4>
                <ul className="space-y-1.5">
                  {(currentBrief.seoActivity || []).map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-600">
                      <span className="w-1 h-1 rounded-full bg-[#7C52F5] mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-2.5 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Content Strategy & Entity Authority</span>
                </h4>
                <ul className="space-y-1.5">
                  {(currentBrief.contentActivity || []).map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-600">
                      <span className="w-1 h-1 rounded-full bg-indigo-600 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Overview & GEO Initiatives */}
            <div className="bg-gradient-to-b from-violet-50/40 via-white to-violet-50/20 border border-violet-200/90 rounded-xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-950 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#7C52F5]" />
                  <span>AI Overviews & Generative Engine Optimization (GEO)</span>
                </h3>
                <span className="text-[10px] font-semibold text-violet-700 bg-violet-100/80 border border-violet-200/80 px-2.5 py-0.5 rounded-full">
                  Evidence-Based Strategic Impact
                </span>
              </div>
              <ul className="space-y-3">
                {(currentBrief.aiOverviewGeoActivity || []).map((item, idx) => {
                  const match = item.match(/^(\[[^\]]+\]\s*[^:]+:)([\s\S]*)$/);
                  if (match) {
                    return (
                      <li
                        key={idx}
                        className="flex items-start text-xs sm:text-sm text-slate-800 bg-white/80 p-3 rounded-lg border border-violet-100/90 shadow-2xs hover:border-violet-200 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7C52F5] mt-1.5 mr-2.5 shrink-0" />
                        <div className="leading-relaxed">
                          <span className="font-bold text-slate-900 block sm:inline sm:mr-1.5 text-violet-950">
                            {match[1]}
                          </span>
                          <span className="text-slate-700 font-normal">
                            {match[2].trim()}
                          </span>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={idx}
                      className="flex items-start text-xs sm:text-sm text-slate-800 bg-white/80 p-3 rounded-lg border border-violet-100/90 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C52F5] mt-1.5 mr-2.5 shrink-0" />
                      <span className="leading-relaxed text-slate-700">{item}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Client Progress Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Client Progress Matrix
                </h3>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Verified Deliverables & Milestone Execution
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(currentBrief.clientProgress || []).map((cp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs hover:border-violet-200 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-sm tracking-tight">{cp.client}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 border border-violet-100 text-violet-700">
                          {cp.status}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed font-normal">{cp.summary}</p>
                    </div>

                    {/* Granular Deliverables and Milestones */}
                    {((cp.completedCards && cp.completedCards.length > 0) ||
                      (cp.checklistHighlights && cp.checklistHighlights.length > 0) ||
                      (cp.activeDeliverables && cp.activeDeliverables.length > 0)) && (
                      <div className="space-y-2 pt-2.5 border-t border-slate-100 text-[11px]">
                        {cp.completedCards && cp.completedCards.length > 0 && (
                          <div>
                            <span className="font-bold text-emerald-800 block text-[10px] uppercase tracking-wider mb-1">
                              Completed Cards:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {cp.completedCards.map((cardName, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium text-[10px]"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[220px]">{cardName}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {cp.checklistHighlights && cp.checklistHighlights.length > 0 && (
                          <div>
                            <span className="font-bold text-violet-800 block text-[10px] uppercase tracking-wider mb-1">
                              Checklist Milestones:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {cp.checklistHighlights.map((itemName, iIdx) => (
                                <span
                                  key={iIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200/60 font-medium text-[10px]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                  <span className="truncate max-w-[220px]">{itemName}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {cp.activeDeliverables && cp.activeDeliverables.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                              Active Deliverables Underway:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {cp.activeDeliverables.map((deliv, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[10px]"
                                >
                                  <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[220px]">{deliv}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current Priorities & Blocked Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#7C52F5]" />
                  <span>Immediate Strategic Priorities</span>
                </h4>
                <ul className="space-y-1.5">
                  {(currentBrief.currentPriorities || []).map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C52F5] mt-1.5 mr-2 shrink-0" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Universally Applicable Blocked Deliverables & Dependencies */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Blocked Deliverables & Client Dependencies</span>
                  </h4>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100/80 text-amber-800 border border-amber-200/80">
                    Action Required
                  </span>
                </div>
                <ul className="space-y-2">
                  {(currentBrief.blockedWork || (currentBrief as any).blockedItems || []).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start text-xs text-amber-950 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2 shrink-0" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                  {(!currentBrief.blockedWork || (currentBrief.blockedWork.length === 0 && !(currentBrief as any).blockedItems?.length)) && (
                    <li className="text-xs text-slate-500 italic">
                      No active blockers or pending dependencies logged for this reporting period.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Grounding Source Cards (Management View only) */}
            {viewMode === 'management' && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#7C52F5]" />
                  <span>Connected Trello Cards ({(currentBrief.sourceCards || []).length} Verified Sources)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(currentBrief.sourceCards || []).map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectSource(card)}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-violet-50/30 hover:border-violet-300 transition-all text-xs cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <span className="font-medium text-slate-900 group-hover:text-[#7C52F5] line-clamp-1">
                          {card.title}
                        </span>
                        <a
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-[#7C52F5]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                        <span>{card.listName}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{card.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-[#7C52F5] border border-violet-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Executive Brief Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Select a client scope and reporting window on the left and synthesize a brief, or choose an existing document from the archive.
            </p>
            <button
              onClick={() => onGenerateBrief(selectedPeriod, undefined, undefined, selectedClient !== 'all' ? selectedClient : undefined)}
              className="px-4 py-2 bg-gradient-to-r from-[#7C52F5] to-[#683EE6] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow-md cursor-pointer transition-all"
            >
              Generate Overall Summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const BriefView = React.memo(BriefViewComponent);
