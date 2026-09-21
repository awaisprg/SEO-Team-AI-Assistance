import React, { useState } from 'react';
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
} from 'lucide-react';
import { ManagementBrief, ChatSource } from '../types';
import { downloadBriefPDF } from '../utils/pdfGenerator';

interface BriefViewProps {
  currentBrief: ManagementBrief | null;
  savedBriefs: ManagementBrief[];
  onGenerateBrief: (
    periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom',
    dateFrom?: string,
    dateTo?: string
  ) => void;
  onSelectBrief: (brief: ManagementBrief) => void;
  onDeleteBrief?: (briefId: string) => void;
  onClearBriefs?: () => void;
  isGenerating: boolean;
  onSelectSource: (source: ChatSource) => void;
}

export const BriefView: React.FC<BriefViewProps> = ({
  currentBrief,
  savedBriefs,
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
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Generate an executive-level status report with verified accomplishments, AI/GEO updates, client progress, and doctor review gates.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Reporting Window
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
                  className={`w-full mt-1 px-3 py-2 text-xs rounded-lg border font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
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
                  selectedPeriod === 'custom' ? customTo : undefined
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
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {(!savedBriefs || savedBriefs.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No saved briefs yet.</p>
            ) : (
              (savedBriefs || []).map((brief) => (
                <div
                  key={brief.id}
                  className={`group flex items-center justify-between p-2 rounded-lg border transition-all text-xs ${
                    currentBrief?.id === brief.id
                      ? 'bg-violet-50/80 border-violet-200 text-[#7C52F5] font-semibold shadow-2xs ring-1 ring-violet-500/20'
                      : 'bg-white border-slate-200 hover:border-violet-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <button
                    id={`saved-brief-${brief.id}`}
                    onClick={() => onSelectBrief(brief)}
                    className="flex-1 text-left cursor-pointer min-w-0 pr-2"
                  >
                    <div className="font-semibold truncate text-slate-900">{brief.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                      <span>{new Date(brief.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize">{brief.periodType.replace('_', ' ')}</span>
                    </div>
                  </button>
                  {onDeleteBrief && (
                    <button
                      id={`delete-brief-${brief.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBrief(brief.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                      title="Delete this brief archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Content: Rendered Executive Brief Document */}
      <div className="lg:col-span-3">
        {currentBrief ? (
          <div
            id="brief-document"
            className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5 relative overflow-hidden"
          >
            {/* Top Decorative Brand Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#09061A] via-[#7C52F5] to-[#683EE6]" />

            {/* Document Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
              <div>
                <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7C52F5] bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100">
                  <Sparkles className="w-3 h-3" />
                  <span>Executive Management Dossier</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                  {currentBrief.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5 font-medium">
                  <span className="flex items-center bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    <Calendar className="w-3 h-3 mr-1 text-[#7C52F5]" />
                    Window: {currentBrief.dateFrom} to {currentBrief.dateTo}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-[11px] text-slate-400">
                    Compiled: {new Date(currentBrief.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="brief-download-pdf-btn"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer group"
                  title="Download executive brief as a formatted vector PDF"
                >
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Metrics Strip */}
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

            {/* Executive Summary */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4.5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7C52F5]" />
                <span>Executive Summary</span>
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
                  <span>Content & Medical E-E-A-T</span>
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

            {/* Client Progress */}
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

                    {/* Granular Deliverable and Milestone Highlights */}
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

            {/* Current Priorities & Blocked Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-2.5">
                  Immediate Priorities
                </h4>
                <ul className="space-y-1.5">
                  {(currentBrief.currentPriorities || []).map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-600">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-4 shadow-2xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2.5 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Blocked / Awaiting Doctor Approval</span>
                </h4>
                <ul className="space-y-1.5">
                  {(currentBrief.blockedWork || (currentBrief as any).blockedItems || []).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start text-xs text-amber-900 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Grounding Source Cards */}
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
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-[#7C52F5] border border-violet-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Executive Brief Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Select a reporting window on the left and synthesize a brief, or choose an existing document from the archive.
            </p>
            <button
              onClick={() => onGenerateBrief(selectedPeriod)}
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
