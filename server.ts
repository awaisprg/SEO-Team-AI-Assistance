import express from 'express';
import path from 'path';
import { db } from './server/db/store';
import { getSeedData } from './server/trello/seed';
import { TrelloClient } from './server/trello/client';
import { normalizeTrelloPayload } from './server/trello/normalizer';
import { extractQueryIntent } from './server/ai/intent';
import { hybridRetrieve, formatSources } from './server/ai/retrieval';
import { generateEvidenceAnswer } from './server/ai/answering';
import { generateManagementBrief } from './server/ai/brief';
import { UserRole } from './src/types';

// Ensure demo data is seeded initially if store is empty
if (Object.keys(db.getCards()).length === 0) {
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
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
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
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      type: process.env.DATABASE_URL ? 'postgresql' : 'store_indexed',
      status: 'connected',
      cardsCount: status.totalCards,
      clientsCount: status.totalClients,
      activitiesCount: status.totalActivities,
    },
    trello: {
      configured: status.apiKeyConfigured && status.tokenConfigured,
      connected: status.connected,
      isDemoData: status.isDemoData,
      boardName: status.boardName || 'PDS/GFM-SEO',
      lastSyncAt: status.lastSyncAt,
    },
    ai: {
      provider: process.env.AI_PROVIDER || 'gemini',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.AI_MODEL || 'gemini-3.8-flash',
    },
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
      apiKey,
      token,
      boardId: boardId || '',
      boardName: boardName || '',
      connected: true,
      isDemoData: false,
    });

    res.json({
      success: true,
      message: `Successfully connected to Trello as ${test.fullName} (@${test.username})`,
      username: test.username,
      fullName: test.fullName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Trello connection error' });
  }
});

app.get('/api/trello/boards', async (req, res) => {
  const conn = db.getConnection();
  if (conn.isDemoData || (!conn.apiKey && !process.env.TRELLO_API_KEY)) {
    // Return seed boards
    return res.json([
      {
        id: 'board_pds_gfm_seo',
        name: 'PDS/GFM-SEO (Main Board)',
        url: 'https://trello.com/b/pds-gfm-seo',
        closed: false,
      },
    ]);
  }

  try {
    const client = new TrelloClient({
      apiKey: conn.apiKey || process.env.TRELLO_API_KEY!,
      token: conn.token || process.env.TRELLO_TOKEN!,
    });
    const boards = await client.getBoards();
    res.json(boards);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load boards from Trello' });
  }
});

app.post('/api/trello/sync', async (req, res) => {
  if (currentUser.role === 'VIEWER') {
    return res.status(403).json({ error: 'Viewers cannot trigger synchronizations' });
  }

  const conn = db.getConnection();
  const startTime = new Date();
  const boardId = req.body.boardId || conn.boardId || 'board_pds_gfm_seo';

  // If in demo mode or no live credentials
  if (conn.isDemoData || (!conn.apiKey && !process.env.TRELLO_API_KEY)) {
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
      connected: true,
    });

    return res.json({
      success: true,
      message: 'Demo dataset synchronized and refreshed successfully.',
      run,
    });
  }

  // Live Trello sync
  try {
    const client = new TrelloClient({
      apiKey: conn.apiKey || process.env.TRELLO_API_KEY!,
      token: conn.token || process.env.TRELLO_TOKEN!,
    });

    const [rawBoard, rawLists, rawMembers, rawLabels, rawCards] = await Promise.all([
      client.getBoard(boardId),
      client.getLists(boardId),
      client.getMembers(boardId),
      client.getLabels(boardId),
      client.getCardsWithDetails(boardId),
    ]);

    const existingClients = db.getClients();
    const normalized = normalizeTrelloPayload(
      {
        board: rawBoard,
        lists: rawLists,
        members: rawMembers,
        labels: rawLabels,
        cards: rawCards,
      },
      existingClients
    );

    // Upsert into persistent store
    db.upsertBoard(normalized.board);
    db.upsertLists(normalized.lists);
    db.upsertMembers(normalized.members);
    db.upsertLabels(normalized.labels);
    db.upsertCards(normalized.cards);

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
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success',
    });

    res.json({
      success: true,
      message: `Synchronized ${rawCards.length} cards and ${rawLists.length} lists from Trello board "${rawBoard.name}".`,
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

  const activeCards = cards.filter((c) => c.statusSemantic !== 'Completed' && !c.closed);
  const completedCards = cards.filter((c) => c.statusSemantic === 'Completed');
  const inReviewCards = cards.filter((c) => c.statusSemantic === 'In Review');
  const aiInitiatives = cards.filter((c) =>
    c.labels.some((l) => l.name.toLowerCase().includes('ai') || l.name.toLowerCase().includes('geo'))
  );
  const contentCards = cards.filter((c) =>
    c.labels.some((l) => l.name.toLowerCase().includes('content'))
  );
  const seoCards = cards.filter((c) =>
    c.labels.some((l) => l.name.toLowerCase().includes('technical') || l.name.toLowerCase().includes('seo'))
  );

  const memberOverviews = members.map((m) => {
    const pName = m.fullName.toLowerCase();
    const assignedCards = cards.filter(
      (c) =>
        c.members.some((mem) => mem.id === m.id) ||
        c.listName.toLowerCase().includes(pName)
    );
    const pActivities = activities.filter((a) => a.person.toLowerCase().includes(pName));

    return {
      member: m,
      activeCardsCount: assignedCards.filter((c) => c.statusSemantic !== 'Completed').length,
      completedActivitiesCount: pActivities.filter((a) => a.action === 'completed').length,
      recentCards: assignedCards.slice(0, 4).map((c) => ({
        id: c.id,
        name: c.name,
        listName: c.listName,
        status: c.statusSemantic,
        url: c.url,
      })),
      recentActivities: pActivities.slice(0, 4),
    };
  });

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
