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
} from 'lucide-react';
import { ManagementBrief, ChatSource } from '../types';
import { downloadBriefPDF } from '../utils/pdfGenerator';

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

  const handleDownloadPDF = () => {
    if (!currentBrief) return;
    downloadBriefPDF(currentBrief);
  };

  return (
    <div id="brief-view" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar: Controls & Saved Briefs */}
      <div className="lg:col-span-1 space-y-4">
        {/* Generator Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAEAEC] shadow-xs">
          <div className="flex items-center space-x-2 text-[#1A1A1E] font-bold mb-2">
            <div className="w-7 h-7 rounded-xl bg-[#F2F2FD] border border-[#C6C1F3] flex items-center justify-center text-[#8963FB]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm">Synthesize Brief</span>
          </div>
          <p className="text-xs text-[#5D5C68] mb-4 leading-relaxed">
            Generate an executive-level status report with verified accomplishments, AI/GEO updates, client progress, and doctor review gates.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#5D5C68] mb-2 uppercase tracking-wider">
                Reporting Window
              </label>
              <div className="space-y-1.5">
                <button
                  id="period-btn-overall"
                  onClick={() => setSelectedPeriod('overall')}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border font-semibold transition-all cursor-pointer text-center ${
                    selectedPeriod === 'overall'
                      ? 'bg-[#1A1A1E] text-white border-[#1A1A1E] shadow-xs'
                      : 'bg-white text-[#5D5C68] border-[#EAEAEC] hover:bg-[#F8F8FC] hover:text-[#1A1A1E]'
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
                      className={`px-2.5 py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer text-center ${
                        selectedPeriod === item.id
                          ? 'bg-[#1A1A1E] text-white border-[#1A1A1E] shadow-xs'
                          : 'bg-white text-[#5D5C68] border-[#EAEAEC] hover:bg-[#F8F8FC] hover:text-[#1A1A1E]'
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
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs hover:shadow-md disabled:opacity-60 cursor-pointer group"
            >
              <FileText className="w-4 h-4 group-hover:scale-105 transition-transform" />
              <span>{isGenerating ? 'Synthesizing Brief...' : 'Generate Executive Brief'}</span>
            </button>
          </div>
        </div>

        {/* Saved Briefs History */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAEAEC] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#1A1A1E] uppercase tracking-wider">
              Brief Archive
            </span>
            <span className="text-[11px] text-[#6E6D7B] font-medium bg-[#F8F8FC] px-2 py-0.5 rounded-full border border-[#EAEAEC]">
              {savedBriefs.length} saved
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {savedBriefs.length === 0 ? (
              <p className="text-xs text-[#6E6D7B] italic">No saved briefs yet.</p>
            ) : (
              savedBriefs.map((brief) => (
                <button
                  key={brief.id}
                  id={`saved-brief-${brief.id}`}
                  onClick={() => onSelectBrief(brief)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                    currentBrief?.id === brief.id
                      ? 'bg-[#F2F2FD] border-[#C6C1F3] text-[#2F20A2] font-semibold shadow-2xs'
                      : 'bg-white border-[#EAEAEC] hover:border-[#8963FB]/40 text-[#5D5C68]'
                  }`}
                >
                  <div className="font-semibold line-clamp-1 text-[#1A1A1E]">{brief.title}</div>
                  <div className="text-[10px] text-[#6E6D7B] mt-1.5 flex items-center justify-between">
                    <span>{new Date(brief.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-3 h-3 text-[#6E6D7B]" />
                  </div>
                </button>
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
            className="bg-white rounded-3xl border border-[#EAEAEC] p-6 sm:p-8 shadow-xs space-y-6 relative overflow-hidden"
          >
            {/* Top Decorative Brand Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8963FB] via-[#A78AFD] to-[#2F20A2]" />

            {/* Document Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#EAEAEC] pb-5 pt-2">
              <div>
                <div className="inline-flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#8963FB] bg-[#F2F2FD] px-3 py-1 rounded-full border border-[#C6C1F3]">
                  <Sparkles className="w-3 h-3" />
                  <span>Gold Flex Marketing • Executive Management Dossier</span>
                </div>
                <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#1A1A1E] mt-2.5 tracking-tight">
                  {currentBrief.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#5D5C68] mt-2 font-medium">
                  <span className="flex items-center bg-[#F8F8FC] px-2.5 py-1 rounded-md border border-[#EAEAEC]">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#8963FB]" />
                    Window: {currentBrief.dateFrom} to {currentBrief.dateTo}
                  </span>
                  <span className="text-[#C6C1F3] hidden sm:inline">•</span>
                  <span className="text-[11px] text-[#6E6D7B]">
                    Compiled: {new Date(currentBrief.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="brief-download-pdf-btn"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#8963FB] hover:bg-[#7852E8] active:bg-[#683EE6] text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer group"
                  title="Download executive brief as a formatted vector PDF"
                >
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentBrief.periodType === 'overall' ? (
                <>
                  <div className="bg-[#F8F8FC] border border-[#EAEAEC] rounded-2xl p-4 col-span-2 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5D5C68] block uppercase tracking-wider">
                      Total Active Deliverables
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1E] mt-1 block tabular-nums">
                      {currentBrief.activePipelineCount ?? 0}
                    </span>
                    <span className="text-[11px] text-[#6E6D7B]">All uncompleted cards across board</span>
                  </div>
                  <div className="bg-[#EAF6EE] border border-[#198754]/30 rounded-2xl p-4 col-span-2 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#198754] block uppercase tracking-wider">
                      Quality Review Gate
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#198754] mt-1 block tabular-nums">
                      {currentBrief.sourceCards.filter((s) => s.status === 'In Review').length || 'Active'}
                    </span>
                    <span className="text-[11px] text-[#198754]/80">Completed by team, pending review</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#EAF6EE] border border-[#198754]/30 rounded-2xl p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#198754] block uppercase tracking-wider">
                      Cards Completed
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#198754] mt-1 block tabular-nums">
                      {currentBrief.cardsCompletedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-[#198754]/80">Marked complete in period</span>
                  </div>
                  <div className="bg-[#F2F2FD] border border-[#C6C1F3] rounded-2xl p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#2F20A2] block uppercase tracking-wider">
                      Checklist Items
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#2F20A2] mt-1 block tabular-nums">
                      {currentBrief.checklistTasksCompletedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-[#2F20A2]/80">Finalized deliverables</span>
                  </div>
                  <div className="bg-[#F8F8FC] border border-[#C6C1F3] rounded-2xl p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#8963FB] block uppercase tracking-wider">
                      Cards Created
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1E] mt-1 block tabular-nums">
                      {currentBrief.cardsCreatedCount ?? 0}
                    </span>
                    <span className="text-[10px] text-[#8963FB]">Initiated in period</span>
                  </div>
                  <div className="bg-[#F8F8FC] border border-[#EAEAEC] rounded-2xl p-4 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#5D5C68] block uppercase tracking-wider">
                      Active Pipeline
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1E] mt-1 block tabular-nums">
                      {currentBrief.activePipelineCount ?? 0}
                    </span>
                    <span className="text-[10px] text-[#6E6D7B]">Currently in progress</span>
                  </div>
                </>
              )}
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-[#FAF8FF] to-white border-l-4 border-[#8963FB] border-y border-r border-[#EAEAEC] rounded-r-2xl p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2F20A2] mb-2 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8963FB]" />
                <span>Executive Summary</span>
              </h3>
              <p className="text-sm text-[#1A1A1E] leading-relaxed font-normal">
                {currentBrief.executiveSummary}
              </p>
            </div>

            {/* Major Accomplishments */}
            <div className="bg-white rounded-2xl border border-[#EAEAEC] p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-[#1A1A1E] mb-3 flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Major Accomplishments & Key Milestones</span>
              </h3>
              <ul className="space-y-2.5">
                {currentBrief.majorAccomplishments.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-[#27272B]">
                    <span className="w-2 h-2 rounded-full bg-[#198754] mt-1.5 mr-2.5 shrink-0" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SEO & Content Activities (2 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F8F8FC] border border-[#EAEAEC] rounded-2xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1E] mb-3 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8963FB]" />
                  <span>Technical SEO & Infrastructure</span>
                </h4>
                <ul className="space-y-2">
                  {currentBrief.seoActivity.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-[#5D5C68]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8963FB] mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#F8F8FC] border border-[#EAEAEC] rounded-2xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1E] mb-3 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2F20A2]" />
                  <span>Content & Medical E-E-A-T</span>
                </h4>
                <ul className="space-y-2">
                  {currentBrief.contentActivity.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-[#5D5C68]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F20A2] mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Overview & GEO Initiatives */}
            <div className="bg-gradient-to-b from-[#F2F2FD] to-white border border-[#C6C1F3] rounded-2xl p-5 sm:p-6 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2F20A2] mb-3 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8963FB]" />
                <span>AI Overviews & Generative Engine Optimization (GEO)</span>
              </h3>
              <ul className="space-y-2.5">
                {currentBrief.aiOverviewGeoActivity.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-[#1A1A1E]">
                    <span className="w-2 h-2 rounded-full bg-[#8963FB] mt-1.5 mr-2.5 shrink-0" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Client Progress */}
            <div>
              <h3 className="text-sm font-bold text-[#1A1A1E] mb-3">Client Progress Matrix</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentBrief.clientProgress.map((cp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-[#EAEAEC] bg-white text-xs shadow-2xs hover:border-[#C6C1F3] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#1A1A1E] text-sm">{cp.client}</span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F2FD] border border-[#C6C1F3] text-[#2F20A2]">
                        {cp.status}
                      </span>
                    </div>
                    <p className="text-[#5D5C68] text-xs leading-relaxed">{cp.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Priorities & Blocked Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white border border-[#EAEAEC] rounded-2xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1E] mb-3">
                  Immediate Priorities
                </h4>
                <ul className="space-y-2">
                  {currentBrief.currentPriorities.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-[#5D5C68]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6E6D7B] mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#946200] mb-3 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFBE00]" />
                  <span>Blocked / Awaiting Doctor Approval</span>
                </h4>
                <ul className="space-y-2">
                  {currentBrief.blockedWork.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-[#946200]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFBE00] mt-1.5 mr-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Senior Management Talking Points */}
            <div className="bg-[#151932] text-white rounded-2xl p-6 sm:p-7 shadow-md border border-[#272D56]">
              <div className="flex items-center space-x-2 mb-3.5">
                <div className="w-6 h-6 rounded-lg bg-[#8963FB]/20 border border-[#8963FB]/40 flex items-center justify-center text-[#A78AFD]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A78AFD]">
                  Key Senior Management Talking Points
                </h3>
              </div>
              <ul className="space-y-3">
                {currentBrief.talkingPoints.map((tp, idx) => (
                  <li key={idx} className="flex items-start text-xs sm:text-sm text-[#EAEAEC] leading-relaxed">
                    <span className="w-2 h-2 rounded-full bg-[#8963FB] mt-1.5 mr-3 shrink-0" />
                    <span>{tp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source Trello Cards Drawer */}
            {currentBrief.sourceCards && currentBrief.sourceCards.length > 0 && (
              <div className="pt-4 border-t border-[#EAEAEC]">
                <span className="text-xs font-semibold text-[#5D5C68] uppercase tracking-wider block mb-2.5">
                  Referenced Trello Cards ({currentBrief.sourceCards.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentBrief.sourceCards.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectSource(src)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F8F8FC] hover:bg-[#F2F2FD] border border-[#EAEAEC] hover:border-[#8963FB] text-[#5D5C68] hover:text-[#2F20A2] text-xs font-medium transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="line-clamp-1 max-w-[200px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 text-[#6E6D7B]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEC] p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-[#F2F2FD] text-[#8963FB] border border-[#C6C1F3] flex items-center justify-center mb-4 shadow-2xs">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1E]">No Brief Generated Yet</h3>
            <p className="text-xs text-[#5D5C68] mt-1.5 max-w-sm mx-auto leading-relaxed">
              Select a reporting period on the left and click "Generate Executive Brief" to synthesize evidence across all active Trello cards and deliverables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
