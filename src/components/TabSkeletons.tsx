import React from 'react';
import { Sparkles, FileText, Download, ShieldCheck, Activity } from 'lucide-react';

/**
 * ChatViewSkeleton
 * Replicates the dual-pane layout of the Management Assistant chat view
 * with left history sidebar, main message thread with user & assistant speech bubbles,
 * and prompt input dock with quick suggestions.
 */
export const ChatViewSkeleton: React.FC = () => {
  return (
    <div
      id="chat-view-skeleton"
      className="h-[calc(100vh-12rem)] min-h-[580px] flex overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs animate-in fade-in duration-200"
    >
      {/* Left History Sidebar Skeleton (hidden on small screens, shown on md+) */}
      <div className="hidden md:flex w-72 border-r border-slate-100 bg-slate-50/70 p-4 flex-col space-y-3.5 shrink-0">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md shimmer-box-violet shrink-0" />
            <div className="h-4 w-28 shimmer-box rounded-md" />
          </div>
          <div className="w-6 h-6 rounded-md shimmer-box shrink-0" />
        </div>

        {/* New Inquiry Button Skeleton */}
        <div className="h-9 w-full rounded-xl shimmer-box-violet" />

        {/* Search Bar Skeleton */}
        <div className="h-8 w-full rounded-lg shimmer-box" />

        {/* Session Items Skeleton */}
        <div className="space-y-2 pt-1 flex-1 overflow-hidden">
          <div className="h-3 w-16 shimmer-box rounded mb-1" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl border border-slate-100 bg-white space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-3.5 shimmer-box rounded"
                  style={{ width: `${65 + (i % 3) * 12}%` }}
                />
                <div className="w-3.5 h-3.5 rounded shimmer-box" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-14 shimmer-box rounded" />
                <div className="h-2 w-2 rounded-full shimmer-box" />
                <div className="h-2.5 w-10 shimmer-box rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Thread Pane Skeleton */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Chat Header Skeleton */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-white/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl shimmer-box-violet shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 w-44 sm:w-56 shimmer-box rounded-md" />
              <div className="h-3 w-32 sm:w-48 shimmer-box rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg shimmer-box hidden sm:block" />
            <div className="h-8 w-8 rounded-lg shimmer-box" />
          </div>
        </div>

        {/* Messages Body Skeleton */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-hidden bg-slate-50/30">
          {/* Assistant Initial Greeting Skeleton */}
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-violet-100 shimmer-box shrink-0 mt-0.5" />
            <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-36 shimmer-box-violet rounded" />
                <div className="h-4 w-16 shimmer-box rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full shimmer-box rounded" />
                <div className="h-3.5 w-11/12 shimmer-box rounded" />
                <div className="h-3.5 w-3/4 shimmer-box rounded" />
              </div>

              {/* Source Cards Row Shimmer */}
              <div className="pt-2 flex flex-wrap gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="h-10 w-44 rounded-lg border border-slate-100 bg-slate-50 shimmer-box"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* User Message Skeleton */}
          <div className="flex justify-end">
            <div className="max-w-md bg-slate-900/10 border border-slate-200/60 rounded-2xl rounded-tr-xs p-3.5 space-y-1.5">
              <div className="h-3.5 w-52 shimmer-box-dark rounded" />
              <div className="h-3.5 w-36 shimmer-box-dark rounded" />
            </div>
          </div>

          {/* Assistant Follow-up Skeleton */}
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-violet-100 shimmer-box shrink-0 mt-0.5" />
            <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="h-3.5 w-28 shimmer-box-violet rounded" />
              <div className="space-y-2">
                <div className="h-3.5 w-full shimmer-box rounded" />
                <div className="h-3.5 w-5/6 shimmer-box rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar & Suggestion Chips Skeleton */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white space-y-2.5">
          {/* Chips */}
          <div className="flex items-center gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((c) => (
              <div
                key={c}
                className="h-6 w-28 sm:w-36 rounded-full shimmer-box shrink-0"
              />
            ))}
          </div>

          {/* Input Dock */}
          <div className="h-12 w-full rounded-xl border border-slate-200 shimmer-box flex items-center justify-between px-3" />
        </div>
      </div>
    </div>
  );
};

/**
 * BriefDocumentSkeleton
 * The right-hand document view of an executive dossier.
 * Can be shown during tab transition or when synthesizing a brief.
 */
export const BriefDocumentSkeleton: React.FC<{ isSynthesizing?: boolean }> = ({
  isSynthesizing = false,
}) => {
  return (
    <div
      id="brief-document-skeleton"
      className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5 relative overflow-hidden animate-in fade-in duration-200"
    >
      {/* Brand Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-500 animate-pulse" />

      {/* Synthesis Active Banner */}
      {isSynthesizing && (
        <div className="bg-violet-50/90 border border-violet-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-[#7C52F5]">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4 animate-spin text-[#7C52F5]" />
            <span>Synthesizing live executive intelligence across 639 indexed cards...</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-violet-200">
            Compiling
          </span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
        <div className="space-y-2">
          <div className="h-5 w-44 rounded-md shimmer-box-violet" />
          <div className="h-7 w-72 sm:w-96 rounded-md shimmer-box" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-44 rounded shimmer-box" />
            <div className="h-4 w-32 rounded shimmer-box" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-lg shimmer-box shrink-0" />
      </div>

      {/* 4 KPI Metrics Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2 shadow-2xs"
          >
            <div className="h-2.5 w-24 rounded shimmer-box" />
            <div className="h-7 w-14 rounded-md shimmer-box-dark" />
            <div className="h-2.5 w-28 rounded shimmer-box" />
          </div>
        ))}
      </div>

      {/* Executive Summary Narrative Skeleton */}
      <div className="p-4 sm:p-5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shimmer-box-violet" />
          <div className="h-4 w-48 rounded shimmer-box" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded shimmer-box" />
          <div className="h-3.5 w-11/12 rounded shimmer-box" />
          <div className="h-3.5 w-4/5 rounded shimmer-box" />
        </div>
      </div>

      {/* AI & GEO Strategic Workstream Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shimmer-box-violet" />
          <div className="h-4 w-56 rounded shimmer-box" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-100 bg-white space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded shimmer-box-violet" />
                <div className="h-4 w-16 rounded-full shimmer-box" />
              </div>
              <div className="h-4 w-48 rounded shimmer-box" />
              <div className="h-3 w-full rounded shimmer-box" />
              <div className="h-3 w-5/6 rounded shimmer-box" />
            </div>
          ))}
        </div>
      </div>

      {/* Client Accounts & Workstreams Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded shimmer-box-violet" />
          <div className="h-4 w-52 rounded shimmer-box" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((c) => (
            <div
              key={c}
              className="p-3.5 rounded-xl border border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1.5 min-w-[200px]">
                <div className="h-4 w-40 rounded shimmer-box" />
                <div className="h-3 w-28 rounded shimmer-box" />
              </div>
              <div className="flex-1 max-w-xs space-y-1">
                <div className="h-2 w-full rounded-full shimmer-box" />
                <div className="h-2.5 w-16 rounded shimmer-box" />
              </div>
              <div className="h-6 w-20 rounded-full shimmer-box" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * BriefViewSkeleton
 * Full BriefView tab skeleton with left synthesis controls and right dossier document.
 */
export const BriefViewSkeleton: React.FC = () => {
  return (
    <div
      id="brief-view-skeleton"
      className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-in fade-in duration-200"
    >
      {/* Left Sidebar Skeleton */}
      <div className="lg:col-span-1 space-y-4">
        {/* Synthesis Controller Card */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg shimmer-box-violet shrink-0" />
            <div className="h-4 w-32 rounded shimmer-box" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded shimmer-box" />
            <div className="h-3 w-4/5 rounded shimmer-box" />
          </div>

          <div className="space-y-2 pt-1">
            <div className="h-2.5 w-24 rounded shimmer-box" />
            <div className="h-8 w-full rounded-lg shimmer-box-dark" />
            <div className="grid grid-cols-2 gap-1.5">
              {[1, 2, 3, 4].map((b) => (
                <div key={b} className="h-7 rounded-lg shimmer-box" />
              ))}
            </div>
          </div>

          <div className="h-9 w-full rounded-lg shimmer-box-violet mt-2" />
        </div>

        {/* Saved Briefs Archive Card */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 rounded shimmer-box" />
            <div className="h-3 w-12 rounded shimmer-box" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5"
              >
                <div className="h-3.5 w-36 rounded shimmer-box" />
                <div className="h-2.5 w-20 rounded shimmer-box" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content: Rendered Brief Document Skeleton */}
      <div className="lg:col-span-3">
        <BriefDocumentSkeleton isSynthesizing={false} />
      </div>
    </div>
  );
};

/**
 * ClientsViewSkeleton
 * Replicates the Clients & Initiatives view with account search, filter pills,
 * metrics summary, and responsive card directory grid.
 */
export const ClientsViewSkeleton: React.FC = () => {
  return (
    <div
      id="clients-view-skeleton"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Header Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-md shimmer-box-violet" />
          <div className="h-6 w-60 sm:w-80 rounded-md shimmer-box" />
          <div className="h-3 w-72 sm:w-96 rounded shimmer-box" />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="h-9 w-44 rounded-lg shimmer-box" />
          <div className="h-9 w-52 rounded-lg shimmer-box" />
        </div>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex items-center justify-between"
          >
            <div className="space-y-1.5">
              <div className="h-2.5 w-20 rounded shimmer-box" />
              <div className="h-6 w-12 rounded shimmer-box-dark" />
            </div>
            <div className="w-8 h-8 rounded-lg shimmer-box shrink-0" />
          </div>
        ))}
      </div>

      {/* Client Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((c) => (
          <div
            key={c}
            className="bg-white rounded-xl border border-slate-200/90 p-4.5 space-y-3.5 shadow-2xs"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl shimmer-box-violet shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded shimmer-box" />
                  <div className="h-3 w-20 rounded shimmer-box" />
                </div>
              </div>
              <div className="h-5 w-16 rounded-full shimmer-box" />
            </div>

            {/* Workstream metrics */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="h-2 w-14 rounded shimmer-box" />
                <div className="h-4 w-8 rounded shimmer-box" />
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="h-2 w-16 rounded shimmer-box" />
                <div className="h-4 w-8 rounded shimmer-box" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full shimmer-box" />
              <div className="flex justify-between">
                <div className="h-2.5 w-16 rounded shimmer-box" />
                <div className="h-2.5 w-10 rounded shimmer-box" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="h-7 w-28 rounded-md shimmer-box" />
              <div className="h-7 w-20 rounded-md shimmer-box" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * TeamViewSkeleton
 * Replicates the Team Overview layout with capacity cards, task counts,
 * and list semantics status table.
 */
export const TeamViewSkeleton: React.FC = () => {
  return (
    <div
      id="team-view-skeleton"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Header Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-md shimmer-box-violet" />
          <div className="h-6 w-60 sm:w-80 rounded-md shimmer-box" />
          <div className="h-3 w-72 sm:w-96 rounded shimmer-box" />
        </div>
        <div className="h-8 w-44 rounded-lg shimmer-box shrink-0" />
      </div>

      {/* Member Overviews Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((m) => (
          <div
            key={m}
            className="bg-white rounded-xl border border-slate-200/90 p-4.5 space-y-3.5 shadow-2xs"
          >
            {/* Member Profile Row */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full shimmer-box-violet shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 rounded shimmer-box" />
                <div className="h-3 w-20 rounded shimmer-box" />
              </div>
              <div className="h-5 w-16 rounded-full shimmer-box shrink-0" />
            </div>

            {/* Capacity Stat Boxes */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="h-2.5 w-16 rounded shimmer-box" />
                <div className="h-5 w-10 rounded shimmer-box-dark" />
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="h-2.5 w-16 rounded shimmer-box" />
                <div className="h-5 w-10 rounded shimmer-box-dark" />
              </div>
            </div>

            {/* Recent Cards items */}
            <div className="space-y-2">
              <div className="h-2.5 w-24 rounded shimmer-box" />
              {[1, 2].map((t) => (
                <div
                  key={t}
                  className="p-2 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div className="h-3 w-36 rounded shimmer-box" />
                  <div className="h-4 w-14 rounded-full shimmer-box" />
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <div className="pt-2 border-t border-slate-100">
              <div className="h-8 w-full rounded-lg shimmer-box" />
            </div>
          </div>
        ))}
      </div>

      {/* Semantic List Mappings Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-44 rounded shimmer-box" />
            <div className="h-3 w-64 rounded shimmer-box" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((r) => (
            <div
              key={r}
              className="h-10 w-full rounded-lg border border-slate-100 shimmer-box flex items-center justify-between px-3"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
