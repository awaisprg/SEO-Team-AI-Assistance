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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Client Initiatives & Workstreams</h2>
          <p className="text-xs text-slate-500">
            Canonical client mappings, milestone completion, team assignments, and Trello aliases
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium w-fit">
          {clients.length} Tracked Accounts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => {
          const isExpanded = expandedId === client.id;
          const progressPercent = client.totalTasksCount
            ? Math.round((client.completedTasksCount / client.totalTasksCount) * 100)
            : 0;

          return (
            <div
              key={client.id}
              id={`client-card-${client.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {client.canonicalName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            client.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : client.status === 'Onboarding'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {client.status}
                        </span>
                        {client.primaryInitiative && (
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {client.primaryInitiative}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    id={`ask-about-${client.id}`}
                    onClick={() => onAskAboutClient(`What is happening with ${client.canonicalName} right now?`)}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-colors cursor-pointer shrink-0"
                    title="Query Assistant about this client"
                  >
                    Query Account
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Workflow Milestones</span>
                    <span className="font-semibold text-slate-900">
                      {client.completedTasksCount} / {client.totalTasksCount} completed ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center space-x-2 mb-3 text-xs text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">Assigned Team:</span>
                  <div className="flex flex-wrap gap-1">
                    {client.teamMembers.length > 0 ? (
                      client.teamMembers.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None assigned</span>
                    )}
                  </div>
                </div>

                {/* Aliases Section */}
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center">
                      <Tag className="w-3 h-3 mr-1 text-slate-400" />
                      Trello Detection Aliases:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.aliases.map((alias, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200"
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
                        placeholder="Add new alias..."
                        value={newAliasInputs[client.id] || ''}
                        onChange={(e) =>
                          setNewAliasInputs((prev) => ({
                            ...prev,
                            [client.id]: e.target.value,
                          }))
                        }
                        className="flex-1 text-xs px-2.5 py-1 rounded border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                      />
                      <button
                        onClick={() => handleAddAlias(client.id)}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs cursor-pointer"
                        title="Add Alias"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Last updated: {new Date(client.lastActivityAt).toLocaleDateString()}</span>
                <button
                  onClick={() => onAskAboutClient(`Summarize all completed and pending tasks for ${client.canonicalName}`)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  View Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
