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
  ClientEntity,
} from '../../src/types';

export interface RawTrelloData {
  board: { id: string; name: string; url: string; closed: boolean };
  lists: { id: string; name: string; closed: boolean; pos?: number }[];
  members: { id: string; fullName: string; username: string; avatarUrl?: string }[];
  labels: { id: string; name: string; color: string }[];
  cards: any[];
  boardChecklists?: any[];
  boardActions?: any[];
}

export function inferListSemantics(
  listName: string,
  knownMembers: { fullName: string; username?: string }[] = []
): { semanticType: ListSemanticType; mappedStatus?: StatusSemantic; mappedPerson?: string } {
  const normalized = listName.toLowerCase().trim();

  // Status lists (check first for unambiguous status columns like "To Do Clients" or "Completed")
  if (normalized === 'completed' || normalized.startsWith('complete') || normalized.includes('done')) {
    return { semanticType: 'status', mappedStatus: 'Completed' };
  }
  if (normalized === 'in review' || normalized.startsWith('in review') || normalized.includes('review') || normalized.includes('qa')) {
    return { semanticType: 'status', mappedStatus: 'In Review' };
  }
  if (normalized === 'in process' || normalized === 'in progress' || normalized.includes('doing') || normalized.includes('active work')) {
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
  if (normalized.includes('gfm client') || normalized === 'clients' || normalized.endsWith('clients')) {
    return { semanticType: 'client', mappedStatus: 'In Process' };
  }
  if (normalized.includes('resource') || normalized.includes('pds resource') || normalized.includes('doc')) {
    return { semanticType: 'resources', mappedStatus: 'Planned' };
  }
  if (normalized.includes('ad hoc') || normalized.includes('adhoc')) {
    return { semanticType: 'adhoc', mappedStatus: 'In Process' };
  }

  // Check if list represents a team member/person
  for (const m of knownMembers) {
    const memName = (m.fullName || '').toLowerCase().trim();
    if (memName && (normalized.includes(memName) || memName.includes(normalized))) {
      return { semanticType: 'person', mappedPerson: m.fullName, mappedStatus: 'In Process' };
    }
  }

  // Common person name patterns for SEO/Content team (e.g. Ali Hamza, Haseeb Afzal, Adil, etc.)
  const knownNameMap: Record<string, string> = {
    'haseeb': 'Muhammad Haseeb Afzal',
    'adil': 'Adil Rehman',
    'ali hamza': 'Ali Hamza',
    'ahmad hamza': 'Ahmad Hamza',
    'azeem': 'Azeem Ahmad',
    'humna': 'Humna Qayyum',
    'awais': 'Awais Yaseen',
    'malik': 'Malik',
  };

  for (const [key, fullName] of Object.entries(knownNameMap)) {
    if (normalized.includes(key)) {
      return {
        semanticType: 'person',
        mappedPerson: fullName,
        mappedStatus: 'In Process',
      };
    }
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

  // Ground truth: If card is located in In Process or Completed list, that is its status
  if (listSemanticStatus === 'In Process') {
    return 'In Process';
  }
  if (listSemanticStatus === 'Completed') {
    return 'Completed';
  }

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
  knownClients: { canonicalName: string; aliases: string[] }[] = [],
  checklists: { name: string }[] = []
): string | undefined {
  const text = `${cardName} ${cardDesc}`.toLowerCase();

  // Explicit normalization for Advanced Wellness MD (and its variations: Advanced Well MD, Advnace Well MD)
  if (
    text.includes('advanced wellness') ||
    text.includes('advanced well md') ||
    text.includes('advnace well md') ||
    text.includes('advanced well') ||
    text.includes('advnace well') ||
    text.includes('advanced med wellness')
  ) {
    return 'Advanced Wellness MD';
  }

  // 1. Direct match with known canonical names and aliases
  for (const client of knownClients) {
    if (text.includes(client.canonicalName.toLowerCase())) {
      return client.canonicalName;
    }
    for (const alias of client.aliases) {
      if (alias.length >= 3 && text.includes(alias.toLowerCase())) {
        return client.canonicalName;
      }
    }
  }

  // 2. Check if any checklist on the card matches a client
  for (const cl of checklists) {
    const clLower = (cl.name || '').toLowerCase();
    if (
      clLower.includes('advanced wellness') ||
      clLower.includes('advanced well md') ||
      clLower.includes('advnace well md') ||
      clLower.includes('advanced well') ||
      clLower.includes('advnace well') ||
      clLower.includes('advanced med wellness')
    ) {
      return 'Advanced Wellness MD';
    }
    for (const client of knownClients) {
      if (clLower.includes(client.canonicalName.toLowerCase())) {
        return client.canonicalName;
      }
      for (const alias of client.aliases) {
        if (alias.length >= 3 && clLower.includes(alias.toLowerCase())) {
          return client.canonicalName;
        }
      }
    }
  }

  // 3. Heuristic: If card name starts with a brand or clinic prefix (e.g. "EOHT - ..." or "SWAN Primary Care | ...")
  const dashParts = cardName.split(/[-–—|:]/);
  if (dashParts.length > 1) {
    const firstPart = dashParts[0].trim();
    const lastPart = dashParts[dashParts.length - 1].trim();
    for (const client of knownClients) {
      if (firstPart.toLowerCase() === client.canonicalName.toLowerCase()) return client.canonicalName;
      if (lastPart.toLowerCase() === client.canonicalName.toLowerCase()) return client.canonicalName;
      for (const alias of client.aliases) {
        if (firstPart.toLowerCase() === alias.toLowerCase()) return client.canonicalName;
        if (lastPart.toLowerCase() === alias.toLowerCase()) return client.canonicalName;
      }
    }
    if (firstPart.length >= 3 && firstPart.length <= 40 && !firstPart.toLowerCase().includes('task') && !firstPart.toLowerCase().includes('seo') && !firstPart.toLowerCase().includes('weekly')) {
      return firstPart;
    }
  }

  return undefined;
}

export function getCardCreatedAt(cardId: string, fallbackDate?: string): string {
  if (cardId && typeof cardId === 'string' && cardId.length >= 8) {
    try {
      const timestamp = parseInt(cardId.substring(0, 8), 16);
      if (!isNaN(timestamp) && timestamp > 1400000000 && timestamp < 2500000000) {
        return new Date(timestamp * 1000).toISOString();
      }
    } catch {}
  }
  return fallbackDate || new Date().toISOString();
}

export interface RegisteredClientInfo {
  canonicalName: string;
  aliases: string[];
  agency?: 'PDS' | 'GFM' | 'Both' | 'Internal';
  isClosed?: boolean;
  isOnHold?: boolean;
  isActive?: boolean;
  isHighPriority?: boolean;
}

export function buildClientRegistry(
  raw: RawTrelloData,
  existingClients: { canonicalName: string; aliases: string[] }[] = []
): RegisteredClientInfo[] {
  const clientMetaMap = new Map<string, {
    canonicalName: string;
    aliases: Set<string>;
    agency?: 'PDS' | 'GFM' | 'Both' | 'Internal';
    isClosed?: boolean;
    isOnHold?: boolean;
    isActive?: boolean;
    isHighPriority?: boolean;
  }>();

  const addClient = (
    canonical: string,
    aliases: string[] = [],
    meta?: {
      agency?: 'PDS' | 'GFM' | 'Both' | 'Internal';
      isClosed?: boolean;
      isOnHold?: boolean;
      isActive?: boolean;
      isHighPriority?: boolean;
    }
  ) => {
    const cleanCanonical = canonical.trim().replace(/\s+/g, ' ');
    if (!cleanCanonical || cleanCanonical.length < 3) return;
    const lower = cleanCanonical.toLowerCase();

    if (!clientMetaMap.has(lower)) {
      clientMetaMap.set(lower, {
        canonicalName: cleanCanonical,
        aliases: new Set([cleanCanonical]),
        agency: meta?.agency || 'Internal',
        isClosed: meta?.isClosed ?? false,
        isOnHold: meta?.isOnHold ?? false,
        isActive: meta?.isActive ?? false,
        isHighPriority: meta?.isHighPriority ?? false,
      });
    }

    const entry = clientMetaMap.get(lower)!;
    aliases.forEach((a) => {
      const cleanA = a.trim();
      if (cleanA.length >= 2) entry.aliases.add(cleanA);
    });

    if (meta?.agency) {
      if (entry.agency && entry.agency !== 'Internal' && entry.agency !== meta.agency) {
        entry.agency = 'Both';
      } else if (!entry.agency || entry.agency === 'Internal') {
        entry.agency = meta.agency;
      }
    }
    if (meta?.isClosed !== undefined) {
      entry.isClosed = entry.isClosed || meta.isClosed;
    }
    if (meta?.isOnHold !== undefined) {
      entry.isOnHold = entry.isOnHold || meta.isOnHold;
    }
    if (meta?.isActive !== undefined) {
      entry.isActive = entry.isActive || meta.isActive;
    }
    if (meta?.isHighPriority) {
      entry.isHighPriority = true;
    }

    // Auto-generate common alias variations
    const withoutSuffix = cleanCanonical.replace(/,?\s*(LLC|PLLC|Inc|P\.C\.|PC|PA|Ltd)\.?$/i, '').trim();
    if (withoutSuffix && withoutSuffix !== cleanCanonical && withoutSuffix.length >= 3) {
      entry.aliases.add(withoutSuffix);
    }
    if (cleanCanonical.includes('&')) {
      entry.aliases.add(cleanCanonical.replace(/&/g, 'and').trim());
    }
    if (cleanCanonical.includes(' and ')) {
      entry.aliases.add(cleanCanonical.replace(/\band\b/g, '&').trim());
    }
  };

  // 1. Seed with existing known clients
  for (const c of existingClients) {
    addClient(c.canonicalName, c.aliases || []);
  }

  // Explicitly ensure Advanced Wellness MD is registered with exact canonical name and aliases
  addClient(
    'Advanced Wellness MD',
    [
      'Advanced Wellness MD',
      'Advnace Well MD',
      'Advanced Well MD',
      'Advanced Med Wellness',
      'Advanced Wellness',
      'Advanced Well',
      'Advnace Well',
      'AdvancedWellMD',
    ],
    { agency: 'Both', isClosed: false }
  );

  // 2. Identify client cards from lists (e.g. "GFM Clients", "PDS Resources")
  const skipWords = [
    'clients audit record',
    'gbp guides',
    'portfolio links',
    'schemas for new clients',
    'templates',
    'resources',
    'guidelines',
  ];

  for (const list of raw.lists || []) {
    const listLower = list.name.toLowerCase();
    const isPds = listLower.includes('pds client') || listLower.includes('pds resource');
    const isGfm = listLower.includes('gfm client') || (listLower.includes('client') && !listLower.includes('to do') && !isPds);

    if (isPds || isGfm) {
      for (const card of raw.cards || []) {
        if (card.idList === list.id || card.listId === list.id) {
          const cardName = card.name.trim();
          const lowerName = cardName.toLowerCase();
          if (skipWords.some((w) => lowerName.includes(w))) continue;
          if (cardName.length >= 3) {
            let canonical = cardName;
            if (lowerName.includes('mindful behavioral') || lowerName.includes('mindul behaviour')) {
              canonical = 'Mindful Behavioral Solutions';
            } else if (lowerName.includes('woodlands heart')) {
              canonical = 'Woodlands Heart and Vascular, PA';
            } else if (lowerName.includes('swan primary care')) {
              canonical = 'SWAN Primary Care';
            } else if (lowerName.includes('express medical services')) {
              canonical = 'Express Medical Services';
            } else if (lowerName.includes('eoht')) {
              canonical = 'EOHT LLC';
            } else if (lowerName.includes('pete cooper')) {
              canonical = 'Dr. Pete Cooper';
            } else if (lowerName.includes('lejrhay')) {
              canonical = 'LejRhay Handi Works and HVAC Services LLC';
            } else if (lowerName.includes('capital allergy')) {
              canonical = 'Capital Allergy & Respiratory Disease Center';
            } else if (lowerName.includes('precision podiatry')) {
              canonical = 'Precision Podiatry, PLLC';
            } else if (lowerName.includes('mentally healthy')) {
              canonical = 'Mentally Healthy Care';
            } else if (lowerName.includes('main street physician')) {
              canonical = 'Main Street Physician P.C.';
            } else if (lowerName.includes('mydoctor') || lowerName.includes('mydoctoc')) {
              canonical = 'MyDoctor PC';
            } else if (lowerName.includes('prosto mobile')) {
              canonical = 'Prosto Mobile Auto Detailing';
            } else if (lowerName.includes('car studio')) {
              canonical = 'Car Studio - Automotive Insurance Experts';
            } else if (
              lowerName.includes('advanced well') ||
              lowerName.includes('advnace well') ||
              lowerName.includes('advanced wellness') ||
              lowerName.includes('advanced med wellness')
            ) {
              canonical = 'Advanced Wellness MD';
            }

            const cardLabels = (card.labels || []).map((l: any) => (l.name || '').toLowerCase());
            const isClosed = cardLabels.some((l: string) => l.includes('project closed') || l.includes('closed') || l.includes('discontinue') || l.includes('terminate'));
            const isOnHold = cardLabels.some((l: string) => l.includes('on-hold') || l.includes('on hold') || l.includes('hold'));
            const isActive = cardLabels.some((l: string) => l === 'active' || l.includes('active'));
            const isHighPriority = cardLabels.some((l: string) => l.includes('high priority'));
            const agency: 'PDS' | 'GFM' = isPds ? 'PDS' : 'GFM';

            addClient(canonical, [cardName], { agency, isClosed, isOnHold, isActive, isHighPriority });
          }
        }
      }
    }
  }

  // 3. Extract clients mentioned in checklists across all cards
  for (const card of raw.cards || []) {
    for (const cl of card.checklists || []) {
      const clName = (cl.name || '').trim();
      const clLower = clName.toLowerCase();
      if (
        clName.length >= 4 &&
        !clLower.includes('task') &&
        !clLower.includes('to do') &&
        !clLower.includes('checklist') &&
        !clLower.includes('review') &&
        !clLower.includes('internal')
      ) {
        let matched = false;
        for (const [lowerKey, entry] of clientMetaMap.entries()) {
          if (clLower.includes(lowerKey) || lowerKey.includes(clLower)) {
            addClient(entry.canonicalName, [clName]);
            matched = true;
            break;
          }
        }
        if (!matched && (clName.includes('LLC') || clName.includes('P.C.') || clName.includes('Care') || clName.includes('Medicine') || clName.includes('Wellness') || clName.includes('Physicians'))) {
          addClient(clName, [clName]);
        }
      }
    }
  }

  return Array.from(clientMetaMap.values()).map((entry) => ({
    canonicalName: entry.canonicalName,
    aliases: Array.from(entry.aliases),
    agency: entry.agency,
    isClosed: entry.isClosed,
    isOnHold: entry.isOnHold,
    isActive: entry.isActive,
    isHighPriority: entry.isHighPriority,
  }));
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

  // Index board checklists by card ID if available
  const boardChecklistsByCard = new Map<string, any[]>();
  if (raw.boardChecklists && Array.isArray(raw.boardChecklists)) {
    for (const bcl of raw.boardChecklists) {
      const cardId = bcl.idCard || bcl.cardId;
      if (cardId) {
        if (!boardChecklistsByCard.has(cardId)) {
          boardChecklistsByCard.set(cardId, []);
        }
        boardChecklistsByCard.get(cardId)!.push(bcl);
      }
    }
  }

  // 1. Build completion event indices from board actions and card actions
  const allActions = [
    ...(raw.boardActions || []),
    ...(raw.cards || []).flatMap((c) => c.actions || []),
  ];

  const cardCompletionMap = new Map<string, { date: string; actor: string; reason: string }>();
  const itemCompletionMap = new Map<string, { date: string; actor: string }>();
  const boardActionsByCard = new Map<string, any[]>();

  for (const action of allActions) {
    const cardId = action.data?.card?.id;
    if (cardId) {
      let bList = boardActionsByCard.get(cardId);
      if (!bList) {
        bList = [];
        boardActionsByCard.set(cardId, bList);
      }
      bList.push(action);
    }
    const actionDate = action.date;
    const actorName = action.memberCreator?.fullName || action.memberCreator?.username || 'Team Member';

    if (action.type === 'updateCard' && cardId) {
      const listAfter = (action.data?.listAfter?.name || '').toLowerCase();
      const isMovedToCompleted = listAfter.includes('complete') || listAfter.includes('done');
      const isMarkedClosedOrDue = action.data?.card?.dueComplete === true || action.data?.card?.closed === true;

      if (isMovedToCompleted || isMarkedClosedOrDue) {
        const existing = cardCompletionMap.get(cardId);
        if (!existing || new Date(actionDate).getTime() > new Date(existing.date).getTime()) {
          cardCompletionMap.set(cardId, {
            date: actionDate,
            actor: actorName,
            reason: isMovedToCompleted ? `Moved to ${action.data.listAfter.name}` : 'Marked complete',
          });
        }
      }
    } else if (action.type === 'updateCheckItemStateOnCard') {
      const checkItemId = action.data?.checkItem?.id;
      const isComplete = action.data?.checkItem?.state === 'complete';
      if (checkItemId && isComplete) {
        const existing = itemCompletionMap.get(checkItemId);
        if (!existing || new Date(actionDate).getTime() > new Date(existing.date).getTime()) {
          itemCompletionMap.set(checkItemId, {
            date: actionDate,
            actor: actorName,
          });
        }
      }
    }
  }

  // Build unified client registry from board data & existing records
  const clientRegistry = buildClientRegistry(raw, existingClients);

  const cards: TrelloCard[] = [];
  const checklists: TrelloChecklist[] = [];
  const comments: TrelloComment[] = [];
  const activities: TrelloActivity[] = [];
  const attachments: TrelloAttachment[] = [];

  for (const rawCard of raw.cards || []) {
    const listId = rawCard.idList || rawCard.listId;
    const list = listsMap.get(listId);
    const cardLabels: TrelloLabel[] = (rawCard.labels || []).map((lbl: any) => ({
      id: lbl.id,
      name: lbl.name,
      color: lbl.color,
    }));

    const rawMemberIds: string[] = Array.isArray(rawCard.idMembers)
      ? rawCard.idMembers
      : Array.isArray(rawCard.members)
      ? rawCard.members.map((m: any) => m.id)
      : [];

    const cardMembers: TrelloMember[] = rawMemberIds
      .map((mid: string) => members.find((m) => m.id === mid))
      .filter((m: any): m is TrelloMember => Boolean(m));

    // If card is inside a person list, associate that member
    if (list?.mappedPerson || list?.semanticType === 'person') {
      const targetPerson = list.mappedPerson || list.name;
      const pMember = members.find(
        (m) =>
          m.fullName.toLowerCase() === targetPerson.toLowerCase() ||
          targetPerson.toLowerCase().includes(m.fullName.toLowerCase()) ||
          m.fullName.toLowerCase().includes(list.name.toLowerCase()) ||
          list.name.toLowerCase().includes(m.fullName.toLowerCase()) ||
          (list.name.toLowerCase().includes('adil') && m.fullName.toLowerCase().includes('adil')) ||
          (list.name.toLowerCase().includes('haseeb') && m.fullName.toLowerCase().includes('haseeb')) ||
          (list.name.toLowerCase().includes('ali hamza') && m.fullName.toLowerCase().includes('ali hamza')) ||
          (list.name.toLowerCase().includes('ahmad hamza') && m.fullName.toLowerCase().includes('ahmad hamza')) ||
          (list.name.toLowerCase().includes('azeem') && m.fullName.toLowerCase().includes('azeem')) ||
          (list.name.toLowerCase().includes('humna') && m.fullName.toLowerCase().includes('humna'))
      );
      if (pMember && !cardMembers.some((m) => m.id === pMember.id)) {
        cardMembers.push(pMember);
      }
    }

    const rawChecklists = boardChecklistsByCard.get(rawCard.id) || rawCard.checklists || [];
    const clientCanonical = detectClientFromCard(
      rawCard.name || '',
      rawCard.desc || '',
      clientRegistry,
      rawChecklists
    );

    const statusSemantic = inferCardStatus(
      list?.mappedStatus,
      cardLabels,
      rawCard.name,
      rawCard.closed
    );

    // Precise creation date from Trello ObjectId
    const createdAt = getCardCreatedAt(rawCard.id, rawCard.dateLastActivity);

    // Card completion and progress states
    const listNameLower = (list?.name || '').toLowerCase();
    const isCompleted =
      statusSemantic === 'Completed' ||
      listNameLower.includes('complete') ||
      rawCard.closed === true;
    const isUnderProgress = !isCompleted;

    let completedAt: string | null = null;
    let completedAtVerified = false;
    let completedBy: string | null = null;

    if (isCompleted) {
      const compAction = cardCompletionMap.get(rawCard.id);
      if (compAction) {
        completedAt = compAction.date;
        completedAtVerified = true;
        completedBy = compAction.actor;
      } else {
        completedAt = rawCard.dateLastActivity || createdAt;
        completedAtVerified = false;
      }
    }

    // Agency source determination
    let agencySource: 'PDS' | 'GFM' | 'Internal' = 'Internal';
    const hasPdsLabel = cardLabels.some((l) => l.name.toLowerCase() === 'pds' || l.name.toLowerCase().includes('pds client'));
    const hasGfmLabel = cardLabels.some((l) => l.name.toLowerCase() === 'gfm' || l.name.toLowerCase().includes('gfm client'));

    if (listNameLower.includes('pds resource') || hasPdsLabel) {
      agencySource = 'PDS';
    } else if (listNameLower.includes('gfm client') || hasGfmLabel) {
      agencySource = 'GFM';
    }

    // Priority classification
    let priority: TrelloCard['priority'] = 'Normal';
    if (cardLabels.some((l) => l.name.toLowerCase().includes('high priority'))) {
      priority = 'High Priority';
    } else if (cardLabels.some((l) => l.name.toLowerCase().includes('medium priority'))) {
      priority = 'Medium Priority';
    } else if (cardLabels.some((l) => l.name.toLowerCase().includes('low priority'))) {
      priority = 'Low Priority';
    }

    // Process Checklists
    const cardChecklists: TrelloChecklist[] = rawChecklists.map((cl: any) => {
      const rawItems = cl.checkItems || cl.items || [];
      const items = rawItems.map((ci: any) => {
        const isItemComplete = ci.state === 'complete';
        const itemComp = itemCompletionMap.get(ci.id);
        return {
          id: ci.id,
          checklistId: cl.id,
          cardId: rawCard.id,
          name: ci.name,
          state: (isItemComplete ? 'complete' : 'incomplete') as 'complete' | 'incomplete',
          completedAt: itemComp?.date || (isItemComplete ? ci.due || undefined : undefined),
          completedBy: itemComp?.actor,
        };
      });

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

    const combinedCardActions = [
      ...(rawCard.actions || []),
      ...(boardActionsByCard.get(rawCard.id) || []),
    ];
    const seenActionIds = new Set<string>();
    const uniqueCardActions = combinedCardActions.filter((a) => {
      if (!a || !a.id || seenActionIds.has(a.id)) return false;
      seenActionIds.add(a.id);
      return true;
    });

    for (const action of uniqueCardActions) {
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
      listId: listId || rawCard.idList || '',
      listName: list?.name || rawCard.listName || 'List',
      name: rawCard.name || 'Untitled Card',
      desc: rawCard.desc || '',
      url: rawCard.url || `https://trello.com/c/${rawCard.id}`,
      due: rawCard.due || null,
      createdAt,
      dateLastActivity: rawCard.dateLastActivity || new Date().toISOString(),
      closed: rawCard.closed || false,
      statusSemantic,
      isCompleted,
      isUnderProgress,
      completedAt,
      completedAtVerified,
      completedBy,
      agencySource,
      priority,
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

  // 4. Construct comprehensive ClientEntity objects for every discovered client
  const clients: ClientEntity[] = clientRegistry.map((reg) => {
    const aliases = reg.aliases.map((a) => a.toLowerCase());
    const isDedicatedClient = (c: TrelloCard) => c.clientCanonical?.toLowerCase() === reg.canonicalName.toLowerCase();

    const matchingCards = cards.filter((c) => {
      if (isDedicatedClient(c)) return true;
      const text = `${c.name} ${c.desc}`.toLowerCase();
      if (aliases.some((a) => text.includes(a))) return true;
      if (c.checklists.some((cl) => aliases.some((a) => cl.name.toLowerCase().includes(a)))) return true;
      if (c.checklists.some((cl) => cl.items.some((item) => aliases.some((a) => item.name.toLowerCase().includes(a))))) return true;
      return false;
    });

    const activeCards = matchingCards.filter((c) => c.isUnderProgress);

    let completedTasksCount = 0;
    let totalTasksCount = 0;
    const teamSet = new Set<string>();
    let latestActivity = new Date(0).toISOString();

    for (const card of matchingCards) {
      card.members.forEach((m) => teamSet.add(m.fullName));
      if (card.dateLastActivity && card.dateLastActivity > latestActivity) {
        latestActivity = card.dateLastActivity;
      }

      if (card.checklists.length > 0) {
        for (const cl of card.checklists) {
          const isClientChecklist = aliases.some((a) => cl.name.toLowerCase().includes(a));
          const dedicated = isDedicatedClient(card);

          if (isClientChecklist || dedicated) {
            totalTasksCount += cl.items.length;
            completedTasksCount += cl.items.filter((i) => i.state === 'complete').length;
          } else {
            for (const item of cl.items) {
              const iLower = item.name.toLowerCase();
              if (aliases.some((a) => iLower.includes(a))) {
                totalTasksCount += 1;
                if (item.state === 'complete') {
                  completedTasksCount += 1;
                }
              }
            }
          }
        }
      }

      if (isDedicatedClient(card)) {
        totalTasksCount += 1;
        if (card.isCompleted) {
          completedTasksCount += 1;
        }
      }
    }

    // Determine status per user rules:
    // 1. Closed: labeled with "Project Closed", discontinued, or terminated
    // 2. On Hold: labeled with "On-hold" or "On Hold" (on hold until next direction from support team)
    // 3. Active: labeled with "Active" or active accounts being worked on for PDS & GFM
    let status: 'Active' | 'On Hold' | 'Closed' = 'Active';
    if (reg.isClosed) {
      status = 'Closed';
    } else if (reg.isOnHold) {
      status = 'On Hold';
    } else {
      status = 'Active';
    }

    return {
      id: `client_${Buffer.from(reg.canonicalName).toString('hex').slice(0, 16)}`,
      canonicalName: reg.canonicalName,
      aliases: reg.aliases,
      status,
      agency: reg.agency || 'Internal',
      isHighPriority: Boolean(reg.isHighPriority),
      activeCardCount: activeCards.length,
      completedTasksCount,
      totalTasksCount,
      teamMembers: Array.from(teamSet),
      lastActivityDate: latestActivity !== new Date(0).toISOString() ? latestActivity : new Date().toISOString(),
    };
  });

  // Sort clients: active with tasks first, then on hold, then closed
  const statusPriority: Record<string, number> = { Active: 0, 'On Hold': 1, Closed: 2 };
  clients.sort((a, b) => {
    if (a.status !== b.status) {
      return (statusPriority[a.status] ?? 0) - (statusPriority[b.status] ?? 0);
    }
    if (b.totalTasksCount !== a.totalTasksCount) return b.totalTasksCount - a.totalTasksCount;
    return a.canonicalName.localeCompare(b.canonicalName);
  });

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
    clients,
  };
}
