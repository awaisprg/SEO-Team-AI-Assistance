import {
  TrelloBoard,
  TrelloList,
  TrelloMember,
  TrelloLabel,
  TrelloCard,
  TrelloChecklist,
  TrelloComment,
  TrelloActivity,
  TrelloAttachment,
  StatusSemantic,
  ListSemanticType,
} from '../../src/types';

export interface RawTrelloData {
  board: { id: string; name: string; url: string; closed: boolean };
  lists: { id: string; name: string; closed: boolean; pos?: number }[];
  members: { id: string; fullName: string; username: string; avatarUrl?: string }[];
  labels: { id: string; name: string; color: string }[];
  cards: any[];
}

export function inferListSemantics(
  listName: string,
  knownMembers: { fullName: string }[] = []
): { semanticType: ListSemanticType; mappedStatus?: StatusSemantic; mappedPerson?: string } {
  const normalized = listName.toLowerCase().trim();

  // Check if list represents a team member/person
  for (const m of knownMembers) {
    if (m.fullName && normalized.includes(m.fullName.toLowerCase())) {
      return { semanticType: 'person', mappedPerson: m.fullName, mappedStatus: 'In Process' };
    }
  }

  // Common person name patterns for SEO/Content team
  const knownNames = ['haseeb', 'adil', 'hamza', 'azeem', 'humna', 'awais'];
  for (const name of knownNames) {
    if (normalized.includes(name)) {
      return {
        semanticType: 'person',
        mappedPerson: listName,
        mappedStatus: 'In Process',
      };
    }
  }

  // Status lists
  if (normalized.includes('complete') || normalized.includes('done')) {
    return { semanticType: 'status', mappedStatus: 'Completed' };
  }
  if (normalized.includes('in review') || normalized.includes('review') || normalized.includes('qa')) {
    return { semanticType: 'status', mappedStatus: 'In Review' };
  }
  if (normalized.includes('in process') || normalized.includes('in progress') || normalized.includes('doing') || normalized.includes('active')) {
    return { semanticType: 'status', mappedStatus: 'In Process' };
  }
  if (normalized.includes('to do') || normalized.includes('todo') || normalized.includes('backlog')) {
    return { semanticType: 'status', mappedStatus: 'To Do' };
  }
  if (normalized.includes('blocked') || normalized.includes('impediment')) {
    return { semanticType: 'status', mappedStatus: 'Blocked' };
  }
  if (normalized.includes('research') || normalized.includes('study')) {
    return { semanticType: 'status', mappedStatus: 'Research' };
  }
  if (normalized.includes('idea') || normalized.includes('brainstorm')) {
    return { semanticType: 'status', mappedStatus: 'Idea' };
  }

  // Client groupings or Resources
  if (normalized.includes('client') || normalized.includes('gfm client')) {
    return { semanticType: 'client', mappedStatus: 'In Process' };
  }
  if (normalized.includes('resource') || normalized.includes('pds resource') || normalized.includes('doc')) {
    return { semanticType: 'resources', mappedStatus: 'Planned' };
  }
  if (normalized.includes('ad hoc') || normalized.includes('adhoc')) {
    return { semanticType: 'adhoc', mappedStatus: 'To Do' };
  }

  return { semanticType: 'other', mappedStatus: 'To Do' };
}

export function inferCardStatus(
  listSemanticStatus?: StatusSemantic,
  cardLabels: { name: string }[] = [],
  cardName = '',
  cardClosed = false
): StatusSemantic {
  if (cardClosed) return 'Completed';

  // Label overrides
  const labelNames = cardLabels.map((l) => l.name.toLowerCase());
  if (labelNames.some((l) => l.includes('complete') || l.includes('done'))) {
    return 'Completed';
  }
  if (labelNames.some((l) => l.includes('in review') || l.includes('review'))) {
    return 'In Review';
  }
  if (labelNames.some((l) => l.includes('blocked') || l.includes('waiting'))) {
    return 'Blocked';
  }
  if (labelNames.some((l) => l.includes('in progress') || l.includes('in process'))) {
    return 'In Process';
  }
  if (labelNames.some((l) => l.includes('research'))) {
    return 'Research';
  }
  if (labelNames.some((l) => l.includes('idea'))) {
    return 'Idea';
  }

  // Card Name cues
  const lowerName = cardName.toLowerCase();
  if (lowerName.includes('[completed]') || lowerName.startsWith('completed:')) {
    return 'Completed';
  }
  if (lowerName.includes('[in review]') || lowerName.startsWith('review:')) {
    return 'In Review';
  }

  // Default to list status
  return listSemanticStatus || 'To Do';
}

export function detectClientFromCard(
  cardName: string,
  cardDesc: string,
  knownClients: { canonicalName: string; aliases: string[] }[] = []
): string | undefined {
  const text = `${cardName} ${cardDesc}`.toLowerCase();

  for (const client of knownClients) {
    if (text.includes(client.canonicalName.toLowerCase())) {
      return client.canonicalName;
    }
    for (const alias of client.aliases) {
      if (text.includes(alias.toLowerCase())) {
        return client.canonicalName;
      }
    }
  }

  // Heuristic: If card name starts with a brand or doctor/clinic (e.g. "Precision Podiatry PLLC" or "Advanced Well MD - ...")
  const dashParts = cardName.split(/[-–—:]/);
  if (dashParts.length > 1) {
    const candidate = dashParts[0].trim();
    if (candidate.length >= 3 && candidate.length <= 40 && !candidate.toLowerCase().includes('task') && !candidate.toLowerCase().includes('seo')) {
      return candidate;
    }
  }

  return undefined;
}

export function normalizeTrelloPayload(
  raw: RawTrelloData,
  existingClients: { canonicalName: string; aliases: string[] }[] = []
) {
  const board: TrelloBoard = {
    id: raw.board.id,
    name: raw.board.name,
    url: raw.board.url,
    closed: raw.board.closed || false,
  };

  const members: TrelloMember[] = (raw.members || []).map((m) => ({
    id: m.id,
    fullName: m.fullName || m.username,
    username: m.username || '',
    avatarUrl: m.avatarUrl,
  }));

  const labels: TrelloLabel[] = (raw.labels || []).map((l) => ({
    id: l.id,
    name: l.name || 'Untitled Label',
    color: l.color || 'gray',
  }));

  const listsMap = new Map<string, TrelloList>();
  const normalizedLists: TrelloList[] = (raw.lists || []).map((l) => {
    const semantics = inferListSemantics(l.name, members);
    const item: TrelloList = {
      id: l.id,
      boardId: board.id,
      name: l.name,
      closed: l.closed || false,
      pos: l.pos,
      semanticType: semantics.semanticType,
      mappedStatus: semantics.mappedStatus,
      mappedPerson: semantics.mappedPerson,
    };
    listsMap.set(l.id, item);
    return item;
  });

  const cards: TrelloCard[] = [];
  const checklists: TrelloChecklist[] = [];
  const comments: TrelloComment[] = [];
  const activities: TrelloActivity[] = [];
  const attachments: TrelloAttachment[] = [];

  for (const rawCard of raw.cards || []) {
    const list = listsMap.get(rawCard.idList);
    const cardLabels: TrelloLabel[] = (rawCard.labels || []).map((lbl: any) => ({
      id: lbl.id,
      name: lbl.name,
      color: lbl.color,
    }));

    const cardMembers: TrelloMember[] = (rawCard.idMembers || [])
      .map((mid: string) => members.find((m) => m.id === mid))
      .filter((m: any): m is TrelloMember => Boolean(m));

    // If card is inside a person list, associate that member
    if (list?.mappedPerson) {
      const pMember = members.find(
        (m) => m.fullName.toLowerCase() === list.mappedPerson?.toLowerCase()
      );
      if (pMember && !cardMembers.some((m) => m.id === pMember.id)) {
        cardMembers.push(pMember);
      }
    }

    const clientCanonical = detectClientFromCard(
      rawCard.name || '',
      rawCard.desc || '',
      existingClients
    );

    const statusSemantic = inferCardStatus(
      list?.mappedStatus,
      cardLabels,
      rawCard.name,
      rawCard.closed
    );

    // Process Checklists
    const cardChecklists: TrelloChecklist[] = (rawCard.checklists || []).map((cl: any) => {
      const items = (cl.checkItems || []).map((ci: any) => ({
        id: ci.id,
        checklistId: cl.id,
        cardId: rawCard.id,
        name: ci.name,
        state: (ci.state === 'complete' ? 'complete' : 'incomplete') as 'complete' | 'incomplete',
        completedAt: ci.due || undefined,
      }));

      const checklistObj: TrelloChecklist = {
        id: cl.id,
        cardId: rawCard.id,
        name: cl.name,
        items,
      };
      checklists.push(checklistObj);
      return checklistObj;
    });

    // Process Comments & Actions
    const cardComments: TrelloComment[] = [];
    const cardActivities: TrelloActivity[] = [];

    for (const action of rawCard.actions || []) {
      if (action.type === 'commentCard') {
        const commentObj: TrelloComment = {
          id: action.id,
          cardId: rawCard.id,
          text: action.data?.text || '',
          authorId: action.idMemberCreator || '',
          authorName: action.memberCreator?.fullName || action.memberCreator?.username || 'Team Member',
          createdAt: action.date,
        };
        cardComments.push(commentObj);
        comments.push(commentObj);
      } else if (action.type === 'updateCheckItemStateOnCard') {
        const itemName = action.data?.checkItem?.name || 'Checklist Item';
        const isComplete = action.data?.checkItem?.state === 'complete';
        const actorName = action.memberCreator?.fullName || action.memberCreator?.username || 'Team Member';

        const actObj: TrelloActivity = {
          id: action.id,
          cardId: rawCard.id,
          cardTitle: rawCard.name,
          clientCanonical,
          person: actorName,
          activityType: itemName,
          action: isComplete ? 'completed' : 'updated',
          timestamp: action.date,
          details: `${actorName} ${isComplete ? 'completed' : 'updated'} "${itemName}" on this card`,
          sourceUrl: rawCard.url,
        };
        cardActivities.push(actObj);
        activities.push(actObj);
      } else if (action.type === 'updateCard' && action.data?.listAfter) {
        const actorName = action.memberCreator?.fullName || action.memberCreator?.username || 'Team Member';
        const actObj: TrelloActivity = {
          id: action.id,
          cardId: rawCard.id,
          cardTitle: rawCard.name,
          clientCanonical,
          person: actorName,
          activityType: 'Status Move',
          action: 'moved',
          timestamp: action.date,
          details: `${actorName} moved card to ${action.data.listAfter.name}`,
          sourceUrl: rawCard.url,
        };
        cardActivities.push(actObj);
        activities.push(actObj);
      }
    }

    // Process Attachments
    const cardAttachments: TrelloAttachment[] = (rawCard.attachments || []).map((att: any) => {
      const attObj: TrelloAttachment = {
        id: att.id,
        cardId: rawCard.id,
        name: att.name || 'Attachment',
        url: att.url || '',
        mimeType: att.mimeType,
        date: att.date || new Date().toISOString(),
      };
      attachments.push(attObj);
      return attObj;
    });

    const cardObj: TrelloCard = {
      id: rawCard.id,
      boardId: board.id,
      listId: rawCard.idList,
      listName: list?.name || 'List',
      name: rawCard.name || 'Untitled Card',
      desc: rawCard.desc || '',
      url: rawCard.url || `https://trello.com/c/${rawCard.id}`,
      due: rawCard.due || null,
      dateLastActivity: rawCard.dateLastActivity || new Date().toISOString(),
      closed: rawCard.closed || false,
      statusSemantic,
      clientCanonical,
      labels: cardLabels,
      members: cardMembers,
      checklists: cardChecklists,
      comments: cardComments,
      activities: cardActivities,
      attachments: cardAttachments,
    };

    cards.push(cardObj);
  }

  return {
    board,
    lists: normalizedLists,
    members,
    labels,
    cards,
    checklists,
    comments,
    activities,
    attachments,
  };
}
