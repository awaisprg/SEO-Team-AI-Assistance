import { db } from '../db/store';
import { startSyncJob, canStartSync, getActiveJob } from './syncJob';
import { TrelloClient } from './client';

let timer: NodeJS.Timeout | null = null;
let currentIntervalMinutes = 15; // Default recurring interval: 15 minutes
let isEnabled = true;

export function getAutoSyncStatus() {
  const conn = db.getConnection();
  const status = db.getConnectionStatus();
  const activeJob = getActiveJob();
  return {
    enabled: isEnabled,
    intervalMinutes: currentIntervalMinutes,
    lastAutoSyncAt: conn.lastAutoSyncAt,
    lastSyncAt: conn.lastSyncAt,
    lastSyncStatus: conn.lastSyncStatus,
    boardName: conn.boardName,
    isSyncing: Boolean(activeJob),
    connectionActive: Boolean(status.connected && conn.boardId && status.apiKeyConfigured && status.tokenConfigured),
  };
}

export function updateAutoSyncSettings(enabled: boolean, intervalMinutes: number) {
  isEnabled = enabled;
  if (intervalMinutes >= 5 && intervalMinutes <= 1440) {
    currentIntervalMinutes = intervalMinutes;
  }

  // Update in store
  db.updateConnection({
    autoSyncEnabled: isEnabled,
    autoSyncIntervalMinutes: currentIntervalMinutes,
  });

  restartTimer();

  // If enabled and connection is active, trigger an immediate sync cycle
  if (isEnabled) {
    triggerImmediateAutoSync('settings_updated');
  }

  return getAutoSyncStatus();
}

function restartTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (!isEnabled) {
    console.log('[AutoSync] Recurring background synchronization is paused.');
    return;
  }

  const ms = currentIntervalMinutes * 60 * 1000;
  console.log(`[AutoSync] Recurring background sync active: automatically synchronizing every ${currentIntervalMinutes} minutes.`);

  timer = setInterval(async () => {
    await performScheduledSync();
  }, ms);
}

export async function triggerImmediateAutoSync(reason: string): Promise<boolean> {
  if (!isEnabled) {
    console.log(`[AutoSync] Auto-sync is currently paused. Skipping trigger (${reason}).`);
    return false;
  }

  let conn = db.getConnection();
  let creds = db.getTrelloCredentials();

  // If credentials are present but boardId is missing, attempt auto-selection
  if (creds.apiKey && creds.token && !conn.boardId) {
    try {
      const client = new TrelloClient({ apiKey: creds.apiKey, token: creds.token });
      const boards = await client.getBoards();
      if (boards && boards.length > 0) {
        const preferred = boards.find(
          (b) => !b.closed && (b.name.includes('SEO') || b.name.includes('Content') || b.name.includes('PDS') || b.name.includes('Goldflex'))
        ) || boards.find((b) => !b.closed) || boards[0];

        if (preferred) {
          console.log(`[AutoSync] Auto-selected board "${preferred.name}" (${preferred.id}) for sync.`);
          db.updateConnection({
            boardId: preferred.id,
            boardName: preferred.name,
            connected: true,
            isDemoData: false,
            mode: 'real',
          });
          conn = db.getConnection();
        }
      }
    } catch (err: any) {
      console.warn('[AutoSync] Notice: could not auto-resolve board:', err.message);
    }
  }

  conn = db.getConnection();
  creds = db.getTrelloCredentials();

  const isConnectionActive = Boolean(
    conn.boardId &&
    creds.apiKey &&
    creds.token &&
    (conn.mode === 'real' || !conn.isDemoData)
  );

  if (!isConnectionActive) {
    console.log(`[AutoSync] Cannot auto-sync (${reason}): board or credentials not configured.`);
    return false;
  }

  if (!canStartSync()) {
    console.log(`[AutoSync] Sync already in progress. Skipping trigger (${reason}).`);
    return true;
  }

  console.log(`[AutoSync] Auto-sync triggered (${reason}) for board "${conn.boardName || conn.boardId}"...`);
  try {
    const result = startSyncJob({
      boardId: conn.boardId,
      mode: 'real',
      triggeredBy: `auto_sync_${reason}`,
    });

    db.updateConnection({
      lastAutoSyncAt: new Date().toISOString(),
      connected: true,
    });

    console.log(`[AutoSync] Successfully launched background sync job ${result.syncRun.id}.`);
    return true;
  } catch (err: any) {
    console.warn(`[AutoSync] Error starting sync job (${reason}):`, err.message);
    return false;
  }
}

/**
 * Opportunistic check called on API requests (e.g. /api/trello/status).
 * Ensures that if a container on Render recently woke up from sleep and was
 * not synced within the target interval, a background sync runs automatically.
 */
export function checkOpportunisticAutoSync(): void {
  if (!isEnabled) return;
  const conn = db.getConnection();
  const creds = db.getTrelloCredentials();
  if (!conn.boardId || !creds.apiKey || !creds.token || conn.mode === 'demo') return;
  if (!canStartSync()) return;

  const lastSync = conn.lastSyncAt ? new Date(conn.lastSyncAt).getTime() : 0;
  const elapsedMinutes = (Date.now() - lastSync) / (60 * 1000);

  if (elapsedMinutes >= currentIntervalMinutes || lastSync === 0) {
    console.log(`[AutoSync] Opportunistic trigger: board was last synced ${Math.round(elapsedMinutes)}m ago (interval: ${currentIntervalMinutes}m). Initiating sync...`);
    triggerImmediateAutoSync('opportunistic_request');
  }
}

async function performScheduledSync() {
  if (!isEnabled) return;
  await triggerImmediateAutoSync('recurring_timer');
}

export function initAutoSync() {
  const conn = db.getConnection();
  if (conn.autoSyncEnabled !== undefined) {
    isEnabled = conn.autoSyncEnabled;
  }
  // Default to 15 minutes if not set or set to older default
  if (conn.autoSyncIntervalMinutes && conn.autoSyncIntervalMinutes >= 5) {
    currentIntervalMinutes = conn.autoSyncIntervalMinutes;
  } else {
    currentIntervalMinutes = 15;
  }

  restartTimer();

  // Initial delayed sync after server start (5 seconds) if connection is active
  setTimeout(async () => {
    checkOpportunisticAutoSync();
  }, 5000);
}
