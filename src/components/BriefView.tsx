import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Printer,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ManagementBrief, ChatSource } from '../types';

interface BriefViewProps {
  currentBrief: ManagementBrief | null;
  savedBriefs: ManagementBrief[];
  onGenerateBrief: (periodType: 'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month') => void;
  onSelectBrief: (brief: ManagementBrief) => void;
  isGenerating: boolean;
  onSelectSource: (source: ChatSource) => void;
}

export const BriefView: React.FC<BriefViewProps> = ({
  currentBrief,
  savedBriefs,
  onGenerateBrief,
  onSelectBrief,
  isGenerating,
  onSelectSource,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'overall' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
  >('overall');
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    if (!currentBrief) return;
    const md = `# ${currentBrief.title}
Period: ${currentBrief.dateFrom} to ${currentBrief.dateTo}

## Executive Summary
${currentBrief.executiveSummary}

## Major Accomplishments
${currentBrief.majorAccomplishments.map((a) => `- ${a}`).join('\n')}

## SEO Activities
${currentBrief.seoActivity.map((a) => `- ${a}`).join('\n')}

## Content & E-E-A-T Strategy
${currentBrief.contentActivity.map((a) => `- ${a}`).join('\n')}

## AI Overview & GEO Initiatives
${currentBrief.aiOverviewGeoActivity.map((a) => `- ${a}`).join('\n')}

## Client Progress
${currentBrief.clientProgress.map((c) => `- **${c.client}** (${c.status}): ${c.summary}`).join('\n')}

## Current Priorities
${currentBrief.currentPriorities.map((p) => `- ${p}`).join('\n')}

## Blocked or Delayed Items
${currentBrief.blockedWork.map((b) => `- ${b}`).join('\n')}

## Senior Management Talking Points
${currentBrief.talkingPoints.map((tp) => `- ${tp}`).join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="brief-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar: Controls & Saved Briefs */}
      <div className="lg:col-span-1 space-y-4">
        {/* Generator Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm">Generate Executive Brief</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Create an executive-level status report with accomplishments, AI/GEO updates, client progress, and blockers.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reporting Period
              </label>
              <div className="space-y-1.5">
                <button
                  id="period-btn-overall"
                  onClick={() => setSelectedPeriod('overall')}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer text-center ${
                    selectedPeriod === 'overall'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Overall Summary (Active Pipeline)
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'this_week', label: 'Last 7 Days (Week)' },
                    { id: 'last_week', label: 'Last Week' },
                    { id: 'this_month', label: 'Last 30 Days (Month)' },
                    { id: 'last_month', label: 'Last Month' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      id={`period-btn-${item.id}`}
                      onClick={() => setSelectedPeriod(item.id as any)}
                      className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer text-center ${
                        selectedPeriod === item.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              id="generate-brief-btn"
              onClick={() => onGenerateBrief(selectedPeriod)}
              disabled={isGenerating}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{isGenerating ? 'Synthesizing Brief...' : 'Generate Brief'}</span>
            </button>
          </div>
        </div>

        {/* Saved Briefs History */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Brief Archive
            </span>
            <span className="text-[11px] text-slate-400">{savedBriefs.length} saved</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {savedBriefs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No saved briefs yet.</p>
            ) : (
              savedBriefs.map((brief) => (
                <button
                  key={brief.id}
                  id={`saved-brief-${brief.id}`}
                  onClick={() => onSelectBrief(brief)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs cursor-pointer ${
                    currentBrief?.id === brief.id
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-medium line-clamp-1">{brief.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{new Date(brief.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Content: Rendered Brief Document */}
      <div className="lg:col-span-3">
        {currentBrief ? (
          <div
            id="brief-document"
            className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
          >
            {/* Document Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Executive Management Brief
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
                  {currentBrief.title}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    Period: {currentBrief.dateFrom} to {currentBrief.dateTo}
                  </span>
                  <span>•</span>
                  <span>Generated: {new Date(currentBrief.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="brief-copy-btn"
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>

                <button
                  id="brief-print-btn"
                  onClick={handlePrint}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentBrief.periodType === 'overall' ? (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 col-span-2">
                    <span className="text-[11px] font-medium text-slate-500 block">Total Active Deliverables</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{currentBrief.activePipelineCount ?? 0}</span>
                    <span className="text-[10px] text-slate-400">All uncompleted cards across board</span>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 col-span-2">
                    <span className="text-[11px] font-medium text-emerald-800 block">Quality Review Gate</span>
                    <span className="text-xl font-bold text-emerald-900 mt-0.5 block">
                      {currentBrief.sourceCards.filter((s) => s.status === 'In Review').length || 'Active'}
                    </span>
                    <span className="text-[10px] text-emerald-700">Completed by team, pending review</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-emerald-800 block">Cards Completed</span>
                    <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{currentBrief.cardsCompletedCount ?? 0}</span>
                    <span className="text-[10px] text-emerald-700">Marked complete in period</span>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-blue-800 block">Checklist Items</span>
                    <span className="text-xl font-bold text-blue-900 mt-0.5 block">{currentBrief.checklistTasksCompletedCount ?? 0}</span>
                    <span className="text-[10px] text-blue-700">Finalized deliverables</span>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-indigo-800 block">Cards Created</span>
                    <span className="text-xl font-bold text-indigo-900 mt-0.5 block">{currentBrief.cardsCreatedCount ?? 0}</span>
                    <span className="text-[10px] text-indigo-700">Initiated in period</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[11px] font-medium text-slate-600 block">Active Pipeline</span>
                    <span className="text-xl font-bold text-slate-900 mt-0.5 block">{currentBrief.activePipelineCount ?? 0}</span>
                    <span className="text-[10px] text-slate-500">Currently in progress</span>
                  </div>
                </>
              )}
            </div>

            {/* Executive Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Executive Summary
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {currentBrief.executiveSummary}
              </p>
            </div>

            {/* Major Accomplishments */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Major Accomplishments</span>
              </h3>
              <ul className="space-y-1.5">
                {currentBrief.majorAccomplishments.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SEO & Content Activities (2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Technical SEO & Infrastructure
                </h4>
                <ul className="space-y-1.5">
                  {currentBrief.seoActivity.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Content & Medical E-E-A-T
                </h4>
                <ul className="space-y-1.5">
                  {currentBrief.contentActivity.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Overview & GEO Initiatives */}
            <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-2 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>AI Overviews & Generative Engine Optimization (GEO)</span>
              </h3>
              <ul className="space-y-1.5">
                {currentBrief.aiOverviewGeoActivity.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-purple-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2 mr-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Client Progress */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2.5">Client Progress Matrix</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentBrief.clientProgress.map((cp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">{cp.client}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700">
                        {cp.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{cp.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Priorities & Blocked Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Immediate Priorities
                </h4>
                <ul className="space-y-1.5">
                  {currentBrief.currentPriorities.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Blocked / Awaiting Doctor Approval</span>
                </h4>
                <ul className="space-y-1.5">
                  {currentBrief.blockedWork.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-amber-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Senior Management Talking Points */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2.5">
                Key Senior Management Talking Points
              </h3>
              <ul className="space-y-2">
                {currentBrief.talkingPoints.map((tp, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 mr-2.5 shrink-0" />
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source Trello Cards Drawer */}
            {currentBrief.sourceCards && currentBrief.sourceCards.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                  Referenced Trello Cards ({currentBrief.sourceCards.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentBrief.sourceCards.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectSource(src)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                    >
                      <span className="line-clamp-1 max-w-[200px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Brief Generated Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Select a reporting period on the left and click "Generate Brief" to synthesize evidence across all active Trello cards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
