import express from 'express';
import path from 'path';
import { db } from './server/db/store';
import { pgStore } from './server/db/postgres';
import { getSeedData } from './server/trello/seed';
import { TrelloClient } from './server/trello/client';
import { normalizeTrelloPayload } from './server/trello/normalizer';
import { extractQueryIntent } from './server/ai/intent';
import { hybridRetrieve } from './server/ai/retrieval';
import { generateEvidenceAnswer } from './server/ai/answering';
import { generateManagementBrief } from './server/ai/brief';
import { requireAuth, requireRole } from './server/auth/supabase';
import { userRegistry, ADMIN_EMAIL } from './server/auth/users';
import { startSyncJob, getActiveJob, getLatestJob } from './server/trello/syncJob';
import { createRateLimiter } from './server/middleware/rateLimiter';
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
  db.updateConnection({
    mode: 'real',
    isDemoData: false,
  });
}

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

// Apply rate limiting
const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 150 });
const syncLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 15, message: 'Too many sync requests. Please wait.' });

app.use('/api', generalLimiter);

// -------------------------------------------------------------
// 1. HEALTH & OBSERVABILITY ENDPOINTS
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const status = db.getConnectionStatus();
  res.json({
    status: 'ok',
    trello: status.connected ? 'connected' : 'disconnected',
    database: pgStore.isConfigured() ? 'postgresql_configured' : 'in_memory_store',
    mode: status.mode,
    board: status.boardName || undefined,
    lastSyncAt: status.lastSyncAt,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.1.0',
  });
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & SESSION
// -------------------------------------------------------------
// Public endpoint to inform the frontend of available Supabase config
app.get('/api/auth/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    configured: Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    ),
    adminEmail: ADMIN_EMAIL,
  });
});

// User Sign In Endpoint (Enforces awais7475@prgmd.com / PDS@Mkt7475! for Admin)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = userRegistry.authenticate(email, password);
    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

// User Sign Up Endpoint (For Manager and Viewer with email auth)
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Admin cannot be signed up via registration form
  if (role === 'ADMIN' || (email && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase())) {
    return res.status(403).json({
      error: 'Admin role is restricted. Only awais7475@prgmd.com with the authorized master password can access Admin.',
    });
  }

  const selectedRole = role === 'VIEWER' ? 'VIEWER' : 'MANAGER';

  try {
    const result = userRegistry.register({
      email,
      password,
      name,
      role: selectedRole,
    });
    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Authenticated session endpoint
app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json(req.user);
});

// -------------------------------------------------------------
// 3. TRELLO CONFIGURATION & SYNCHRONIZATION
// -------------------------------------------------------------
app.get('/api/trello/status', requireAuth, (req, res) => {
  res.json(db.getConnectionStatus());
});

// Configure Trello API Key and Token (ADMIN only)
app.post('/api/trello/credentials', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const { apiKey, token } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(400).json({ error: 'Valid Trello API Key is required.' });
  }
  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'Valid Trello Member Token is required.' });
  }

  const cleanKey = apiKey.trim();
  const cleanToken = token.trim();

  try {
    const client = new TrelloClient({ apiKey: cleanKey, token: cleanToken });
    const test = await client.testConnection();

    if (!test.success) {
      return res.status(400).json({
        error: test.error || 'Failed to authenticate with Trello API using the provided credentials.',
      });
    }

    db.setTrelloCredentials(cleanKey, cleanToken);

    res.json({
      success: true,
      message: `Trello credentials verified and saved for member ${test.fullName} (@${test.username}).`,
      user: {
        username: test.username,
        fullName: test.fullName,
      },
      boardsCount: test.boardsCount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify Trello credentials' });
  }
});

// Connection test endpoint - tests provided or stored credentials
app.all('/api/trello/test', requireAuth, async (req, res) => {
  const bodyKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  const bodyToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

  const creds = db.getTrelloCredentials();
  const apiKey = bodyKey || creds.apiKey;
  const token = bodyToken || creds.token;

  if (!apiKey || !token) {
    return res.status(400).json({
      success: false,
      error: 'Trello API Key and Token are not configured. Please enter them in Settings.',
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
      message: 'Connected successfully to Trello API',
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

// Connect to a specific board (ADMIN only)
app.post('/api/trello/connect', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const { boardId, boardName, apiKey: bodyKey, token: bodyToken } = req.body || {};

  if (bodyKey && bodyToken) {
    db.setTrelloCredentials(bodyKey, bodyToken);
  }

  const creds = db.getTrelloCredentials();
  const apiKey = creds.apiKey;
  const token = creds.token;

  if (!apiKey || !token) {
    return res.status(400).json({
      error: 'Trello API credentials are missing. Please provide API Key and Token in Settings.',
    });
  }

  if (!boardId || typeof boardId !== 'string') {
    return res.status(400).json({ error: 'Valid boardId is required.' });
  }

  try {
    const client = new TrelloClient({ apiKey, token });
    const board = await client.getBoard(boardId);

    db.updateConnection({
      boardId: board.id,
      boardName: boardName || board.name,
      connected: true,
      isDemoData: false,
      mode: 'real',
    });

    res.json({
      success: true,
      message: `Successfully connected to board "${board.name}"`,
      boardId: board.id,
      boardName: board.name,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to connect to Trello board' });
  }
});

app.post('/api/trello/disconnect', requireAuth, requireRole(['ADMIN']), (req, res) => {
  db.disconnect();
  res.json({ success: true, message: 'Disconnected from Trello board successfully.' });
});

app.post('/api/trello/mode', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const { mode } = req.body;
  if (mode !== 'real' && mode !== 'demo') {
    return res.status(400).json({ error: 'Mode must be "real" or "demo"' });
  }
  db.setMode(mode);
  res.json({ success: true, mode, message: `Switched mode to ${mode}` });
});

app.get('/api/trello/boards', requireAuth, async (req, res) => {
  const conn = db.getConnection();
  const creds = db.getTrelloCredentials();
  const apiKey = creds.apiKey;
  const token = creds.token;

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
      error: 'Trello API credentials are missing. Please enter your Trello API Key and Token.',
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

// Asynchronous Job Status Endpoint
app.get('/api/trello/sync/status', requireAuth, (req, res) => {
  const activeJob = getActiveJob();
  const latestJob = getLatestJob();
  const status = db.getConnectionStatus();
  const lastRun = db.getLastSyncRun();

  res.json({
    inProgress: Boolean(activeJob),
    activeJob: activeJob || undefined,
    latestJob: latestJob || undefined,
    status: activeJob ? 'in_progress' : (status.lastSyncStatus || 'idle'),
    phase: activeJob?.phase,
    lastSyncAt: status.lastSyncAt,
    lastRun,
    totalCards: status.totalCards,
    totalComments: status.totalComments,
    totalActivities: status.totalActivities,
    totalClients: status.totalClients,
  });
});

// Asynchronous Job-Based Trello Synchronization (ADMIN & MANAGER)
app.post('/api/trello/sync', requireAuth, requireRole(['ADMIN', 'MANAGER']), syncLimiter, (req, res) => {
  const { boardId, mode } = req.body;

  const result = startSyncJob({
    boardId,
    mode,
    triggeredBy: req.user?.name,
  });

  if (result.alreadyRunning) {
    return res.status(409).json({
      success: false,
      error: 'A synchronization job is already in progress. Please poll /api/trello/sync/status for progress.',
      syncRun: result.syncRun,
    });
  }

  // Return immediately with 202 Accepted and job handle
  res.status(202).json({
    success: true,
    message: 'Trello synchronization initiated in background.',
    syncRun: result.syncRun,
  });
});

app.post('/api/trello/seed-demo', requireAuth, requireRole(['ADMIN']), (req, res) => {
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
    mode: 'demo',
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
app.get('/api/lists', requireAuth, (req, res) => {
  res.json(db.getLists());
});

app.post('/api/lists/semantics', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const { listId, semanticType, mappedStatus, mappedPerson } = req.body;
  if (!listId || typeof listId !== 'string' || !semanticType || typeof semanticType !== 'string') {
    return res.status(400).json({ error: 'listId and valid semanticType are required' });
  }

  const validTypes = ['status', 'person', 'resources', 'client', 'adhoc', 'other'];
  if (!validTypes.includes(semanticType)) {
    return res.status(400).json({ error: `semanticType must be one of: ${validTypes.join(', ')}` });
  }

  db.updateListSemantics(listId, semanticType as any, mappedStatus, mappedPerson);
  res.json({ success: true, list: db.getLists().find((l) => l.id === listId) });
});

// -------------------------------------------------------------
// 5. CHAT & INTELLIGENCE RETRIEVAL
// -------------------------------------------------------------
app.post('/api/chat', requireAuth, async (req, res) => {
  const { question, sessionId } = req.body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const sanitizedQuestion = question.trim().slice(0, 1500);

  try {
    // 1. Audit / Session
    let activeSession = sessionId ? db.getChatSession(sessionId) : null;
    if (!activeSession) {
      activeSession = db.createChatSession(sanitizedQuestion.slice(0, 50));
    }

    // Add user message
    db.addChatMessage(activeSession.id, {
      role: 'user',
      content: sanitizedQuestion,
    });

    // 2. Query Understanding & Intent Extraction
    const knownClients = db.getClients();
    const knownMembers = db.getMembers();
    const intent = extractQueryIntent(sanitizedQuestion, knownClients, knownMembers);

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

app.get('/api/chat/sessions', requireAuth, (req, res) => {
  res.json(db.getChatSessions());
});

app.get('/api/chat/sessions/:id', requireAuth, (req, res) => {
  const session = db.getChatSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// -------------------------------------------------------------
// 6. CLIENT INTELLIGENCE ENDPOINTS
// -------------------------------------------------------------
app.get('/api/clients', requireAuth, (req, res) => {
  res.json(db.getClients());
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = db.getClientById(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  res.json(client);
});

app.post('/api/clients/:id/aliases', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const { alias } = req.body;
  if (!alias || typeof alias !== 'string' || !alias.trim()) {
    return res.status(400).json({ error: 'Valid alias string is required' });
  }

  const client = db.getClientById(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const cleanAlias = alias.trim().slice(0, 100);
  if (!client.aliases.includes(cleanAlias)) {
    client.aliases.push(cleanAlias);
    db.upsertClient(client);
  }

  res.json(client);
});

// -------------------------------------------------------------
// 7. TEAM OVERVIEW (NON-SURVEILLANCE)
// -------------------------------------------------------------
app.get('/api/team', requireAuth, (req, res) => {
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
app.post('/api/management-brief', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  const { periodType = 'this_month', dateFrom, dateTo } = req.body;
  const allowed = ['overall', 'this_week', 'last_week', 'this_month', 'last_month'];
  if (!allowed.includes(periodType)) {
    return res.status(400).json({ error: `periodType must be one of: ${allowed.join(', ')}` });
  }

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

app.get('/api/management-briefs', requireAuth, (req, res) => {
  res.json(db.getManagementBriefs());
});

app.get('/api/management-briefs/:id', requireAuth, (req, res) => {
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
    try {
      await pgStore.initSchema();
      await db.loadFromPostgres();
    } catch (err: any) {
      console.warn('PostgreSQL initialization notice:', err.message);
    }
  }

  try {
    db.cleanDemoDataIfReal();
  } catch (initErr: any) {
    console.warn('Initial clean demo check notice:', initErr.message);
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

  // Only start listening if not running in a Vercel serverless environment
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SEO & Content Team Intelligence Server listening on port ${PORT}`);
    });
  }
}

setupViteMiddleware();

export default app;
