import { db } from '../db/store';
import { startSyncJob, canStartSync } from './syncJob';

let timer: NodeJS.Timeout | null = null;
let currentIntervalMinutes = 60; // Default recurring interval: 60 minutes
let isEnabled = true;

export function getAutoSyncStatus() {
  const conn = db.getConnection();
  const status = db.getConnectionStatus();
  return {
    enabled: isEnabled,
    intervalMinutes: currentIntervalMinutes,
    lastAutoSyncAt: conn.lastAutoSyncAt,
    lastSyncAt: conn.lastSyncAt,
    lastSyncStatus: conn.lastSyncStatus,
    boardName: conn.boardName,
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

async function performScheduledSync() {
  if (!isEnabled) return;

  const conn = db.getConnection();
  const creds = db.getTrelloCredentials();
  const status = db.getConnectionStatus();

  // Verify Trello connection status is active and configured
  const isConnectionActive = Boolean(
    status.connected &&
    conn.boardId &&
    creds.apiKey &&
    creds.token &&
    (conn.mode === 'real' || !conn.isDemoData)
  );

  if (!isConnectionActive) {
    console.log('[AutoSync] Trello connection status is not active or credentials missing. Skipping background sync.');
    return;
  }

  if (!canStartSync()) {
    console.log('[AutoSync] Sync job already in progress. Skipping cycle.');
    return;
  }

  console.log(`[AutoSync] Recurring 60m trigger: Initiating automatic synchronization for active board "${conn.boardName || conn.boardId}"...`);
  try {
    const result = startSyncJob({
      boardId: conn.boardId,
      mode: 'real',
      triggeredBy: 'recurring_60m_auto_sync',
    });

    db.updateConnection({
      lastAutoSyncAt: new Date().toISOString(),
    });

    console.log(`[AutoSync] Successfully triggered background sync job (${result.syncRun.id}).`);
  } catch (err: any) {
    console.warn('[AutoSync] Error during recurring background sync:', err.message);
  }
}

export function initAutoSync() {
  const conn = db.getConnection();
  if (conn.autoSyncEnabled !== undefined) {
    isEnabled = conn.autoSyncEnabled;
  }
  // Default to 60 minutes if not set or set to older default
  if (conn.autoSyncIntervalMinutes && conn.autoSyncIntervalMinutes >= 5) {
    currentIntervalMinutes = conn.autoSyncIntervalMinutes;
  } else {
    currentIntervalMinutes = 60;
  }

  restartTimer();

  // Initial delayed sync after server start (10 seconds) if connection is active and was not synced in the last hour
  setTimeout(async () => {
    const freshConn = db.getConnection();
    const creds = db.getTrelloCredentials();
    const status = db.getConnectionStatus();
    const isConnectionActive = Boolean(
      status.connected &&
      freshConn.boardId &&
      creds.apiKey &&
      creds.token &&
      (freshConn.mode === 'real' || !freshConn.isDemoData)
    );

    if (isConnectionActive && isEnabled) {
      const lastSync = freshConn.lastSyncAt ? new Date(freshConn.lastSyncAt).getTime() : 0;
      const elapsedMinutes = (Date.now() - lastSync) / (60 * 1000);

      // If last sync was more than 60 minutes ago, initiate background sync
      if (elapsedMinutes >= currentIntervalMinutes) {
        console.log(`[AutoSync] Initial startup check: last sync was ${Math.round(elapsedMinutes)}m ago (>= ${currentIntervalMinutes}m). Initiating background sync...`);
        await performScheduledSync();
      } else {
        console.log(`[AutoSync] Board recently synced (${Math.round(elapsedMinutes)}m ago). Next auto-sync scheduled in ${Math.round(currentIntervalMinutes - elapsedMinutes)}m.`);
      }
    }
  }, 10000);
}
