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
import { pgStore } from './postgres';

export interface TrelloConnectionConfig {
  apiKey: string;
  token: string;
  boardId: string;
  boardName: string;
  connected: boolean;
  isDemoData: boolean;
  mode?: 'real' | 'demo';
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
    this.cleanDemoDataIfReal();
  }

  cleanDemoDataIfReal() {
    const isReal = this.state.connection.mode === 'real' || !this.state.connection.isDemoData;
    const hasRealCards = Object.values(this.state.cards).some((c) => !c.id.startsWith('card_'));

    if (isReal && hasRealCards) {
      // 1. Purge demo cards
      for (const [id] of Object.entries(this.state.cards)) {
        if (id.startsWith('card_')) {
          delete this.state.cards[id];
        }
      }

      // 2. Purge demo lists
      for (const [id] of Object.entries(this.state.lists)) {
        if (id.startsWith('list_')) {
          delete this.state.lists[id];
        }
      }

      // 3. Purge demo members
      for (const [id] of Object.entries(this.state.members)) {
        if (id.startsWith('mem_')) {
          delete this.state.members[id];
        }
      }

      // 4. Purge demo clients
      const demoClientNames = ['apex spine & orthopedics', 'bay area vein center', 'advanced well md'];
      for (const [id, c] of Object.entries(this.state.clients)) {
        if (id.startsWith('client_') && demoClientNames.includes(c.canonicalName.toLowerCase())) {
          delete this.state.clients[id];
        }
      }

      // 5. Purge demo briefs that have hardcoded demo client names
      for (const [id, brief] of Object.entries(this.state.managementBriefs)) {
        const text = `${brief.title} ${brief.executiveSummary} ${(brief.majorAccomplishments || []).join(' ')}`.toLowerCase();
        if (demoClientNames.some((dcn) => text.includes(dcn))) {
          delete this.state.managementBriefs[id];
        }
      }

      // 6. Purge orphaned checklists, comments, activities, attachments
      for (const [id, cl] of Object.entries(this.state.checklists)) {
        if (cl.cardId.startsWith('card_')) delete this.state.checklists[id];
      }
      for (const [id, cm] of Object.entries(this.state.comments)) {
        if (cm.cardId.startsWith('card_')) delete this.state.comments[id];
      }
      for (const [id, act] of Object.entries(this.state.activities)) {
        if (act.cardId.startsWith('card_')) delete this.state.activities[id];
      }
      for (const [id, att] of Object.entries(this.state.attachments)) {
        if (att.cardId.startsWith('card_')) delete this.state.attachments[id];
      }

      this.persist();
    }
  }

  replaceBoardData(data: {
    board: TrelloBoard;
    lists: TrelloList[];
    members: TrelloMember[];
    labels: TrelloLabel[];
    cards: TrelloCard[];
    checklists: TrelloChecklist[];
    comments: TrelloComment[];
    activities: TrelloActivity[];
    attachments: TrelloAttachment[];
    clients?: ClientEntity[];
  }) {
    this.state.boards[data.board.id] = data.board;

    // Cleanly replace lists with board lists
    this.state.lists = {};
    for (const l of data.lists) {
      this.state.lists[l.id] = l;
    }

    // Cleanly replace members
    this.state.members = {};
    for (const m of data.members) {
      this.state.members[m.id] = m;
    }

    // Cleanly replace labels
    this.state.labels = {};
    for (const lbl of data.labels) {
      this.state.labels[lbl.id] = lbl;
    }

    // Cleanly replace cards
    this.state.cards = {};
    for (const c of data.cards) {
      this.state.cards[c.id] = c;
    }

    // Cleanly replace checklists
    this.state.checklists = {};
    for (const cl of data.checklists) {
      this.state.checklists[cl.id] = cl;
    }

    // Cleanly replace comments
    this.state.comments = {};
    for (const cm of data.comments) {
      this.state.comments[cm.id] = cm;
    }

    // Cleanly replace activities
    this.state.activities = {};
    for (const act of data.activities) {
      this.state.activities[act.id] = act;
    }

    // Cleanly replace attachments
    this.state.attachments = {};
    for (const att of data.attachments) {
      this.state.attachments[att.id] = att;
    }

    // Populate clients if supplied
    if (data.clients && data.clients.length > 0) {
      this.state.clients = {};
      for (const client of data.clients) {
        this.state.clients[client.id] = client;
      }
    }

    this.cleanDemoDataIfReal();
    this.persist();

    if (pgStore.isConfigured()) {
      pgStore.upsertCards(data.cards).catch((err) => console.warn('Postgres upsertCards error:', err.message));
    }
  }

  private loadInitialState(): StorageState {
    const isExplicitDemo = process.env.TRELLO_MODE === 'demo';
    const isRealMode = !isExplicitDemo;

    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.connection) {
          // Sync environment credentials if present
          if (process.env.TRELLO_API_KEY && !parsed.connection.apiKey) {
            parsed.connection.apiKey = process.env.TRELLO_API_KEY;
          }
          if (process.env.TRELLO_TOKEN && !parsed.connection.token) {
            parsed.connection.token = process.env.TRELLO_TOKEN;
          }
          if (process.env.TRELLO_MODE) {
            parsed.connection.mode = process.env.TRELLO_MODE as 'real' | 'demo';
            parsed.connection.isDemoData = process.env.TRELLO_MODE === 'demo';
          }
          return parsed;
        }
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
        isDemoData: isExplicitDemo,
        mode: isRealMode ? 'real' : 'demo',
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
    const mode = this.state.connection.mode || (this.state.connection.isDemoData ? 'demo' : 'real');
    return {
      connected: this.state.connection.connected || (this.state.connection.isDemoData && mode === 'demo'),
      isDemoData: mode === 'demo',
      mode,
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

  disconnect() {
    this.state.connection = {
      apiKey: '',
      token: '',
      boardId: '',
      boardName: '',
      connected: false,
      isDemoData: false,
      mode: 'real',
      lastSyncAt: undefined,
      lastSyncStatus: undefined,
    };
    this.persist();
  }

  setMode(mode: 'real' | 'demo') {
    this.state.connection.mode = mode;
    this.state.connection.isDemoData = mode === 'demo';
    this.persist();
  }

  // --- Boards ---
  upsertBoard(board: TrelloBoard) {
    this.state.boards[board.id] = board;
    this.persist();
    if (pgStore.isConfigured()) {
      pgStore.upsertBoard(board).catch((err) => console.warn('Postgres upsertBoard error:', err.message));
    }
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
    if (pgStore.isConfigured()) {
      pgStore.upsertLists(lists).catch((err) => console.warn('Postgres upsertLists error:', err.message));
    }
  }

  getLists(boardId?: string): TrelloList[] {
    const isReal = this.state.connection.mode === 'real' || !this.state.connection.isDemoData;
    const hasRealLists = Object.values(this.state.lists).some((l) => !l.id.startsWith('list_'));

    let all = Object.values(this.state.lists);
    if (isReal && hasRealLists) {
      all = all.filter((l) => !l.id.startsWith('list_'));
    }
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
    const isReal = this.state.connection.mode === 'real' || !this.state.connection.isDemoData;
    const hasRealMembers = Object.values(this.state.members).some((m) => !m.id.startsWith('mem_'));

    let all = Object.values(this.state.members);
    if (isReal && hasRealMembers) {
      all = all.filter((m) => !m.id.startsWith('mem_'));
    }
    return all;
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
    const clients = Object.values(this.state.clients);
    const cards = Object.values(this.state.cards);
    const activities = Object.values(this.state.activities);

    return clients.map((client) => {
      const isDedicatedClient = (c: TrelloCard) =>
        c.clientCanonical?.toLowerCase() === client.canonicalName.toLowerCase();

      const matchingCards = cards.filter((c) => {
        if (isDedicatedClient(c)) return true;
        const text = `${c.name} ${c.desc || ''}`.toLowerCase();
        if (client.aliases.some((a) => text.includes(a.toLowerCase()))) return true;
        if (c.checklists.some((cl) => client.aliases.some((a) => cl.name.toLowerCase().includes(a.toLowerCase())))) return true;
        if (c.checklists.some((cl) => cl.items.some((item) => client.aliases.some((a) => item.name.toLowerCase().includes(a.toLowerCase()))))) return true;
        return false;
      });

      const activeCards = matchingCards.filter(
        (c) => c.statusSemantic !== 'Completed' && !c.closed
      );

      let totalTasks = 0;
      let completedTasks = 0;
      const teamSet = new Set<string>(client.teamMembers || []);

      for (const card of matchingCards) {
        card.members.forEach((m) => teamSet.add(m.fullName));
        const dedicated = isDedicatedClient(card);

        for (const cl of card.checklists) {
          const isClientCl = client.aliases.some((a) => cl.name.toLowerCase().includes(a.toLowerCase()));
          if (dedicated || isClientCl) {
            totalTasks += cl.items.length;
            completedTasks += cl.items.filter((i) => i.state === 'complete').length;
          } else {
            for (const item of cl.items) {
              const iLower = item.name.toLowerCase();
              if (client.aliases.some((a) => iLower.includes(a.toLowerCase()))) {
                totalTasks += 1;
                if (item.state === 'complete') {
                  completedTasks += 1;
                }
              }
            }
          }
        }

        if (dedicated && card.checklists.length === 0) {
          totalTasks += 1;
          if (card.statusSemantic === 'Completed' || card.closed) {
            completedTasks += 1;
          }
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
        activeCardCount: activeCards.length || client.activeCardCount,
        totalTasksCount: totalTasks || client.totalTasksCount,
        completedTasksCount: completedTasks || client.completedTasksCount,
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
    if (pgStore.isConfigured()) {
      pgStore.upsertCards(cards).catch((err) => console.warn('Postgres upsertCards error:', err.message));
    }
  }

  getCards(filter?: { clientCanonical?: string; status?: StatusSemantic }): TrelloCard[] {
    const isReal = this.state.connection.mode === 'real' || !this.state.connection.isDemoData;
    const hasRealCards = Object.values(this.state.cards).some((c) => !c.id.startsWith('card_'));

    let list = Object.values(this.state.cards);
    if (isReal && hasRealCards) {
      list = list.filter((c) => !c.id.startsWith('card_'));
    }

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
    if (pgStore.isConfigured()) {
      pgStore.recordSyncRun(run, this.state.connection.boardId).catch((err) => console.warn('Postgres recordSyncRun error:', err.message));
    }
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
    const isReal = this.state.connection.mode === 'real' || !this.state.connection.isDemoData;
    const demoClientNames = ['apex spine & orthopedics', 'bay area vein center', 'advanced well md'];

    let briefs = Object.values(this.state.managementBriefs);
    if (isReal) {
      briefs = briefs.filter((brief) => {
        const text = `${brief.title} ${brief.executiveSummary} ${(brief.majorAccomplishments || []).join(' ')}`.toLowerCase();
        return !demoClientNames.some((dcn) => text.includes(dcn));
      });
    }

    return briefs.sort(
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
