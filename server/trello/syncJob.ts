import { SyncRun } from '../../src/types';
import { db } from '../db/store';
import { TrelloClient } from './client';
import { normalizeTrelloPayload } from './normalizer';
import { getSeedData } from './seed';
import { generateManagementBrief } from '../ai/brief';

export interface ExtendedSyncJob extends SyncRun {
  phase?: string;
  boardId?: string;
  boardName?: string;
  mode: 'real' | 'demo';
  message?: string;
}

let activeJob: ExtendedSyncJob | null = null;
const jobHistory = new Map<string, ExtendedSyncJob>();

export function getActiveJob(): ExtendedSyncJob | null {
  if (activeJob && activeJob.status === 'in_progress') {
    return activeJob;
  }
  return null;
}

export function canStartSync(): boolean {
  return !activeJob || activeJob.status !== 'in_progress';
}

export function getJobById(id: string): ExtendedSyncJob | null {
  if (activeJob && activeJob.id === id) return activeJob;
  return jobHistory.get(id) || null;
}

export function getLatestJob(): ExtendedSyncJob | null {
  return activeJob;
}

/**
 * Initiates an asynchronous Trello synchronization job without blocking the request handler.
 * Returns immediately with the job handle and status.
 */
export function startSyncJob(options: {
  boardId?: string;
  triggeredBy?: string;
  mode?: 'real' | 'demo';
}): { syncRun: ExtendedSyncJob; alreadyRunning: boolean } {
  if (activeJob && activeJob.status === 'in_progress') {
    return { syncRun: activeJob, alreadyRunning: true };
  }

  const conn = db.getConnection();
  const targetMode = options.mode || conn.mode || (conn.isDemoData ? 'demo' : 'real');
  const targetBoardId = options.boardId || conn.boardId || '';

  const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const job: ExtendedSyncJob = {
    id: syncJobId,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    phase: 'Initializing synchronization job...',
    boardId: targetBoardId,
    mode: targetMode,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
    message: 'Synchronization started in background',
  };

  activeJob = job;
  jobHistory.set(job.id, job);

  // Fire and forget background worker
  executeSyncWorker(job).catch((err) => {
    console.error(`[SyncWorker] Unhandled failure in job ${job.id}:`, err);
  });

  return { syncRun: job, alreadyRunning: false };
}

async function executeSyncWorker(job: ExtendedSyncJob): Promise<void> {
  const startTime = Date.now();

  try {
    if (job.mode === 'demo') {
      job.phase = 'Loading demo seed dataset...';
      const seed = getSeedData();

      job.phase = 'Populating team intelligence cache...';
      db.upsertBoard(seed.board);
      db.upsertLists(seed.lists);
      db.upsertMembers(seed.members);
      db.upsertLabels(seed.labels);
      seed.clients.forEach((c) => db.upsertClient(c));
      db.upsertCards(seed.cards);

      job.recordsProcessed = seed.cards.length + seed.lists.length;
      job.recordsUpdated = seed.cards.length;
      job.status = 'success';
      job.phase = 'Complete';
      job.completedAt = new Date().toISOString();
      job.message = 'Demo dataset synchronized and refreshed successfully.';

      db.recordSyncRun({
        id: job.id,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        status: 'success',
        recordsProcessed: job.recordsProcessed,
        recordsCreated: 0,
        recordsUpdated: job.recordsUpdated,
        errors: [],
      });

      db.updateConnection({
        lastSyncAt: job.completedAt,
        lastSyncStatus: 'success',
        isDemoData: true,
        mode: 'demo',
        connected: true,
      });

      return;
    }

    // REAL TRELLO MODE:
    // Credentials come from configured store or server environment variables
    const creds = db.getTrelloCredentials();
    const apiKey = creds.apiKey;
    const token = creds.token;

    if (!apiKey || !token) {
      throw new Error(
        'Trello credentials not configured. Please enter your Trello API Key and Token in Settings.'
      );
    }

    const boardId = job.boardId || db.getConnection().boardId;
    if (!boardId) {
      throw new Error(
        'No Trello board selected for synchronization. Please select a board in Settings.'
      );
    }

    const client = new TrelloClient({ apiKey, token });

    job.phase = 'Fetching board details and lists from Trello API...';
    const [rawBoard, rawLists, rawMembers, rawLabels] = await Promise.all([
      client.getBoard(boardId),
      client.getLists(boardId),
      client.getMembers(boardId),
      client.getLabels(boardId),
    ]);

    job.boardName = rawBoard.name;

    job.phase = 'Fetching cards, checklists, and board actions (high concurrency)...';
    const [rawCards, rawBoardChecklists, rawBoardActions] = await Promise.all([
      client.getCardsWithDetails(boardId),
      client.getBoardChecklists(boardId),
      client.getBoardActions(boardId, 1000).catch((err) => {
        console.warn('Could not fetch board actions (fallback to empty):', err.message);
        return [];
      }),
    ]);

    job.phase = 'Analyzing card completion timestamps and client mapping...';
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

    job.phase = 'Persisting synchronized records to database...';
    db.replaceBoardData(normalized);

    job.recordsProcessed = normalized.cards.length + normalized.lists.length;
    job.recordsUpdated = normalized.cards.length;

    // Generate fresh management brief if possible
    job.phase = 'Generating executive management brief...';
    try {
      await generateManagementBrief({ periodType: 'this_month' });
    } catch (bErr: any) {
      console.warn('Auto-brief generation notice:', bErr.message);
    }

    const completedAt = new Date().toISOString();
    job.status = 'success';
    job.phase = 'Complete';
    job.completedAt = completedAt;
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    job.message = `Successfully synchronized ${normalized.cards.length} cards, ${normalized.lists.length} lists, and ${normalized.clients.length} clients in ${durationSec}s.`;

    db.recordSyncRun({
      id: job.id,
      startedAt: job.startedAt,
      completedAt,
      status: 'success',
      recordsProcessed: job.recordsProcessed,
      recordsCreated: 0,
      recordsUpdated: job.recordsUpdated,
      errors: [],
    });

    db.updateConnection({
      lastSyncAt: completedAt,
      lastSyncStatus: 'success',
      connected: true,
      isDemoData: false,
      mode: 'real',
      boardId: rawBoard.id,
      boardName: rawBoard.name,
    });
  } catch (err: any) {
    console.error(`[SyncWorker] Synchronization error in job ${job.id}:`, err);
    job.status = 'failed';
    job.phase = 'Failed';
    job.completedAt = new Date().toISOString();
    job.errors.push(err.message || 'Unknown synchronization error');
    job.message = `Synchronization failed: ${err.message}`;

    db.recordSyncRun({
      id: job.id,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      status: 'failed',
      recordsProcessed: job.recordsProcessed,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: [err.message || 'Synchronization failed'],
    });

    db.updateConnection({
      lastSyncStatus: 'failed',
    });
  }
}
