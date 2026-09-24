import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  CheckCircle,
  Clock,
  Plus,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  PauseCircle,
  XCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { ClientEntity, UserRole } from '../types';

interface ClientsViewProps {
  clients: ClientEntity[];
  role: UserRole;
  onAddAlias: (clientId: string, alias: string) => void;
  onAskAboutClient: (clientName: string) => void;
}

const ClientsViewComponent: React.FC<ClientsViewProps> = ({
  clients,
  role,
  onAddAlias,
  onAskAboutClient,
}) => {
  const [newAliasInputs, setNewAliasInputs] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Hold' | 'Closed'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddAlias = (clientId: string) => {
    const val = newAliasInputs[clientId]?.trim();
    if (!val) return;
    onAddAlias(clientId, val);
    setNewAliasInputs((prev) => ({ ...prev, [clientId]: '' }));
  };

  const clientList = clients || [];

  const counts = useMemo(() => {
    let active = 0;
    let onHold = 0;
    let closed = 0;
    clientList.forEach((c) => {
      if (c.status === 'Active') active++;
      else if (c.status === 'On Hold') onHold++;
      else if (c.status === 'Closed') closed++;
    });
    return { active, onHold, closed, total: clientList.length };
  }, [clientList]);

  const filteredClients = useMemo(() => {
    return clientList.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.canonicalName.toLowerCase().includes(q);
        const matchesAlias = (c.aliases || []).some((a) => a.toLowerCase().includes(q));
        if (!matchesName && !matchesAlias) return false;
      }
      return true;
    });
  }, [clientList, statusFilter, searchQuery]);

  return (
    <div id="clients-view" className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7C52F5] bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100 mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Account Intelligence</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Client Accounts & Workstreams
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Trello-synchronized client directories, task delivery progress, team assignments, and account statuses across PDS and GFM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-2xs">
            {counts.active} Active
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold shadow-2xs">
            {counts.onHold} On Hold
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold shadow-2xs">
            {counts.closed} Closed / Terminated
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              statusFilter === 'All'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Accounts ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Clients ({counts.active})</span>
          </button>
          <button
            onClick={() => setStatusFilter('On Hold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${
              statusFilter === 'On Hold'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>On Hold ({counts.onHold})</span>
          </button>
          <button
            onClick={() => setStatusFilter('Closed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${
              statusFilter === 'Closed'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Closed / Terminated ({counts.closed})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search accounts or aliases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#7C52F5] focus:bg-white"
          />
        </div>
      </div>

      {/* Client Dossier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const progressPercent = client.totalTasksCount
            ? Math.round((client.completedTasksCount / client.totalTasksCount) * 100)
            : 0;
          const teamMembers = Array.isArray(client.teamMembers) ? client.teamMembers : [];
          const aliases = Array.isArray(client.aliases) ? client.aliases : [];

          return (
            <div
              key={client.id}
              id={`client-card-${client.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-violet-300 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-[#7C52F5] flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#7C52F5] transition-colors">
                        {client.canonicalName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            client.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : client.status === 'On Hold'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300/80'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                          }`}
                        >
                          {client.status === 'Active'
                            ? 'Active'
                            : client.status === 'On Hold'
                            ? 'On Hold'
                            : 'Closed / Terminated'}
                        </span>
                        {client.agency && (
                          <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {client.agency}
                          </span>
                        )}
                        {client.primaryInitiative && (
                          <span className="text-[11px] text-slate-500 font-medium line-clamp-1">
                            {client.primaryInitiative}
                          </span>
                        )}
                      </div>
                      {client.status === 'On Hold' && (
                        <p className="text-[10.5px] text-amber-700 font-medium mt-1">
                          Hold for now until next direction from support team
                        </p>
                      )}
                      {client.status === 'Closed' && (
                        <p className="text-[10.5px] text-slate-500 font-medium mt-1">
                          Discontinued services or terminated
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    id={`ask-about-${client.id}`}
                    onClick={() =>
                      onAskAboutClient(`What is happening with ${client.canonicalName} right now?`)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-[#7C52F5] border border-slate-200 hover:border-violet-200 text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-2xs"
                    title="Ask AI Assistant about this client"
                  >
                    Query Account
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-3.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Delivery Progress</span>
                    <span className="font-bold text-slate-900 tabular-nums text-[11px]">
                      {client.completedTasksCount} / {client.totalTasksCount} tasks ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        client.status === 'Active'
                          ? 'bg-gradient-to-r from-emerald-500 to-[#7C52F5]'
                          : client.status === 'On Hold'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center space-x-2 mb-3 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 text-[#7C52F5] shrink-0" />
                  <span className="font-semibold text-slate-800">Assigned Team:</span>
                  <div className="flex flex-wrap gap-1">
                    {teamMembers.length > 0 ? (
                      teamMembers.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-800 text-[10.5px] font-medium shadow-2xs"
                        >
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">None assigned directly</span>
                    )}
                  </div>
                </div>

                {/* Aliases Section */}
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center text-[10.5px]">
                      <Tag className="w-3 h-3 mr-1 text-[#7C52F5]" />
                      Trello Detection Aliases:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {aliases.map((alias, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[10px] font-mono border border-slate-200"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>

                  {/* Add Alias (Admin only) */}
                  {role === 'ADMIN' && (
                    <div className="flex items-center space-x-1.5 pt-1.5">
                      <input
                        type="text"
                        placeholder="Add new keyword alias..."
                        value={newAliasInputs[client.id] || ''}
                        onChange={(e) =>
                          setNewAliasInputs((prev) => ({
                            ...prev,
                            [client.id]: e.target.value,
                          }))
                        }
                        className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:border-[#7C52F5] focus:bg-white"
                      />
                      <button
                        onClick={() => handleAddAlias(client.id)}
                        className="p-1.5 rounded-lg bg-gradient-to-r from-[#7C52F5] to-[#683EE6] hover:from-[#6D42E6] hover:to-[#572FD6] text-white text-xs cursor-pointer shadow-2xs transition-colors"
                        title="Add Alias"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">
                  {client.lastActivityDate
                    ? `Last activity: ${new Date(client.lastActivityDate).toLocaleDateString()}`
                    : 'Tracked on board'}
                </span>
                <button
                  onClick={() =>
                    onAskAboutClient(
                      `Summarize all completed and pending tasks for ${client.canonicalName}`
                    )
                  }
                  className="text-[#7C52F5] hover:text-[#683EE6] font-semibold cursor-pointer transition-colors flex items-center space-x-1 text-[11px]"
                >
                  <span>Detailed Summary</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ClientsView = React.memo(ClientsViewComponent);
