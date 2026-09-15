import express from 'express';
import path from 'path';
import { db } from './server/db/store';
import { pgStore } from './server/db/postgres';
import { getSeedData } from './server/trello/seed';
import { TrelloClient } from './server/trello/client';
import { normalizeTrelloPayload } from './server/trello/normalizer';
import { extractQueryIntent } from './server/ai/intent';
import { hybridRetrieve, formatSources } from './server/ai/retrieval';
import { generateEvidenceAnswer } from './server/ai/answering';
import { generateManagementBrief } from './server/ai/brief';
import { UserRole } from './src/types';

// Enforce TRELLO_MODE
const configuredMode = (process.env.TRELLO_MODE || 'real').toLowerCase();

// In demo mode ONLY, seed demo data if store is empty
if (configuredMode === 'demo' && Object.keys(db.getCards()).length === 0) {
  const seed = getSeedData();
  db.upsertBoard(seed.board);
  db.upsertLists(seed.lists);
  db.upsertMembers(seed.members);
  db.upsertLabels(seed.labels);
  seed.clients.forEach((c) => db.upsertClient(c));
  db.upsertCards(seed.cards);
  db.updateConnection({
    boardId: seed.board.id,
    boardName: seed.board.name,
    connected: true,
    isDemoData: true,
    mode: 'demo',
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
  });
} else if (configuredMode === 'real') {
  // Real mode: do not fabricate cards
  const existingConn = db.getConnection();
  const apiKey = process.env.TRELLO_API_KEY || existingConn.apiKey || '';
  const token = process.env.TRELLO_TOKEN || existingConn.token || '';
  db.updateConnection({
    apiKey,
    token,
    mode: 'real',
    isDemoData: false,
  });
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Session state (role-based access)
let currentUser = {
  id: 'user_awais_manager',
  email: 'awais7475@prgmd.com',
  name: 'Awais (SEO Lead)',
  role: 'ADMIN' as UserRole,
};

// -------------------------------------------------------------
// 1. HEALTH & OBSERVABILITY ENDPOINTS
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const status = db.getConnectionStatus();
  res.json({
    status: 'ok',
    trello: status.connected ? 'connected' : 'disconnected',
    database: 'connected',
    mode: status.mode,
    board: status.boardName || undefined,
    lastSyncAt: status.lastSyncAt,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & ROLE MANAGEMENT
// -------------------------------------------------------------
app.get('/api/auth/session', (req, res) => {
  res.json(currentUser);
});

app.post('/api/auth/switch-role', (req, res) => {
  const { role } = req.body;
  if (['ADMIN', 'MANAGER', 'VIEWER'].includes(role)) {
    currentUser.role = role as UserRole;
    res.json(currentUser);
  } else {
    res.status(400).json({ error: 'Invalid role. Must be ADMIN, MANAGER, or VIEWER.' });
  }
});

// -------------------------------------------------------------
// 3. TRELLO CONFIGURATION & SYNCHRONIZATION
// -------------------------------------------------------------
app.get('/api/trello/status', (req, res) => {
  res.json(db.getConnectionStatus());
});

// Connection test endpoint
app.all('/api/trello/test', async (req, res) => {
  const conn = db.getConnection();
  const apiKey = (req.body?.apiKey || conn.apiKey || process.env.TRELLO_API_KEY || '').trim();
  const token = (req.body?.token || conn.token || process.env.TRELLO_TOKEN || '').trim();

  if (!apiKey || !token) {
    return res.status(400).json({
      success: false,
      error: 'Trello API Key and Token are required to test the connection.',
    });
  }

  try {
    const client = new TrelloClient({ apiKey, token });
    const test = await client.testConnection();

    if (!test.success) {
      return res.status(401).json({
        success: false,
        error: test.error || 'Failed to authenticate with Trello API',
      });
    }

    res.json({
      success: true,
      message: 'Connected successfully',
      user: {
        username: test.username,
        fullName: test.fullName,
      },
      boardsCount: test.boardsCount || 0,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Connection test failed',
    });
  }
});

app.post('/api/trello/connect', async (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin permissions required to modify Trello credentials' });
  }

  const { apiKey, token, boardId, boardName } = req.body;
  if (!apiKey || !token) {
    return res.status(400).json({ error: 'API Key and Token are required' });
  }

  try {
    const client = new TrelloClient({ apiKey, token });
    const test = await client.testConnection();

    if (!test.success) {
      return res.status(401).json({ error: test.error || 'Failed to authenticate with Trello API' });
    }

    db.updateConnection({
      apiKey: apiKey.trim(),
      token: token.trim(),
      boardId: boardId || '',
      boardName: boardName || '',
      connected: true,
      isDemoData: false,
      mode: 'real',
    });

    res.json({
      success: true,
      message: `Successfully connected to Trello as ${test.fullName} (@${test.username})`,
      username: test.username,
      fullName: test.fullName,
      boardsCount: test.boardsCount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Trello connection error' });
  }
});

app.post('/api/trello/disconnect', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin permissions required to disconnect Trello' });
  }
  db.disconnect();
  res.json({ success: true, message: 'Disconnected from Trello successfully.' });
});

app.post('/api/trello/mode', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin permissions required to change mode' });
  }
  const { mode } = req.body;
  if (mode !== 'real' && mode !== 'demo') {
    return res.status(400).json({ error: 'Mode must be "real" or "demo"' });
  }
  db.setMode(mode);
  res.json({ success: true, mode, message: `Switched mode to ${mode}` });
});

app.get('/api/trello/boards', async (req, res) => {
  const conn = db.getConnection();
  const apiKey = (conn.apiKey || process.env.TRELLO_API_KEY || '').trim();
  const token = (conn.token || process.env.TRELLO_TOKEN || '').trim();

  if (!apiKey || !token) {
    if (conn.isDemoData || conn.mode === 'demo') {
      return res.json([
        {
          id: 'board_pds_gfm_seo',
          name: 'PDS/GFM-SEO (Demo Board)',
          url: 'https://trello.com/b/pds-gfm-seo',
          closed: false,
        },
      ]);
    }
    return res.status(400).json({
      error: 'Trello API Key and Token are required to list real boards. Please configure them in Settings.',
    });
  }

  try {
    const client = new TrelloClient({ apiKey, token });
    const boards = await client.getBoards();
    res.json(boards);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load boards from Trello' });
  }
});

app.get('/api/trello/sync/status', (req, res) => {
  const status = db.getConnectionStatus();
  const lastRun = db.getLastSyncRun();
  res.json({
    status: status.lastSyncStatus || 'idle',
    lastSyncAt: status.lastSyncAt,
    lastRun,
    totalCards: status.totalCards,
    totalComments: status.totalComments,
    totalActivities: status.totalActivities,
    totalClients: status.totalClients,
  });
});

app.post('/api/trello/sync', async (req, res) => {
  if (currentUser.role === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot trigger synchronizations' });
  }

  const conn = db.getConnection();
  const startTime = new Date();
  const mode = conn.mode || (conn.isDemoData ? 'demo' : 'real');
  const apiKey = (conn.apiKey || process.env.TRELLO_API_KEY || '').trim();
  const token = (conn.token || process.env.TRELLO_TOKEN || '').trim();
  const boardId = req.body.boardId || conn.boardId;

  // If in demo mode
  if (mode === 'demo') {
    const seed = getSeedData();
    db.upsertBoard(seed.board);
    db.upsertLists(seed.lists);
    db.upsertMembers(seed.members);
    db.upsertLabels(seed.labels);
    seed.clients.forEach((c) => db.upsertClient(c));
    db.upsertCards(seed.cards);

    const run = {
      id: `sync_${Date.now()}`,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success' as const,
      recordsProcessed: seed.cards.length + seed.lists.length,
      recordsCreated: 0,
      recordsUpdated: seed.cards.length,
      errors: [],
    };
    db.recordSyncRun(run);
    db.updateConnection({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      isDemoData: true,
      mode: 'demo',
      connected: true,
    });

    return res.json({
      success: true,
      message: 'Demo dataset synchronized and refreshed successfully.',
      run,
    });
  }

  // REAL TRELLO MODE: MUST NOT FABRICATE CARDS
  if (!apiKey || !token) {
    return res.status(400).json({
      error:
        'Trello credentials not configured. Please provide TRELLO_API_KEY and TRELLO_TOKEN in Settings or the environment to sync real data.',
    });
  }

  if (!boardId) {
    return res.status(400).json({
      error: 'Please select a Trello board to synchronize in Settings.',
    });
  }

  try {
    const client = new TrelloClient({ apiKey, token });

    const [rawBoard, rawLists, rawMembers, rawLabels, rawCards, rawBoardChecklists, rawBoardActions] = await Promise.all([
      client.getBoard(boardId),
      client.getLists(boardId),
      client.getMembers(boardId),
      client.getLabels(boardId),
      client.getCardsWithDetails(boardId),
      client.getBoardChecklists(boardId),
      client.getBoardActions(boardId, 1000).catch((err) => {
        console.warn('Could not fetch board actions (fallback to empty):', err.message);
        return [];
      }),
    ]);

    const existingClients = db.getClients();
    const normalized = normalizeTrelloPayload(
      {
        board: rawBoard,
        lists: rawLists,
        members: rawMembers,
        labels: rawLabels,
        cards: rawCards,
        boardChecklists: rawBoardChecklists,
        boardActions: rawBoardActions,
      },
      existingClients
    );

    // Completely replace with clean board data and remove any old demo records
    db.replaceBoardData(normalized);

    // Auto-generate fresh real management brief
    try {
      await generateManagementBrief({ periodType: 'this_month' });
    } catch (bErr: any) {
      console.warn('Auto-brief generation notice:', bErr.message);
    }

    const run = {
      id: `sync_${Date.now()}`,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success' as const,
      recordsProcessed: rawCards.length + rawLists.length,
      recordsCreated: rawCards.length,
      recordsUpdated: 0,
      errors: [],
    };
    db.recordSyncRun(run);

    db.updateConnection({
      boardId: rawBoard.id,
      boardName: rawBoard.name,
      connected: true,
      isDemoData: false,
      mode: 'real',
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success',
    });

    res.json({
      success: true,
      message: `Synchronized ${rawCards.length} cards, ${rawBoardChecklists.length} checklists, and ${normalized.clients.length} clients from real Trello board "${rawBoard.name}".`,
      cardsCount: rawCards.length,
      listsCount: rawLists.length,
      clientsCount: normalized.clients.length,
      run,
    });
  } catch (err: any) {
    const run = {
      id: `sync_${Date.now()}`,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      status: 'failed' as const,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: [err.message || 'Unknown sync failure'],
    };
    db.recordSyncRun(run);
    db.updateConnection({
      lastSyncStatus: 'failed',
    });
    res.status(500).json({ error: err.message || 'Synchronization failed', run });
  }
});

app.post('/api/trello/seed-demo', (req, res) => {
  const seed = getSeedData();
  db.clearAll();
  db.upsertBoard(seed.board);
  db.upsertLists(seed.lists);
  db.upsertMembers(seed.members);
  db.upsertLabels(seed.labels);
  seed.clients.forEach((c) => db.upsertClient(c));
  db.upsertCards(seed.cards);

  db.updateConnection({
    boardId: seed.board.id,
    boardName: seed.board.name,
    connected: true,
    isDemoData: true,
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
  });

  res.json({
    success: true,
    message: 'High-fidelity SEO/Content team workflow seed loaded successfully.',
    cardsCount: seed.cards.length,
    clientsCount: seed.clients.length,
  });
});

// -------------------------------------------------------------
// 4. LIST SEMANTICS CONFIGURATION
// -------------------------------------------------------------
app.get('/api/lists', (req, res) => {
  res.json(db.getLists());
});

app.post('/api/lists/semantics', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin permissions required to modify list semantics' });
  }

  const { listId, semanticType, mappedStatus, mappedPerson } = req.body;
  if (!listId || !semanticType) {
    return res.status(400).json({ error: 'listId and semanticType are required' });
  }

  db.updateListSemantics(listId, semanticType, mappedStatus, mappedPerson);
  res.json({ success: true, list: db.getLists().find((l) => l.id === listId) });
});

// -------------------------------------------------------------
// 5. CHAT & INTELLIGENCE RETRIEVAL
// -------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  const { question, sessionId } = req.body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    // 1. Audit / Session
    let activeSession = sessionId ? db.getChatSession(sessionId) : null;
    if (!activeSession) {
      activeSession = db.createChatSession(question.slice(0, 50));
    }

    // Add user message
    db.addChatMessage(activeSession.id, {
      role: 'user',
      content: question,
    });

    // 2. Query Understanding & Intent Extraction
    const knownClients = db.getClients();
    const knownMembers = db.getMembers();
    const intent = extractQueryIntent(question, knownClients, knownMembers);

    // 3. Hybrid Retrieval & Relevance Scoring
    const scoredCards = hybridRetrieve(intent, 30);

    // 4. Evidence-Grounded AI Synthesis (with Prompt Injection Defense)
    const answerResult = await generateEvidenceAnswer(
      intent,
      scoredCards,
      activeSession.messages.map((m) => ({ role: m.role, content: m.content }))
    );

    // 5. Record Assistant Message
    const assistantMsg = db.addChatMessage(activeSession.id, {
      role: 'assistant',
      content: answerResult.answer,
      summary: answerResult.summary,
      keyPoints: answerResult.keyPoints,
      statusBreakdown: answerResult.statusBreakdown,
      sources: answerResult.sources,
      evidenceStrength: answerResult.evidenceStrength,
      searchMetadata: {
        resultCount: scoredCards.length,
        intent: intent.intent,
        topic: intent.topic,
        filtersApplied: {
          client: intent.client,
          person: intent.person,
          status: intent.status,
          dateRange: intent.timeRangeDescription,
        },
      },
    });

    res.json({
      sessionId: activeSession.id,
      message: assistantMsg,
      answer: answerResult.answer,
      summary: answerResult.summary,
      keyPoints: answerResult.keyPoints,
      statusBreakdown: answerResult.statusBreakdown,
      sources: answerResult.sources,
      evidenceStrength: answerResult.evidenceStrength,
      searchMetadata: {
        resultCount: scoredCards.length,
        intent: intent.intent,
        topic: intent.topic,
      },
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Failed to process intelligence query' });
  }
});

app.get('/api/chat/sessions', (req, res) => {
  res.json(db.getChatSessions());
});

app.get('/api/chat/sessions/:id', (req, res) => {
  const session = db.getChatSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// -------------------------------------------------------------
// 6. CLIENT INTELLIGENCE ENDPOINTS
// -------------------------------------------------------------
app.get('/api/clients', (req, res) => {
  res.json(db.getClients());
});

app.get('/api/clients/:id', (req, res) => {
  const client = db.getClientById(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  res.json(client);
});

app.post('/api/clients/:id/aliases', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin permissions required to modify client aliases' });
  }

  const { alias } = req.body;
  if (!alias || !alias.trim()) {
    return res.status(400).json({ error: 'Alias is required' });
  }

  const client = db.getClientById(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  if (!client.aliases.includes(alias.trim())) {
    client.aliases.push(alias.trim());
    db.upsertClient(client);
  }

  res.json(client);
});

// -------------------------------------------------------------
// 7. TEAM OVERVIEW (NON-SURVEILLANCE)
// -------------------------------------------------------------
app.get('/api/team', (req, res) => {
  const cards = db.getCards();
  const members = db.getMembers();
  const activities = db.getActivities();

  const activeCards = cards.filter(
    (c) => c.statusSemantic !== 'Completed' && !c.closed && !c.listName?.toLowerCase().includes('complete')
  );
  const completedCards = cards.filter(
    (c) => c.statusSemantic === 'Completed' || c.listName?.toLowerCase().includes('complete')
  );
  const inReviewCards = cards.filter(
    (c) => c.statusSemantic === 'In Review' || c.listName?.toLowerCase().includes('review')
  );
  const aiInitiatives = cards.filter((c) => {
    const text = (c.name + ' ' + (c.desc || '') + ' ' + c.labels.map((l) => l.name).join(' ')).toLowerCase();
    return text.includes('ai') || text.includes('geo') || text.includes('aeo') || text.includes('schema');
  });
  const contentCards = cards.filter((c) => {
    const text = (c.name + ' ' + (c.desc || '') + ' ' + c.labels.map((l) => l.name).join(' ')).toLowerCase();
    return text.includes('content') || text.includes('service page') || text.includes('retargeting') || text.includes('guest post') || text.includes('web 2.0') || text.includes('article');
  });
  const seoCards = cards.filter((c) => {
    const text = (c.name + ' ' + (c.desc || '') + ' ' + c.labels.map((l) => l.name).join(' ')).toLowerCase();
    return text.includes('seo') || text.includes('technical') || text.includes('schema') || text.includes('audit') || text.includes('gbp') || text.includes('citation') || text.includes('tagging') || text.includes('listing');
  });

  const memberOverviews = members
    .map((m) => {
      const pName = m.fullName.toLowerCase();
      const pUser = (m.username || '').toLowerCase();
      const assignedCards = cards.filter((c) => {
        if (c.members.some((mem) => mem.id === m.id)) return true;
        const lName = c.listName.toLowerCase();
        if (lName.includes(pName) || pName.includes(lName)) return true;
        if (pUser && (lName.includes(pUser) || pUser.includes(lName))) return true;
        if (lName.includes('adil') && pName.includes('adil')) return true;
        if (lName.includes('haseeb') && pName.includes('haseeb')) return true;
        if (lName.includes('ali hamza') && pName.includes('ali hamza')) return true;
        if (lName.includes('ahmad hamza') && pName.includes('ahmad hamza')) return true;
        if (lName.includes('azeem') && (pName.includes('azeem') || pUser.includes('aahmad'))) return true;
        if (lName.includes('humna') && pName.includes('humna')) return true;
        return false;
      });

      let completedTasksCount = 0;
      for (const c of assignedCards) {
        for (const cl of c.checklists) {
          completedTasksCount += cl.items.filter((i) => i.state === 'complete').length;
        }
        if (c.statusSemantic === 'Completed' || c.closed) {
          completedTasksCount += 1;
        }
      }

      const pActivities = activities.filter((a) => a.person.toLowerCase().includes(pName));

      return {
        member: m,
        activeCardsCount: assignedCards.filter((c) => c.statusSemantic !== 'Completed' && !c.closed).length,
        completedActivitiesCount: completedTasksCount || pActivities.filter((a) => a.action === 'completed').length,
        recentCards: assignedCards.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          listName: c.listName,
          status: c.statusSemantic,
          url: c.url,
        })),
        recentActivities: pActivities.slice(0, 4),
      };
    })
    .sort((a, b) => b.activeCardsCount + b.completedActivitiesCount - (a.activeCardsCount + a.completedActivitiesCount));

  res.json({
    metrics: {
      totalCards: cards.length,
      activeWork: activeCards.length,
      completedThisMonth: completedCards.length,
      inReview: inReviewCards.length,
      aiInitiatives: aiInitiatives.length,
      contentWork: contentCards.length,
      seoWork: seoCards.length,
      totalMembers: members.length,
    },
    activeCards: activeCards.slice(0, 10),
    recentCompleted: completedCards.slice(0, 10),
    aiInitiatives,
    memberOverviews,
  });
});

// -------------------------------------------------------------
// 8. MANAGEMENT BRIEFS
// -------------------------------------------------------------
app.post('/api/management-brief', async (req, res) => {
  const { periodType = 'this_month', dateFrom, dateTo } = req.body;
  try {
    const brief = await generateManagementBrief({
      periodType,
      dateFrom,
      dateTo,
    });
    res.json(brief);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate brief' });
  }
});

app.get('/api/management-briefs', (req, res) => {
  res.json(db.getManagementBriefs());
});

app.get('/api/management-briefs/:id', (req, res) => {
  const brief = db.getManagementBriefById(req.params.id);
  if (!brief) {
    return res.status(404).json({ error: 'Brief not found' });
  }
  res.json(brief);
});

// -------------------------------------------------------------
// 9. VITE SPA FALLBACK & STATIC SERVING
// -------------------------------------------------------------
async function setupViteMiddleware() {
  if (pgStore.isConfigured()) {
    pgStore.initSchema().catch((err) => console.warn('Database initialization warning:', err.message));
  }

  // Ensure clean state and auto-generate real brief if real data exists
  try {
    db.cleanDemoDataIfReal();
    const isReal = db.getConnectionStatus().mode === 'real';
    const existingCards = db.getCards();
    const existingClients = db.getClients();

    if (isReal && existingCards.length > 0 && existingClients.length <= 1) {
      const boards = db.getBoards();
      const board = boards[0] || {
        id: db.getConnectionStatus().boardId || '68114872282c6eabcdad8400',
        name: db.getConnectionStatus().boardName || 'PDS/GFM-SEO',
        url: '',
        closed: false,
      };
      const normalized = normalizeTrelloPayload(
        {
          board: { id: board.id, name: board.name, url: board.url || '', closed: false },
          lists: db.getLists(),
          members: db.getMembers(),
          labels: db.getLabels(),
          cards: existingCards,
          boardChecklists: Object.values((db as any).state.checklists || {}),
        },
        []
      );
      db.replaceBoardData(normalized);
    }

    const briefs = db.getManagementBriefs();
    if (isReal && briefs.length === 0) {
      await generateManagementBrief({ periodType: 'this_month' });
    }
  } catch (initErr: any) {
    console.warn('Initial real data setup notice:', initErr.message);
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SEO & Content Team Intelligence Server listening on port ${PORT}`);
  });
}

setupViteMiddleware();
