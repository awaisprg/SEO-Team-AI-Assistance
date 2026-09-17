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
  role = 'VIEWER',
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
    <div id="team-view" className="space-y-6">
      {/* Objective Milestone Principles Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EAEAEC] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-[#8963FB] bg-[#F2F2FD] px-3 py-1 rounded-full border border-[#C6C1F3] mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Resource Distribution</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1A1A1E]">
            Team Workstreams & Deliverable Ownership
          </h2>
          <p className="text-xs text-[#5D5C68] mt-1">
            Objective initiative tracking grounded in verified Trello task completions and milestone deliveries.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold text-[#2F20A2] bg-[#F2F2FD] px-4 py-2 rounded-2xl border border-[#C6C1F3] w-fit shadow-2xs">
          <Shield className="w-4 h-4 text-[#8963FB]" />
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
              className="bg-white rounded-3xl border border-[#EAEAEC] hover:border-[#C6C1F3] p-5 sm:p-6 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#1A1A1E] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-[#2F20A2] transition-colors">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1E] leading-tight group-hover:text-[#2F20A2] transition-colors">
                        {fullName}
                      </h3>
                      <p className="text-xs text-[#6E6D7B] mt-0.5">@{item.member.username || 'team'}</p>
                    </div>
                  </div>

                  <button
                    id={`ask-member-${item.member.id || 'btn'}`}
                    onClick={() => handleQueryPerson(`What did ${fullName} work on recently?`)}
                    className="text-xs font-semibold text-[#2F20A2] hover:text-white bg-[#F2F2FD] hover:bg-[#8963FB] border border-[#C6C1F3] hover:border-[#8963FB] px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Query Work
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 my-4 p-3.5 rounded-2xl bg-[#F8F8FC] border border-[#EAEAEC] text-center">
                  <div>
                    <span className="block text-2xl font-black text-[#1A1A1E] tabular-nums">
                      {item.activeCardsCount ?? 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#6E6D7B] font-bold">
                      Active Tasks
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black text-[#198754] tabular-nums">
                      {item.completedActivitiesCount ?? 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#6E6D7B] font-bold">
                      Milestones Done
                    </span>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-[#5D5C68] text-[11px] uppercase tracking-wider block mb-1">
                    Associated Cards:
                  </span>
                  {recentCards.length > 0 ? (
                    recentCards.map((c) => (
                      <div
                        key={c.id || Math.random().toString()}
                        onClick={() => onSelectCard && onSelectCard(c)}
                        className={`p-3 rounded-2xl border border-[#EAEAEC] bg-white flex items-center justify-between text-xs ${
                          onSelectCard
                            ? 'cursor-pointer hover:bg-[#FAF8FF] hover:border-[#C6C1F3] transition-all shadow-2xs'
                            : ''
                        }`}
                      >
                        <span className="font-bold text-[#1A1A1E] line-clamp-1 max-w-[190px]">
                          {c.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F2FD] text-[#2F20A2] border border-[#C6C1F3]">
                          {c.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#6E6D7B] italic text-xs">No active cards assigned directly.</p>
                  )}
                </div>
              </div>

              <div className="pt-3.5 mt-4 border-t border-[#EAEAEC] text-right">
                <button
                  onClick={() =>
                    handleQueryPerson(`What milestones has ${fullName} completed this month?`)
                  }
                  className="text-xs text-[#8963FB] hover:text-[#2F20A2] font-bold cursor-pointer transition-colors inline-flex items-center"
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
        <div className="bg-white rounded-3xl border border-[#EAEAEC] p-10 text-center text-[#5D5C68] text-xs shadow-xs">
          <Users className="w-12 h-12 text-[#A78AFD] mx-auto mb-2 opacity-70" />
          <p className="font-bold text-[#1A1A1E] text-base">No team member profiles detected yet.</p>
          <p className="text-[#6E6D7B] mt-1 text-xs">
            Connect your Trello board in Settings to discover team members and lists.
          </p>
        </div>
      )}

      {/* Board Lists Semantics Section (Admin only setting) */}
      {role === 'ADMIN' && (
        <div className="bg-white rounded-3xl border border-[#EAEAEC] p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEAEC] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#1A1A1E] flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#8963FB]" />
                <span>Trello Board List Semantics</span>
              </h3>
              <p className="text-xs text-[#5D5C68] mt-0.5">
                Configure how the intelligence engine interprets cards located in specific columns (individual workflow vs. status pipeline vs. client repositories).
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#2F20A2] bg-[#F2F2FD] px-3.5 py-1.5 rounded-full border border-[#C6C1F3] w-fit">
              Admin Mode Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeLists.map((list) => {
              const isEditing = editingListId === list.id;

              return (
                <div
                  key={list.id}
                  id={`list-card-${list.id}`}
                  className="p-4 rounded-2xl border border-[#EAEAEC] bg-[#F8F8FC] text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-[#1A1A1E] text-sm line-clamp-1">{list.name}</span>
                      {role === 'ADMIN' && !isEditing && (
                        <button
                          onClick={() => startEditList(list)}
                          className="p-1 rounded text-[#6E6D7B] hover:text-[#1A1A1E] hover:bg-[#EAEAEC] cursor-pointer"
                          title="Edit List Semantics"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-2 pt-2 border-t border-[#EAEAEC]">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#5D5C68]">
                            Semantic Type
                          </label>
                          <select
                            value={editSemanticType}
                            onChange={(e) => setEditSemanticType(e.target.value as any)}
                            className="w-full text-xs p-2 rounded-xl border border-[#EAEAEC] bg-white text-[#1A1A1E]"
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
                            <label className="block text-[10px] font-bold uppercase text-[#5D5C68]">
                              Mapped Status
                            </label>
                            <select
                              value={editMappedStatus}
                              onChange={(e) => setEditMappedStatus(e.target.value as any)}
                              className="w-full text-xs p-2 rounded-xl border border-[#EAEAEC] bg-white text-[#1A1A1E]"
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
                            <label className="block text-[10px] font-bold uppercase text-[#5D5C68]">
                              Mapped Team Member
                            </label>
                            <input
                              type="text"
                              value={editMappedPerson}
                              onChange={(e) => setEditMappedPerson(e.target.value)}
                              placeholder="Full name (e.g. Haseeb Afzal)"
                              className="w-full text-xs p-2 rounded-xl border border-[#EAEAEC] bg-white text-[#1A1A1E]"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => saveEditList(list.id)}
                            className="px-3.5 py-1.5 bg-[#8963FB] hover:bg-[#7852E8] text-white rounded-xl text-[11px] font-semibold cursor-pointer shadow-2xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingListId(null)}
                            className="px-3 py-1.5 bg-[#EAEAEC] text-[#1A1A1E] rounded-xl text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-[#5D5C68] mt-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[#6E6D7B]">Type:</span>
                          <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-[#EAEAEC] text-[#1A1A1E]">
                            {list.semanticType}
                          </span>
                        </div>
                        {list.mappedStatus && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[#6E6D7B]">Maps to Status:</span>
                            <span className="font-bold text-[#2F20A2]">{list.mappedStatus}</span>
                          </div>
                        )}
                        {list.mappedPerson && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[#6E6D7B]">Maps to Member:</span>
                            <span className="font-bold text-[#1A1A1E]">{list.mappedPerson}</span>
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
