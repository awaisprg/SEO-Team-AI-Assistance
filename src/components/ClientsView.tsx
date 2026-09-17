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
  const [expandedId, setExpandedId] = useState<string | null>(clients[0]?.id || null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-[#EAEAEC] shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#8963FB] bg-[#F2F2FD] px-3 py-1 rounded-full border border-[#C6C1F3] mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Account Intelligence</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1A1A1E]">
            Client Initiatives & Workstreams
          </h2>
          <p className="text-xs text-[#5D5C68] mt-1">
            Canonical account profiles, milestone completion rates, team assignments, and Trello card alias mappings.
          </p>
        </div>
        <span className="text-xs px-3.5 py-1.5 rounded-xl bg-[#F2F2FD] text-[#2F20A2] border border-[#C6C1F3] font-bold w-fit shadow-2xs">
          {clients.length} Active Accounts
        </span>
      </div>

      {/* Client Dossier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => {
          const progressPercent = client.totalTasksCount
            ? Math.round((client.completedTasksCount / client.totalTasksCount) * 100)
            : 0;

          return (
            <div
              key={client.id}
              id={`client-card-${client.id}`}
              className="bg-white rounded-3xl border border-[#EAEAEC] hover:border-[#C6C1F3] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F2F2FD] to-white border border-[#C6C1F3] text-[#8963FB] flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1A1A1E] leading-tight group-hover:text-[#2F20A2] transition-colors">
                        {client.canonicalName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            client.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : client.status === 'Onboarding'
                              ? 'bg-[#F2F2FD] text-[#2F20A2] border border-[#C6C1F3]'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {client.status}
                        </span>
                        {client.primaryInitiative && (
                          <span className="text-[11px] text-[#5D5C68] font-medium line-clamp-1">
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
                    className="px-3.5 py-2 rounded-xl bg-[#F2F2FD] hover:bg-[#8963FB] text-[#2F20A2] hover:text-white border border-[#C6C1F3] hover:border-[#8963FB] text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-2xs"
                    title="Ask AI Assistant about this client"
                  >
                    Query Account
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-4 bg-[#F8F8FC] p-4 rounded-2xl border border-[#EAEAEC]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5D5C68] font-medium">Workflow Milestones</span>
                    <span className="font-bold text-[#1A1A1E] tabular-nums">
                      {client.completedTasksCount} / {client.totalTasksCount} completed ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#EAEAEC] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#2F20A2] to-[#8963FB] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center space-x-2 mb-3.5 text-xs text-[#5D5C68]">
                  <Users className="w-3.5 h-3.5 text-[#8963FB] shrink-0" />
                  <span className="font-bold text-[#1A1A1E]">Assigned Team:</span>
                  <div className="flex flex-wrap gap-1">
                    {client.teamMembers.length > 0 ? (
                      client.teamMembers.map((m, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-white border border-[#EAEAEC] text-[#1A1A1E] text-[11px] font-semibold shadow-2xs"
                        >
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#6E6D7B] italic">None assigned directly</span>
                    )}
                  </div>
                </div>

                {/* Aliases Section */}
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D5C68] font-semibold flex items-center text-[11px]">
                      <Tag className="w-3 h-3 mr-1 text-[#8963FB]" />
                      Trello Detection Aliases:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {client.aliases.map((alias, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8FF] text-[#2F20A2] text-[11px] font-mono border border-[#C6C1F3]"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>

                  {/* Add Alias (Admin only) */}
                  {role === 'ADMIN' && (
                    <div className="flex items-center space-x-1.5 pt-2">
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
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-[#EAEAEC] bg-[#F8F8FC] text-[#1A1A1E] focus:outline-hidden focus:border-[#8963FB]"
                      />
                      <button
                        onClick={() => handleAddAlias(client.id)}
                        className="p-2 rounded-xl bg-[#8963FB] hover:bg-[#7852E8] text-white text-xs cursor-pointer shadow-2xs transition-colors"
                        title="Add Alias"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3.5 mt-4 border-t border-[#EAEAEC] flex items-center justify-between text-xs text-[#6E6D7B]">
                <span>Last updated: {new Date(client.lastActivityAt).toLocaleDateString()}</span>
                <button
                  onClick={() =>
                    onAskAboutClient(
                      `Summarize all completed and pending tasks for ${client.canonicalName}`
                    )
                  }
                  className="text-[#8963FB] hover:text-[#2F20A2] font-bold cursor-pointer transition-colors flex items-center space-x-1"
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
