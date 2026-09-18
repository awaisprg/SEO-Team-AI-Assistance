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
  ArrowRight,
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
  memberOverviews?: MemberOverview[];
  lists?: TrelloList[];
  role?: UserRole;
  onUpdateListSemantics?: (
    listId: string,
    semanticType: ListSemanticType,
    mappedStatus?: StatusSemantic,
    mappedPerson?: string
  ) => void;
  onAskAboutPerson?: (personName: string) => void;
  onAskAboutMember?: (personName: string) => void;
  onSelectCard?: (card: { id: string; name: string; url: string; status: StatusSemantic; listName: string }) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  memberOverviews = [],
  lists = [],
  role = 'MANAGER',
  onUpdateListSemantics,
  onAskAboutPerson,
  onAskAboutMember,
  onSelectCard,
}) => {
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editSemanticType, setEditSemanticType] = useState<ListSemanticType>('status');
  const [editMappedStatus, setEditMappedStatus] = useState<StatusSemantic>('In Process');
  const [editMappedPerson, setEditMappedPerson] = useState<string>('');

  const safeMemberOverviews = Array.isArray(memberOverviews) ? memberOverviews : [];
  const safeLists = Array.isArray(lists) ? lists : [];

  const handleQueryPerson = (personName: string) => {
    if (onAskAboutPerson) {
      onAskAboutPerson(personName);
    } else if (onAskAboutMember) {
      onAskAboutMember(personName);
    }
  };

  const startEditList = (list: TrelloList) => {
    setEditingListId(list.id);
    setEditSemanticType(list.semanticType || 'status');
    setEditMappedStatus(list.mappedStatus || 'In Process');
    setEditMappedPerson(list.mappedPerson || '');
  };

  const saveEditList = (listId: string) => {
    if (onUpdateListSemantics) {
      onUpdateListSemantics(listId, editSemanticType, editMappedStatus, editMappedPerson || undefined);
    }
    setEditingListId(null);
  };

  return (
    <div id="team-view" className="space-y-5">
      {/* Objective Milestone Principles Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7C52F5] bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100 mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Resource Distribution</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Team Workstreams & Deliverable Ownership
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective initiative tracking grounded in verified Trello task completions and milestone deliveries.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#7C52F5] bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200/80 w-fit shadow-2xs">
          <Shield className="w-3.5 h-3.5 text-[#7C52F5]" />
          <span>Objective Accountability</span>
        </div>
      </div>

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeMemberOverviews.map((item) => {
          if (!item || !item.member) return null;
          const fullName = item.member.fullName || 'Team Member';
          const initials =
            fullName
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'TM';
          const recentCards = Array.isArray(item.recentCards) ? item.recentCards : [];

          return (
            <div
              key={item.member.id || Math.random().toString()}
              id={`member-card-${item.member.id || 'unknown'}`}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-violet-300 p-5 shadow-2xs hover:shadow-xs flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3.5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#09061A] to-[#7C52F5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-[#7C52F5] transition-colors">
                        {fullName}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">@{item.member.username || 'team'}</p>
                    </div>
                  </div>

                  <button
                    id={`ask-member-${item.member.id || 'btn'}`}
                    onClick={() => handleQueryPerson(`What did ${fullName} work on recently?`)}
                    className="text-xs font-semibold text-slate-700 hover:text-[#7C52F5] bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    Query Work
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 my-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                  <div>
                    <span className="block text-2xl font-bold text-slate-900 tabular-nums font-sans">
                      {item.activeCardsCount ?? 0}
                    </span>
                    <span className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                      Active Tasks
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xl font-bold text-emerald-600 tabular-nums font-sans">
                      {item.completedActivitiesCount ?? 0}
                    </span>
                    <span className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                      Milestones Done
                    </span>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-500 text-[10.5px] uppercase tracking-wider block mb-1">
                    Associated Cards:
                  </span>
                  {recentCards.length > 0 ? (
                    recentCards.map((c) => (
                      <div
                        key={c.id || Math.random().toString()}
                        onClick={() => onSelectCard && onSelectCard(c)}
                        className={`p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs ${
                          onSelectCard
                            ? 'cursor-pointer hover:bg-violet-50/40 hover:border-violet-300 transition-all shadow-2xs'
                            : ''
                        }`}
                      >
                        <span className="font-semibold text-slate-900 line-clamp-1 max-w-[180px] text-[11.5px]">
                          {c.name}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 shrink-0 ml-1">
                          {c.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-xs">No active cards assigned directly.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3.5 border-t border-slate-100 text-right">
                <button
                  onClick={() =>
                    handleQueryPerson(`What milestones has ${fullName} completed this month?`)
                  }
                  className="text-xs text-[#7C52F5] hover:text-[#683EE6] font-semibold cursor-pointer transition-colors inline-flex items-center"
                >
                  <span>Detailed Breakdown</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State when no members */}
      {safeMemberOverviews.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-xs shadow-xs">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-70" />
          <p className="font-bold text-slate-900 text-base">No team member profiles detected yet.</p>
          <p className="text-slate-500 mt-1 text-xs">
            Connect your Trello board in Settings to discover team members and lists.
          </p>
        </div>
      )}

      {/* Board Lists Semantics Section (Admin only setting) */}
      {role === 'ADMIN' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#7C52F5]" />
                <span>Trello Board Column Semantics</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure how the intelligence engine interprets cards in each board list (personal workflow vs. pipeline status vs. client repositories).
              </p>
            </div>
            <span className="text-[10.5px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-100 w-fit">
              Admin Configuration
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeLists.map((list) => {
              const isEditing = editingListId === list.id;

              return (
                <div
                  key={list.id}
                  id={`list-card-${list.id}`}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-slate-900 text-xs line-clamp-1">{list.name}</span>
                      {role === 'ADMIN' && !isEditing && (
                        <button
                          onClick={() => startEditList(list)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                          title="Edit List Semantics"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
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
                              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
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
                              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => saveEditList(list.id)}
                            className="px-3 py-1 bg-gradient-to-r from-[#7C52F5] to-[#683EE6] text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingListId(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500 mt-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">Type:</span>
                          <span className="font-semibold uppercase text-[9.5px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                            {list.semanticType}
                          </span>
                        </div>
                        {list.mappedStatus && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-400">Status:</span>
                            <span className="font-semibold text-violet-700">{list.mappedStatus}</span>
                          </div>
                        )}
                        {list.mappedPerson && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-400">Member:</span>
                            <span className="font-semibold text-slate-800">{list.mappedPerson}</span>
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
      )}
    </div>
  );
};
