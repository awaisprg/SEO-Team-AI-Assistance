import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  UserX,
  PauseCircle,
  ArrowRight,
} from 'lucide-react';
import { TeamMetrics, TrelloCard, ClientEntity, ChatSource } from '../types';

interface MetricsBarProps {
  metrics: TeamMetrics | null;
  onSelectFilter: (topic: string) => void;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  allCards?: TrelloCard[];
  clients?: ClientEntity[];
  onSelectSource?: (source: ChatSource) => void;
}

const MetricsBarComponent: React.FC<MetricsBarProps> = ({
  metrics,
  onSelectFilter,
  isSyncing = false,
  lastSyncedAt,
}) => {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevLastSyncedRef = useRef<string | null | undefined>(lastSyncedAt);
  const prevMetricsRef = useRef<TeamMetrics | null>(metrics);
  const prevIsSyncingRef = useRef(isSyncing);
  const hasMountedRef = useRef(false);

  // Trigger pulse whenever sync completes or fresh metrics arrive from Trello
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevLastSyncedRef.current = lastSyncedAt;
      prevMetricsRef.current = metrics;
      prevIsSyncingRef.current = isSyncing;
      return;
    }

    const syncCompleted = prevIsSyncingRef.current && !isSyncing;
    const lastSyncUpdated =
      Boolean(lastSyncedAt) && lastSyncedAt !== prevLastSyncedRef.current;
    const metricsChanged =
      metrics &&
      prevMetricsRef.current &&
      (metrics.activeWork !== prevMetricsRef.current.activeWork ||
        metrics.completedThisMonth !== prevMetricsRef.current.completedThisMonth ||
        metrics.activeClients !== prevMetricsRef.current.activeClients ||
        metrics.onHoldClients !== prevMetricsRef.current.onHoldClients ||
        metrics.closedClients !== prevMetricsRef.current.closedClients ||
        metrics.inReview !== prevMetricsRef.current.inReview ||
        metrics.totalCards !== prevMetricsRef.current.totalCards);

    if (syncCompleted || lastSyncUpdated || metricsChanged) {
      setIsPulsing(true);
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 2300);

      prevLastSyncedRef.current = lastSyncedAt;
      prevMetricsRef.current = metrics;
      prevIsSyncingRef.current = isSyncing;
      return () => clearTimeout(timer);
    }

    prevLastSyncedRef.current = lastSyncedAt;
    prevMetricsRef.current = metrics;
    prevIsSyncingRef.current = isSyncing;
  }, [lastSyncedAt, metrics, isSyncing]);

  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      // 1st: Active Clients
      {
        id: 'metric-active-clients-btn',
        title: 'Active Clients',
        prompt: 'Show all active client accounts being worked on for PDS and GFM',
        value: metrics.activeClients,
        unit: 'PDS & GFM',
        badge: 'Active Accounts',
        dotColor: 'bg-blue-500',
        icon: Building2,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/60',
        glowBorder: '#3B82F6',
        glowColor: 'rgba(59, 130, 246, 0.38)',
        accentColor: '#2563EB',
      },
      // 2nd: On Hold Clients
      {
        id: 'metric-onhold-clients-btn',
        title: 'On Hold Clients',
        prompt: 'Which clients are currently on hold awaiting next direction from our support team?',
        value: metrics.onHoldClients,
        unit: 'pending direction',
        badge: 'On Hold',
        dotColor: 'bg-amber-500',
        icon: PauseCircle,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/60',
        glowBorder: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.38)',
        accentColor: '#D97706',
      },
      // 3rd: Closed / Terminated
      {
        id: 'metric-closed-clients-btn',
        title: 'Closed / Terminated',
        prompt: 'Which client accounts are closed, discontinued, or terminated?',
        value: metrics.closedClients,
        unit: 'discontinued',
        badge: 'Closed / Ended',
        dotColor: 'bg-rose-500',
        icon: UserX,
        iconColor: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900/60',
        glowBorder: '#F43F5E',
        glowColor: 'rgba(244, 63, 94, 0.38)',
        accentColor: '#E11D48',
      },
      // 4th: Active Tasks
      {
        id: 'metric-active-btn',
        title: 'Active Tasks',
        prompt: 'What tasks is the team actively working on right now?',
        value: metrics.activeWork,
        unit: 'in progress',
        badge: 'Active Work',
        dotColor: 'bg-violet-500',
        icon: Clock,
        iconColor: 'text-violet-600 dark:text-violet-400',
        iconBg: 'bg-violet-50/80 dark:bg-violet-950/60 border-violet-100 dark:border-violet-900/60',
        glowBorder: '#8B5CF6',
        glowColor: 'rgba(139, 92, 246, 0.40)',
        accentColor: '#7C52F5',
      },
      // 5th: In Review
      {
        id: 'metric-review-btn',
        title: 'In Review',
        prompt: 'What items are currently in review or awaiting approval?',
        value: metrics.inReview,
        unit: 'in review',
        badge: 'In Review',
        dotColor: 'bg-amber-500',
        icon: AlertCircle,
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/60',
        glowBorder: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.38)',
        accentColor: '#D97706',
      },
      // 6th: Completed Tasks
      {
        id: 'metric-completed-btn',
        title: 'Completed Tasks',
        prompt: 'What tasks did the team complete recently?',
        value: metrics.completedThisMonth,
        unit: 'completed',
        badge: 'Delivered',
        dotColor: 'bg-emerald-500',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/60',
        glowBorder: '#10B981',
        glowColor: 'rgba(16, 185, 129, 0.40)',
        accentColor: '#059669',
      },
    ];
  }, [metrics]);

  if (!metrics) {
    return (
      <div id="metrics-bar-skeleton" className="mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded shimmer-box" />
                <div className="w-7 h-7 rounded-xl shimmer-box" />
              </div>
              <div className="space-y-1">
                <div className="h-7 w-12 rounded shimmer-box-dark" />
                <div className="h-2.5 w-16 rounded shimmer-box" />
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="h-4 w-16 rounded-full shimmer-box" />
                <div className="w-5 h-5 rounded-full shimmer-box" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="metrics-bar" className="mb-5">
      {/* Grid of KPI Cards (6 cards in requested order) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const staggerDelay = `${idx * 65}ms`;

          return (
            <button
              key={card.id}
              id={card.id}
              type="button"
              onClick={() => onSelectFilter(card.prompt)}
              title={`Click to query intelligence on: ${card.title}`}
              style={{
                ...(isPulsing ? { animationDelay: staggerDelay } : {}),
                ['--kpi-glow-border' as any]: card.glowBorder,
                ['--kpi-glow-color' as any]: card.glowColor,
              }}
              className={`relative p-3.5 rounded-2xl text-left cursor-pointer group flex flex-col justify-between overflow-hidden glass-card kpi-card-interactive focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isPulsing ? 'kpi-pulse-sync ring-1 ring-violet-500/40' : ''
              } ${isSyncing ? 'opacity-85' : ''}`}
            >
              {/* Sync sheen reflection overlay */}
              {isPulsing && (
                <div
                  className="kpi-sync-sheen"
                  style={{ animationDelay: `${idx * 65}ms` }}
                />
              )}

              {/* Subtle ambient light corner glow on hover */}
              <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full pointer-events-none opacity-0 group-hover:opacity-40 dark:group-hover:opacity-60 transition-opacity duration-300 blur-xl"
                style={{ backgroundColor: card.glowBorder }}
              />

              {/* Top row: Label & Icon */}
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight truncate pr-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {card.title}
                </span>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110 duration-200 ${card.iconBg} shadow-2xs`}
                >
                  <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                </div>
              </div>

              {/* Middle: Clean Counter Metric */}
              <div className="my-1.5 relative z-10">
                <div
                  style={isPulsing ? { animationDelay: `${idx * 65 + 100}ms` } : undefined}
                  className={`text-2xl sm:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-sans transition-transform ${
                    isPulsing ? 'kpi-number-pop' : ''
                  }`}
                >
                  {card.value}
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-tight truncate mt-1">
                  {card.unit}
                </div>
              </div>

              {/* Bottom Row: Unboxed Status indicator & Clear Query affordance */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/90 dark:border-slate-800/80 relative z-10 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.dotColor}`} />
                  <span className="truncate">{card.badge}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 transition-colors shrink-0 pl-1 group-hover:text-[var(--kpi-glow-border)]">
                  <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    Query
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-[var(--kpi-glow-border)] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const MetricsBar = React.memo(MetricsBarComponent);
