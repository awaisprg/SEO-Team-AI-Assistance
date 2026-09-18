import React, { useState } from 'react';
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
} from 'lucide-react';
import { ClientEntity, UserRole } from '../types';

interface ClientsViewProps {
  clients: ClientEntity[];
  role: UserRole;
  onAddAlias: (clientId: string, alias: string) => void;
  onAskAboutClient: (clientName: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  role,
  onAddAlias,
  onAskAboutClient,
}) => {
  const [newAliasInputs, setNewAliasInputs] = useState<Record<string, string>>({});

  const handleAddAlias = (clientId: string) => {
    const val = newAliasInputs[clientId]?.trim();
    if (!val) return;
    onAddAlias(clientId, val);
    setNewAliasInputs((prev) => ({ ...prev, [clientId]: '' }));
  };

  return (
    <div id="clients-view" className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7C52F5] bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100 mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Account Intelligence</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Client Initiatives & Workstreams
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Canonical account profiles, milestone completion rates, team assignments, and Trello card alias mappings.
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/80 font-semibold w-fit shadow-2xs">
          {(clients || []).length} Active Accounts
        </span>
      </div>

      {/* Client Dossier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(clients || []).map((client) => {
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
                          className={`text-[9.5px] font-bold px-2 py-0.2 rounded uppercase tracking-wider ${
                            client.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : client.status === 'Onboarding'
                              ? 'bg-violet-50 text-violet-700 border border-violet-200/70'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/70'
                          }`}
                        >
                          {client.status}
                        </span>
                        {client.primaryInitiative && (
                          <span className="text-[11px] text-slate-500 font-medium line-clamp-1">
                            {client.primaryInitiative}
                          </span>
                        )}
                      </div>
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
                    <span className="text-slate-500 font-medium">Milestone Progress</span>
                    <span className="font-bold text-slate-900 tabular-nums text-[11px]">
                      {client.completedTasksCount} / {client.totalTasksCount} tasks ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#09061A] to-[#7C52F5] h-2 rounded-full transition-all duration-500"
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
                <span className="text-[11px]">Updated: {new Date(client.lastActivityAt).toLocaleDateString()}</span>
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
