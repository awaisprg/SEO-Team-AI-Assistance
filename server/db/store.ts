import {
  TrelloCard,
  TrelloList,
  TrelloBoard,
  TrelloMember,
  TrelloLabel,
  TrelloChecklist,
  TrelloChecklistItem,
  TrelloComment,
  TrelloActivity,
  TrelloAttachment,
  ClientEntity,
  SyncRun,
  TrelloConnectionStatus,
  StatusSemantic,
  ChatSession,
  ChatMessage,
  ManagementBrief,
} from '../../src/types';
import fs from 'fs';
import path from 'path';

export interface TrelloConnectionConfig {
  apiKey: string;
  token: string;
  boardId: string;
  boardName: string;
  connected: boolean;
  isDemoData: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
}

export interface SearchFilterParams {
  query?: string;
  topic?: string;
  client?: string;
  person?: string;
  status?: StatusSemantic | 'all';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  listId?: string;
  label?: string;
  limit?: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'team_intelligence_store.json');

interface StorageState {
  connection: TrelloConnectionConfig;
  boards: Record<string, TrelloBoard>;
  lists: Record<string, TrelloList>;
  members: Record<string, TrelloMember>;
  labels: Record<string, TrelloLabel>;
  cards: Record<string, TrelloCard>;
  checklists: Record<string, TrelloChecklist>;
  comments: Record<string, TrelloComment>;
  activities: Record<string, TrelloActivity>;
  attachments: Record<string, TrelloAttachment>;
  clients: Record<string, ClientEntity>;
  syncRuns: SyncRun[];
  chatSessions: Record<string, ChatSession>;
  managementBriefs: Record<string, ManagementBrief>;
}

class Store {
  private state: StorageState;

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): StorageState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing state file, initializing clean state:', err);
    }

    return {
      connection: {
        apiKey: process.env.TRELLO_API_KEY || '',
        token: process.env.TRELLO_TOKEN || '',
        boardId: '',
        boardName: '',
        connected: false,
        isDemoData: true,
      },
      boards: {},
      lists: {},
      members: {},
      labels: {},
      cards: {},
      checklists: {},
      comments: {},
      activities: {},
      attachments: {},
      clients: {},
      syncRuns: [],
      chatSessions: {},
      managementBriefs: {},
    };
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store state:', err);
    }
  }

  // --- Connection Methods ---
  getConnection(): TrelloConnectionConfig {
    return { ...this.state.connection };
  }

  getConnectionStatus(): TrelloConnectionStatus {
    const cards = Object.values(this.state.cards);
    return {
      connected: this.state.connection.connected || this.state.connection.isDemoData,
      isDemoData: this.state.connection.isDemoData,
      boardId: this.state.connection.boardId,
      boardName: this.state.connection.boardName,
      lastSyncAt: this.state.connection.lastSyncAt,
      lastSyncStatus: this.state.connection.lastSyncStatus,
      totalCards: cards.length,
      totalComments: Object.values(this.state.comments).length,
      totalActivities: Object.values(this.state.activities).length,
      totalClients: Object.values(this.state.clients).length,
      apiKeyConfigured: Boolean(this.state.connection.apiKey || process.env.TRELLO_API_KEY),
      tokenConfigured: Boolean(this.state.connection.token || process.env.TRELLO_TOKEN),
    };
  }

  updateConnection(config: Partial<TrelloConnectionConfig>) {
    this.state.connection = { ...this.state.connection, ...config };
    this.persist();
  }

  // --- Boards ---
  upsertBoard(board: TrelloBoard) {
    this.state.boards[board.id] = board;
    this.persist();
  }

  getBoards(): TrelloBoard[] {
    return Object.values(this.state.boards);
  }

  // --- Lists & Semantics ---
  upsertLists(lists: TrelloList[]) {
    for (const list of lists) {
      // Preserve existing semantic mapping if already configured
      const existing = this.state.lists[list.id];
      if (existing) {
        this.state.lists[list.id] = {
          ...list,
          semanticType: existing.semanticType || list.semanticType,
          mappedStatus: existing.mappedStatus ?? list.mappedStatus,
          mappedPerson: existing.mappedPerson ?? list.mappedPerson,
        };
      } else {
        this.state.lists[list.id] = list;
      }
    }
    this.persist();
  }

  getLists(boardId?: string): TrelloList[] {
    const all = Object.values(this.state.lists);
    if (!boardId) return all;
    return all.filter((l) => l.boardId === boardId);
  }

  updateListSemantics(
    listId: string,
    semanticType: TrelloList['semanticType'],
    mappedStatus?: StatusSemantic,
    mappedPerson?: string
  ) {
    if (this.state.lists[listId]) {
      this.state.lists[listId].semanticType = semanticType;
      this.state.lists[listId].mappedStatus = mappedStatus;
      this.state.lists[listId].mappedPerson = mappedPerson;
      // Re-evaluate cards associated with this list
      this.recomputeCardsStatusForList(listId);
      this.persist();
    }
  }

  private recomputeCardsStatusForList(listId: string) {
    const list = this.state.lists[listId];
    if (!list) return;

    for (const card of Object.values(this.state.cards)) {
      if (card.listId === listId) {
        if (list.mappedStatus) {
          card.statusSemantic = list.mappedStatus;
        }
      }
    }
  }

  // --- Members ---
  upsertMembers(members: TrelloMember[]) {
    for (const m of members) {
      this.state.members[m.id] = { ...this.state.members[m.id], ...m };
    }
    this.persist();
  }

  getMembers(): TrelloMember[] {
    return Object.values(this.state.members);
  }

  // --- Labels ---
  upsertLabels(labels: TrelloLabel[]) {
    for (const l of labels) {
      this.state.labels[l.id] = l;
    }
    this.persist();
  }

  getLabels(): TrelloLabel[] {
    return Object.values(this.state.labels);
  }

  // --- Clients & Aliases ---
  upsertClient(client: Partial<ClientEntity> & { canonicalName: string }): ClientEntity {
    const canonical = client.canonicalName.trim();
    let existing = Object.values(this.state.clients).find(
      (c) => c.canonicalName.toLowerCase() === canonical.toLowerCase()
    );

    if (existing) {
      const mergedAliases = Array.from(
        new Set([...(existing.aliases || []), ...(client.aliases || [])])
      );
      existing = {
        ...existing,
        ...client,
        aliases: mergedAliases,
      };
      this.state.clients[existing.id] = existing;
      this.persist();
      return existing;
    } else {
      const newClient: ClientEntity = {
        id: client.id || `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        canonicalName: canonical,
        aliases: client.aliases || [canonical],
        status: client.status || 'Active',
        activeCardCount: client.activeCardCount || 0,
        completedTasksCount: client.completedTasksCount || 0,
        totalTasksCount: client.totalTasksCount || 0,
        teamMembers: client.teamMembers || [],
        lastActivityDate: client.lastActivityDate || new Date().toISOString(),
      };
      this.state.clients[newClient.id] = newClient;
      this.persist();
      return newClient;
    }
  }

  getClients(): ClientEntity[] {
    // Recompute counts for fresh accuracy
    const clients = Object.values(this.state.clients);
    const cards = Object.values(this.state.cards);
    const activities = Object.values(this.state.activities);

    return clients.map((client) => {
      const matchingCards = cards.filter(
        (c) =>
          c.clientCanonical?.toLowerCase() === client.canonicalName.toLowerCase() ||
          client.aliases.some((a) => c.name.toLowerCase().includes(a.toLowerCase()))
      );

      const activeCards = matchingCards.filter(
        (c) => c.statusSemantic !== 'Completed' && !c.closed
      );

      let totalTasks = 0;
      let completedTasks = 0;
      const teamSet = new Set<string>();

      for (const card of matchingCards) {
        card.members.forEach((m) => teamSet.add(m.fullName));
        for (const cl of card.checklists) {
          totalTasks += cl.items.length;
          completedTasks += cl.items.filter((i) => i.state === 'complete').length;
        }
      }

      // Find client activities
      const clientActs = activities.filter(
        (a) =>
          a.clientCanonical?.toLowerCase() === client.canonicalName.toLowerCase() ||
          matchingCards.some((c) => c.id === a.cardId)
      );
      clientActs.forEach((a) => teamSet.add(a.person));

      const lastActivity = clientActs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]?.timestamp || client.lastActivityDate;

      return {
        ...client,
        activeCardCount: activeCards.length,
        totalTasksCount: totalTasks,
        completedTasksCount: completedTasks,
        teamMembers: Array.from(teamSet).filter(Boolean),
        lastActivityDate: lastActivity,
      };
    });
  }

  getClientById(id: string): (ClientEntity & { cards: TrelloCard[]; recentActivities: TrelloActivity[]; recentComments: TrelloComment[] }) | null {
    const client = this.state.clients[id];
    if (!client) return null;

    const cards = Object.values(this.state.cards).filter(
      (c) =>
        c.clientCanonical?.toLowerCase() === client.canonicalName.toLowerCase() ||
        client.aliases.some((a) => c.name.toLowerCase().includes(a.toLowerCase()))
    );

    const cardIds = new Set(cards.map((c) => c.id));
    const recentActivities = Object.values(this.state.activities)
      .filter((a) => cardIds.has(a.cardId) || a.clientCanonical === client.canonicalName)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    const recentComments = Object.values(this.state.comments)
      .filter((c) => cardIds.has(c.cardId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    return {
      ...client,
      cards,
      recentActivities,
      recentComments,
    };
  }

  matchClientName(input: string): string | null {
    if (!input) return null;
    const lower = input.toLowerCase().trim();
    for (const client of Object.values(this.state.clients)) {
      if (client.canonicalName.toLowerCase() === lower) return client.canonicalName;
      for (const alias of client.aliases) {
        if (alias.toLowerCase() === lower || lower.includes(alias.toLowerCase())) {
          return client.canonicalName;
        }
      }
    }
    return null;
  }

  // --- Cards ---
  upsertCards(cards: TrelloCard[]) {
    for (const c of cards) {
      // Idempotent upsert by Trello ID
      const existing = this.state.cards[c.id];
      if (existing) {
        this.state.cards[c.id] = {
          ...existing,
          ...c,
          checklists: c.checklists?.length ? c.checklists : existing.checklists,
          comments: c.comments?.length ? c.comments : existing.comments,
          activities: c.activities?.length ? c.activities : existing.activities,
          attachments: c.attachments?.length ? c.attachments : existing.attachments,
        };
      } else {
        this.state.cards[c.id] = c;
      }

      // Auto-index activities
      if (c.activities && c.activities.length > 0) {
        for (const act of c.activities) {
          this.state.activities[act.id] = act;
        }
      }

      // Auto-index comments
      if (c.comments && c.comments.length > 0) {
        for (const comm of c.comments) {
          this.state.comments[comm.id] = comm;
        }
      }

      // Auto-index checklists
      if (c.checklists && c.checklists.length > 0) {
        for (const cl of c.checklists) {
          this.state.checklists[cl.id] = cl;
        }
      }

      // Auto-index attachments
      if (c.attachments && c.attachments.length > 0) {
        for (const att of c.attachments) {
          this.state.attachments[att.id] = att;
        }
      }
    }
    this.persist();
  }

  getCards(filter?: { clientCanonical?: string; status?: StatusSemantic }): TrelloCard[] {
    let list = Object.values(this.state.cards);
    if (filter?.clientCanonical) {
      list = list.filter(
        (c) => c.clientCanonical?.toLowerCase() === filter.clientCanonical?.toLowerCase()
      );
    }
    if (filter?.status) {
      list = list.filter((c) => c.statusSemantic === filter.status);
    }
    return list;
  }

  getCardById(id: string): TrelloCard | null {
    return this.state.cards[id] || null;
  }

  // --- Checklists & Items ---
  upsertChecklists(checklists: TrelloChecklist[]) {
    for (const cl of checklists) {
      this.state.checklists[cl.id] = cl;
      const card = this.state.cards[cl.cardId];
      if (card) {
        const existingIdx = card.checklists.findIndex((x) => x.id === cl.id);
        if (existingIdx >= 0) {
          card.checklists[existingIdx] = cl;
        } else {
          card.checklists.push(cl);
        }
      }
    }
    this.persist();
  }

  // --- Comments ---
  upsertComments(comments: TrelloComment[]) {
    for (const comment of comments) {
      this.state.comments[comment.id] = comment;
      const card = this.state.cards[comment.cardId];
      if (card) {
        if (!card.comments.some((c) => c.id === comment.id)) {
          card.comments.push(comment);
        }
      }
    }
    this.persist();
  }

  getComments(cardId?: string): TrelloComment[] {
    const all = Object.values(this.state.comments);
    if (!cardId) return all;
    return all.filter((c) => c.cardId === cardId);
  }

  // --- Activities ---
  upsertActivities(activities: TrelloActivity[]) {
    for (const act of activities) {
      this.state.activities[act.id] = act;
      const card = this.state.cards[act.cardId];
      if (card) {
        if (!card.activities.some((a) => a.id === act.id)) {
          card.activities.push(act);
        }
      }
    }
    this.persist();
  }

  getActivities(filter?: { person?: string; clientCanonical?: string; cardId?: string }): TrelloActivity[] {
    let list = Object.values(this.state.activities);
    if (filter?.cardId) {
      list = list.filter((a) => a.cardId === filter.cardId);
    }
    if (filter?.person) {
      const p = filter.person.toLowerCase();
      list = list.filter((a) => a.person.toLowerCase().includes(p));
    }
    if (filter?.clientCanonical) {
      const c = filter.clientCanonical.toLowerCase();
      list = list.filter((a) => a.clientCanonical?.toLowerCase() === c);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Attachments ---
  upsertAttachments(attachments: TrelloAttachment[]) {
    for (const att of attachments) {
      this.state.attachments[att.id] = att;
      const card = this.state.cards[att.cardId];
      if (card) {
        if (!card.attachments.some((a) => a.id === att.id)) {
          card.attachments.push(att);
        }
      }
    }
    this.persist();
  }

  // --- Sync Runs ---
  recordSyncRun(run: SyncRun) {
    this.state.syncRuns.unshift(run);
    if (this.state.syncRuns.length > 50) {
      this.state.syncRuns.pop();
    }
    this.persist();
  }

  getSyncRuns(): SyncRun[] {
    return [...this.state.syncRuns];
  }

  getLastSyncRun(): SyncRun | undefined {
    return this.state.syncRuns[0];
  }

  // --- Chat Sessions & Messages ---
  createChatSession(title = 'Intelligence Session'): ChatSession {
    const session: ChatSession = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.chatSessions[session.id] = session;
    this.persist();
    return session;
  }

  getChatSessions(): ChatSession[] {
    return Object.values(this.state.chatSessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getChatSession(id: string): ChatSession | null {
    return this.state.chatSessions[id] || null;
  }

  addChatMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    let session = this.state.chatSessions[sessionId];
    if (!session) {
      session = this.createChatSession();
      sessionId = session.id;
    }

    const fullMsg: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    session.messages.push(fullMsg);
    session.updatedAt = new Date().toISOString();
    this.persist();
    return fullMsg;
  }

  // --- Management Briefs ---
  saveManagementBrief(brief: ManagementBrief) {
    this.state.managementBriefs[brief.id] = brief;
    this.persist();
  }

  getManagementBriefs(): ManagementBrief[] {
    return Object.values(this.state.managementBriefs).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getManagementBriefById(id: string): ManagementBrief | null {
    return this.state.managementBriefs[id] || null;
  }

  // --- Clear & Reset ---
  clearAll() {
    this.state = {
      connection: {
        apiKey: process.env.TRELLO_API_KEY || '',
        token: process.env.TRELLO_TOKEN || '',
        boardId: '',
        boardName: '',
        connected: false,
        isDemoData: false,
      },
      boards: {},
      lists: {},
      members: {},
      labels: {},
      cards: {},
      checklists: {},
      comments: {},
      activities: {},
      attachments: {},
      clients: {},
      syncRuns: [],
      chatSessions: {},
      managementBriefs: {},
    };
    this.persist();
  }
}

export const db = new Store();
