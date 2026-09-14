import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Edit2,
  Check,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { TrelloList, UserRole, StatusSemantic, ListSemanticType } from '../types';

interface MemberOverview {
  member: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
  };
  activeCardsCount: number;
  completedActivitiesCount: number;
  recentCards: {
    id: string;
    name: string;
    listName: string;
    status: StatusSemantic;
    url: string;
  }[];
  recentActivities: {
    id: string;
    details: string;
    timestamp: string;
  }[];
}

interface TeamViewProps {
  memberOverviews: MemberOverview[];
  lists: TrelloList[];
  role: UserRole;
  onUpdateListSemantics: (
    listId: string,
    semanticType: ListSemanticType,
    mappedStatus?: StatusSemantic,
    mappedPerson?: string
  ) => void;
  onAskAboutPerson: (personName: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  memberOverviews,
  lists,
  role,
  onUpdateListSemantics,
  onAskAboutPerson,
}) => {
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editSemanticType, setEditSemanticType] = useState<ListSemanticType>('status');
  const [editMappedStatus, setEditMappedStatus] = useState<StatusSemantic>('In Process');
  const [editMappedPerson, setEditMappedPerson] = useState<string>('');

  const startEditList = (list: TrelloList) => {
    setEditingListId(list.id);
    setEditSemanticType(list.semanticType);
    setEditMappedStatus(list.mappedStatus || 'In Process');
    setEditMappedPerson(list.mappedPerson || '');
  };

  const saveEditList = (listId: string) => {
    onUpdateListSemantics(listId, editSemanticType, editMappedStatus, editMappedPerson || undefined);
    setEditingListId(null);
  };

  return (
    <div id="team-view" className="space-y-6">
      {/* Non-Surveillance Team Principles Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Team Workstreams & Project Ownership
          </h2>
          <p className="text-xs text-slate-500">
            Objective initiative tracking grounded in Trello task completions and milestone deliveries.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Objective Milestone Accountability</span>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberOverviews.map((item) => (
          <div
            key={item.member.id}
            id={`member-card-${item.member.id}`}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {item.member.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {item.member.fullName}
                    </h3>
                    <p className="text-xs text-slate-400">@{item.member.username || 'team'}</p>
                  </div>
                </div>

                <button
                  id={`ask-member-${item.member.id}`}
                  onClick={() => onAskAboutPerson(`What did ${item.member.fullName} work on recently?`)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Query Work
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                <div>
                  <span className="block text-base font-bold text-slate-900">
                    {item.activeCardsCount}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    Active Tasks
                  </span>
                </div>
                <div>
                  <span className="block text-base font-bold text-emerald-600">
                    {item.completedActivitiesCount}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    Milestones Done
                  </span>
                </div>
              </div>

              {/* Recent Tasks */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block">
                  Associated Cards:
                </span>
                {item.recentCards.length > 0 ? (
                  item.recentCards.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800 line-clamp-1 max-w-[190px]">
                        {c.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-slate-600 border border-slate-200">
                        {c.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-xs">No active cards assigned directly.</p>
                )}
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => onAskAboutPerson(`What milestones has ${item.member.fullName} completed this month?`)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                Detailed Breakdown →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Board Lists Semantics Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Trello Board List Semantics</span>
            </h3>
            <p className="text-xs text-slate-500">
              How the assistant interprets cards located in specific columns (person workflow vs. pipeline status vs. clients).
            </p>
          </div>
          {role === 'ADMIN' && (
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Admin Config Enabled
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lists.map((list) => {
            const isEditing = editingListId === list.id;

            return (
              <div
                key={list.id}
                id={`list-card-${list.id}`}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 text-sm line-clamp-1">{list.name}</span>
                    {role === 'ADMIN' && !isEditing && (
                      <button
                        onClick={() => startEditList(list)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                        title="Edit List Semantics"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500">
                          Semantic Type
                        </label>
                        <select
                          value={editSemanticType}
                          onChange={(e) => setEditSemanticType(e.target.value as any)}
                          className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                        >
                          <option value="status">Status Column</option>
                          <option value="person">Team Member List</option>
                          <option value="client">Client Grouping</option>
                          <option value="resources">Resources / Reference</option>
                          <option value="adhoc">Ad Hoc Work</option>
                        </select>
                      </div>

                      {editSemanticType === 'status' && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            Mapped Status
                          </label>
                          <select
                            value={editMappedStatus}
                            onChange={(e) => setEditMappedStatus(e.target.value as any)}
                            className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Process">In Process</option>
                            <option value="In Review">In Review</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked</option>
                            <option value="Research">Research</option>
                            <option value="Idea">Idea</option>
                          </select>
                        </div>
                      )}

                      {editSemanticType === 'person' && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            Mapped Team Member
                          </label>
                          <input
                            type="text"
                            value={editMappedPerson}
                            onChange={(e) => setEditMappedPerson(e.target.value)}
                            placeholder="Full name (e.g. Haseeb Afzal)"
                            className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => saveEditList(list.id)}
                          className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-medium cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingListId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          {list.semanticType}
                        </span>
                      </div>
                      {list.mappedStatus && (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">Maps to Status:</span>
                          <span className="font-semibold text-indigo-700">{list.mappedStatus}</span>
                        </div>
                      )}
                      {list.mappedPerson && (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">Maps to Member:</span>
                          <span className="font-semibold text-slate-900">{list.mappedPerson}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
