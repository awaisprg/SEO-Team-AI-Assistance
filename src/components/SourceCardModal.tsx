import React from 'react';
import {
  X,
  ExternalLink,
  CheckSquare,
  MessageSquare,
  Clock,
  User,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ChatSource, TrelloCard } from '../types';

interface SourceCardModalProps {
  source: ChatSource | null;
  cardDetail?: TrelloCard | null;
  onClose: () => void;
}

export const SourceCardModal: React.FC<SourceCardModalProps> = ({
  source,
  cardDetail,
  onClose,
}) => {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="source-card-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="space-y-1 pr-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {source.status || 'Status'}
              </span>
              <span className="text-xs text-slate-400">List: {source.listName}</span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {source.relevance}% Match
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {source.title}
            </h2>
            {source.client && (
              <p className="text-xs text-indigo-600 font-medium">
                Client: {source.client}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Open Card in Trello"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Match Reason Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700 block mb-1">
              Evidence Match Reason:
            </span>
            <p className="text-slate-600">{source.reason}</p>
            {source.snippet && (
              <p className="mt-2 text-slate-700 italic border-l-2 border-indigo-400 pl-2">
                "{source.snippet}"
              </p>
            )}
          </div>

          {/* Card Description if available */}
          {cardDetail?.desc && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Card Description
              </h4>
              <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50/60 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {cardDetail.desc}
              </p>
            </div>
          )}

          {/* Checklists */}
          {cardDetail?.checklists && cardDetail.checklists.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Checklists & Workflows</span>
              </h4>
              <div className="space-y-3">
                {cardDetail.checklists.map((cl) => (
                  <div key={cl.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-xs font-semibold text-slate-900 block mb-2">
                      {cl.name}
                    </span>
                    <div className="space-y-1.5">
                      {cl.items.map((it) => (
                        <div key={it.id} className="flex items-center text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={it.state === 'complete'}
                            readOnly
                            className="mr-2 rounded text-indigo-600 pointer-events-none"
                          />
                          <span
                            className={
                              it.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                            }
                          >
                            {it.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Comments */}
          {cardDetail?.comments && cardDetail.comments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Card Comments & Updates</span>
              </h4>
              <div className="space-y-2">
                {cardDetail.comments.map((cm) => (
                  <div key={cm.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">{cm.authorName}</span>
                      <span>{new Date(cm.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{cm.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <span>Open Trello Card</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
