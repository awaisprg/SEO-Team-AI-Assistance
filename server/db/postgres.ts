import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  TrelloCard,
  TrelloList,
  TrelloBoard,
  TrelloMember,
  TrelloLabel,
  TrelloChecklist,
  TrelloComment,
  TrelloActivity,
  TrelloAttachment,
  ClientEntity,
  SyncRun,
  ManagementBrief,
  ChatMessage,
  ChatSession,
} from '../../src/types';

export class PostgresStore {
  private pool: Pool | null = null;
  private isInitialized = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (connectionString) {
      try {
        const config: PoolConfig = {
          connectionString,
          ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
        };
        this.pool = new Pool(config);
      } catch (err) {
        console.warn('Postgres connection pool failed to initialize:', err);
      }
    }
  }

  isConfigured(): boolean {
    return this.pool !== null;
  }

  async checkHealth(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const res = await this.pool.query('SELECT 1 as alive;');
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  async initSchema(): Promise<boolean> {
    if (!this.pool) return false;
    if (this.isInitialized) return true;

    try {
      const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        
        // Execute extension statement with try-catch so non-superuser setups don't abort
        try {
          await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        } catch (e: any) {
          // ignore extension error if not permitted
        }

        try {
          await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
        } catch (e: any) {
          // ignore pgvector error if not permitted
        }

        // Execute schema SQL safely
        await this.pool.query(sql);

        // Idempotent column migrations for card tracking and briefs
        await this.pool.query(`
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS is_under_progress BOOLEAN DEFAULT FALSE;
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS completed_at_verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS completed_by VARCHAR(255);
          ALTER TABLE trello_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

          ALTER TABLE management_briefs ADD COLUMN IF NOT EXISTS active_pipeline_count INT DEFAULT 0;
          ALTER TABLE management_briefs ADD COLUMN IF NOT EXISTS cards_completed_count INT DEFAULT 0;
          ALTER TABLE management_briefs ADD COLUMN IF NOT EXISTS checklist_tasks_completed_count INT DEFAULT 0;
          ALTER TABLE management_briefs ADD COLUMN IF NOT EXISTS cards_created_count INT DEFAULT 0;

          ALTER TABLE trello_connections ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'real';

          CREATE TABLE IF NOT EXISTS app_users (
            id VARCHAR(128) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'MANAGER',
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        this.isInitialized = true;
        console.log('PostgreSQL database schema initialized successfully.');
        return true;
      }
    } catch (err: any) {
      console.error('Failed to run PostgreSQL schema:', err.message);
    }
    return false;
  }

  // --- Board Methods ---
  async upsertBoard(board: TrelloBoard): Promise<void> {
    if (!this.pool) return;
    const query = `
      INSERT INTO trello_boards (id, name, url, closed, synced_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        url = EXCLUDED.url,
        closed = EXCLUDED.closed,
        synced_at = NOW();
    `;
    await this.pool.query(query, [board.id, board.name, board.url, board.closed]);
  }

  // --- List Methods ---
  async upsertLists(lists: TrelloList[]): Promise<void> {
    if (!this.pool || lists.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const l of lists) {
        const query = `
          INSERT INTO trello_lists (id, board_id, name, closed, pos, semantic_type, mapped_status, mapped_person, synced_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            closed = EXCLUDED.closed,
            pos = EXCLUDED.pos,
            semantic_type = COALESCE(trello_lists.semantic_type, EXCLUDED.semantic_type),
            mapped_status = COALESCE(trello_lists.mapped_status, EXCLUDED.mapped_status),
            mapped_person = COALESCE(trello_lists.mapped_person, EXCLUDED.mapped_person),
            synced_at = NOW();
        `;
        await client.query(query, [
          l.id,
          l.boardId,
          l.name,
          l.closed,
          l.pos || 0,
          l.semanticType || 'other',
          l.mappedStatus || null,
          l.mappedPerson || null,
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateListSemantics(
    listId: string,
    semanticType: string,
    mappedStatus?: string,
    mappedPerson?: string
  ): Promise<void> {
    if (!this.pool) return;
    const query = `
      UPDATE trello_lists
      SET semantic_type = $2,
          mapped_status = $3,
          mapped_person = $4,
          synced_at = NOW()
      WHERE id = $1;
    `;
    await this.pool.query(query, [listId, semanticType, mappedStatus || null, mappedPerson || null]);
  }

  // --- Member Methods ---
  async upsertMembers(members: TrelloMember[]): Promise<void> {
    if (!this.pool || members.length === 0) return;
    for (const m of members) {
      const query = `
        INSERT INTO trello_members (id, full_name, username, avatar_url, role, synced_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          username = EXCLUDED.username,
          avatar_url = EXCLUDED.avatar_url,
          role = EXCLUDED.role,
          synced_at = NOW();
      `;
      await this.pool.query(query, [m.id, m.fullName, m.username, m.avatarUrl || null, m.role || null]);
    }
  }

  // --- Label Methods ---
  async upsertLabels(labels: TrelloLabel[], boardId: string): Promise<void> {
    if (!this.pool || labels.length === 0) return;
    for (const l of labels) {
      const query = `
        INSERT INTO trello_labels (id, board_id, name, color, synced_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          color = EXCLUDED.color,
          synced_at = NOW();
      `;
      await this.pool.query(query, [l.id, boardId, l.name, l.color]);
    }
  }

  // --- Client & Alias Methods ---
  async upsertClients(clients: ClientEntity[]): Promise<void> {
    if (!this.pool || clients.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of clients) {
        const query = `
          INSERT INTO clients (id, canonical_name, status, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (canonical_name) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = NOW()
          RETURNING id;
        `;
        const res = await client.query(query, [c.id, c.canonicalName, c.status || 'Active']);
        const actualClientId = res.rows[0]?.id || c.id;

        for (const alias of c.aliases || []) {
          await client.query(
            `INSERT INTO client_aliases (client_id, alias)
             VALUES ($1, $2)
             ON CONFLICT (alias) DO NOTHING;`,
            [actualClientId, alias]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async addClientAlias(clientId: string, alias: string): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO client_aliases (client_id, alias)
       VALUES ($1, $2)
       ON CONFLICT (alias) DO NOTHING;`,
      [clientId, alias]
    );
  }

  // --- Card & Activity Methods ---
  async upsertCards(cards: TrelloCard[]): Promise<void> {
    if (!this.pool || cards.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of cards) {
        const query = `
          INSERT INTO trello_cards (
            id, board_id, list_id, name, description, url, due, date_last_activity, closed,
            status_semantic, is_completed, is_under_progress, completed_at, completed_at_verified,
            completed_by, client_canonical, raw_labels, raw_members, created_at, synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
          ON CONFLICT (id) DO UPDATE SET
            list_id = EXCLUDED.list_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            url = EXCLUDED.url,
            due = EXCLUDED.due,
            date_last_activity = EXCLUDED.date_last_activity,
            closed = EXCLUDED.closed,
            status_semantic = EXCLUDED.status_semantic,
            is_completed = EXCLUDED.is_completed,
            is_under_progress = EXCLUDED.is_under_progress,
            completed_at = EXCLUDED.completed_at,
            completed_at_verified = EXCLUDED.completed_at_verified,
            completed_by = EXCLUDED.completed_by,
            client_canonical = EXCLUDED.client_canonical,
            raw_labels = EXCLUDED.raw_labels,
            raw_members = EXCLUDED.raw_members,
            created_at = COALESCE(trello_cards.created_at, EXCLUDED.created_at),
            synced_at = NOW();
        `;
        await client.query(query, [
          c.id,
          c.boardId,
          c.listId,
          c.name,
          c.desc,
          c.url,
          c.due || null,
          c.dateLastActivity,
          c.closed,
          c.statusSemantic,
          c.isCompleted || false,
          c.isUnderProgress || false,
          c.completedAt || null,
          c.completedAtVerified || false,
          c.completedBy || null,
          c.clientCanonical || null,
          JSON.stringify(c.labels || []),
          JSON.stringify(c.members || []),
          c.createdAt || new Date().toISOString(),
        ]);

        // Checklists & Items
        for (const cl of c.checklists || []) {
          await client.query(
            `INSERT INTO trello_checklists (id, card_id, name, synced_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, synced_at = NOW();`,
            [cl.id, c.id, cl.name]
          );

          for (const item of cl.items || []) {
            await client.query(
              `INSERT INTO trello_checklist_items (id, checklist_id, card_id, name, state, completed_at, synced_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW())
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state, completed_at = EXCLUDED.completed_at, synced_at = NOW();`,
              [item.id, cl.id, c.id, item.name, item.state, item.completedAt || null]
            );
          }
        }

        // Comments
        for (const comm of c.comments || []) {
          await client.query(
            `INSERT INTO trello_comments (id, card_id, author_id, author_name, text, created_at, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, synced_at = NOW();`,
            [comm.id, c.id, comm.authorId, comm.authorName, comm.text, comm.createdAt]
          );
        }

        // Activities
        for (const act of c.activities || []) {
          await client.query(
            `INSERT INTO trello_activities (id, card_id, card_title, client_canonical, person, activity_type, action, timestamp, details, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET details = EXCLUDED.details, synced_at = NOW();`,
            [
              act.id,
              c.id,
              act.cardTitle,
              act.clientCanonical || null,
              act.person,
              act.activityType,
              act.action,
              act.timestamp,
              act.details || null,
            ]
          );
        }

        // Attachments
        for (const att of c.attachments || []) {
          await client.query(
            `INSERT INTO trello_attachments (id, card_id, name, url, mime_type, date, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, synced_at = NOW();`,
            [att.id, c.id, att.name, att.url, att.mimeType || null, att.date]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Sync Runs ---
  async recordSyncRun(run: SyncRun): Promise<void> {
    if (!this.pool) return;
    const query = `
      INSERT INTO sync_runs (id, started_at, completed_at, status, records_processed, records_created, records_updated, errors)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        completed_at = EXCLUDED.completed_at,
        status = EXCLUDED.status,
        records_processed = EXCLUDED.records_processed,
        records_created = EXCLUDED.records_created,
        records_updated = EXCLUDED.records_updated,
        errors = EXCLUDED.errors;
    `;
    await this.pool.query(query, [
      run.id,
      run.startedAt,
      run.completedAt || null,
      run.status,
      run.recordsProcessed,
      run.recordsCreated,
      run.recordsUpdated,
      JSON.stringify(run.errors || []),
    ]);
  }

  // --- Management Briefs ---
  async saveManagementBrief(brief: ManagementBrief): Promise<void> {
    if (!this.pool) return;
    const query = `
      INSERT INTO management_briefs (
        id, period_type, date_from, date_to, title, executive_summary,
        major_accomplishments, seo_activity, content_activity, ai_overview_geo_activity,
        client_progress, current_priorities, blocked_work, innovations_experiments,
        talking_points, source_cards, active_pipeline_count, cards_completed_count,
        checklist_tasks_completed_count, cards_created_count, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        executive_summary = EXCLUDED.executive_summary,
        major_accomplishments = EXCLUDED.major_accomplishments,
        seo_activity = EXCLUDED.seo_activity,
        content_activity = EXCLUDED.content_activity,
        ai_overview_geo_activity = EXCLUDED.ai_overview_geo_activity,
        client_progress = EXCLUDED.client_progress,
        current_priorities = EXCLUDED.current_priorities,
        blocked_work = EXCLUDED.blocked_work,
        innovations_experiments = EXCLUDED.innovations_experiments,
        talking_points = EXCLUDED.talking_points,
        source_cards = EXCLUDED.source_cards,
        active_pipeline_count = EXCLUDED.active_pipeline_count,
        cards_completed_count = EXCLUDED.cards_completed_count,
        checklist_tasks_completed_count = EXCLUDED.checklist_tasks_completed_count,
        cards_created_count = EXCLUDED.cards_created_count;
    `;
    await this.pool.query(query, [
      brief.id,
      brief.periodType,
      brief.dateFrom,
      brief.dateTo,
      brief.title,
      brief.executiveSummary,
      JSON.stringify(brief.majorAccomplishments || []),
      JSON.stringify(brief.seoActivity || []),
      JSON.stringify(brief.contentActivity || []),
      JSON.stringify(brief.aiOverviewGeoActivity || []),
      JSON.stringify(brief.clientProgress || []),
      JSON.stringify(brief.currentPriorities || []),
      JSON.stringify(brief.blockedWork || []),
      JSON.stringify(brief.innovationsExperiments || []),
      JSON.stringify(brief.talkingPoints || []),
      JSON.stringify(brief.sourceCards || []),
      brief.activePipelineCount || 0,
      brief.cardsCompletedCount || 0,
      brief.checklistTasksCompletedCount || 0,
      brief.cardsCreatedCount || 0,
      brief.createdAt || new Date().toISOString(),
    ]);
  }

  // --- Chat Sessions & Messages ---
  async createChatSession(id: string, userId?: string, title: string = 'Management Query'): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [id, userId || null, title]
    );
  }

  async addChatMessage(sessionId: string, msg: ChatMessage): Promise<void> {
    if (!this.pool) return;
    await this.createChatSession(sessionId);
    const query = `
      INSERT INTO chat_messages (
        id, session_id, role, content, summary, key_points,
        status_breakdown, sources, evidence_strength, search_metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING;
    `;
    await this.pool.query(query, [
      msg.id,
      sessionId,
      msg.role,
      msg.content,
      msg.summary || null,
      JSON.stringify(msg.keyPoints || []),
      JSON.stringify(msg.statusBreakdown || {}),
      JSON.stringify(msg.sources || []),
      msg.evidenceStrength || null,
      JSON.stringify(msg.searchMetadata || {}),
      msg.createdAt || new Date().toISOString(),
    ]);
  }

  // --- User & Role Methods ---
  async getUserByEmail(email: string): Promise<{ id: string; email: string; name: string; role: string } | null> {
    if (!this.pool) return null;
    const res = await this.pool.query('SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER($1);', [email]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async upsertUser(user: { id: string; email: string; name: string; role: string }): Promise<void> {
    if (!this.pool) return;
    const query = `
      INSERT INTO users (id, email, name, role, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();
    `;
    await this.pool.query(query, [user.id, user.email, user.name, user.role]);
  }

  async updateUserRole(userIdOrEmail: string, role: string): Promise<boolean> {
    if (!this.pool) return false;
    const query = `
      UPDATE users
      SET role = $2, updated_at = NOW()
      WHERE id = $1 OR LOWER(email) = LOWER($1);
    `;
    const res = await this.pool.query(query, [userIdOrEmail, role]);
    return (res.rowCount || 0) > 0;
  }

  // --- Persistent App User Management (Handles Password Hashes, Salts, & Role Access) ---
  async getAllAppUsers(): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
  }[]> {
    if (!this.pool) return [];
    try {
      const res = await this.pool.query(
        'SELECT id, email, name, role, password_hash, salt, created_at FROM app_users ORDER BY created_at ASC;'
      );
      return res.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        passwordHash: r.password_hash,
        salt: r.salt,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Could not query app_users table:', err.message);
      return [];
    }
  }

  async upsertAppUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    passwordHash: string;
    salt: string;
    createdAt?: string;
  }): Promise<void> {
    if (!this.pool) return;
    try {
      const query = `
        INSERT INTO app_users (id, email, name, role, password_hash, salt, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()), NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          password_hash = EXCLUDED.password_hash,
          salt = EXCLUDED.salt,
          updated_at = NOW();
      `;
      await this.pool.query(query, [
        user.id,
        user.email.toLowerCase().trim(),
        user.name,
        user.role,
        user.passwordHash,
        user.salt,
        user.createdAt || null,
      ]);
    } catch (err: any) {
      console.error('Failed to upsert app_user in PostgreSQL:', err.message);
    }
  }

  async deleteAppUser(userId: string): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const res = await this.pool.query('DELETE FROM app_users WHERE id = $1;', [userId]);
      return (res.rowCount || 0) > 0;
    } catch (err: any) {
      console.error('Failed to delete app_user from PostgreSQL:', err.message);
      return false;
    }
  }

  async updateAppUserRole(userId: string, role: string): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const res = await this.pool.query(
        'UPDATE app_users SET role = $2, updated_at = NOW() WHERE id = $1;',
        [userId, role]
      );
      return (res.rowCount || 0) > 0;
    } catch (err: any) {
      console.error('Failed to update app_user role in PostgreSQL:', err.message);
      return false;
    }
  }

  // --- Hydration: Load all data from PostgreSQL ---
  async loadAllState(): Promise<{
    boards: Record<string, TrelloBoard>;
    lists: Record<string, TrelloList>;
    members: Record<string, TrelloMember>;
    labels: Record<string, TrelloLabel>;
    clients: Record<string, ClientEntity>;
    cards: Record<string, TrelloCard>;
    syncRuns: SyncRun[];
    managementBriefs: Record<string, ManagementBrief>;
    chatSessions: Record<string, ChatSession>;
  } | null> {
    if (!this.pool) return null;

    try {
      const [
        bRes,
        lRes,
        mRes,
        lblRes,
        cRes,
        clRes,
        chkRes,
        chkiRes,
        commRes,
        actRes,
        attRes,
        syncRes,
        briefRes,
        sessRes,
        msgRes,
      ] = await Promise.all([
        this.pool.query('SELECT * FROM trello_boards;'),
        this.pool.query('SELECT * FROM trello_lists ORDER BY pos ASC;'),
        this.pool.query('SELECT * FROM trello_members;'),
        this.pool.query('SELECT * FROM trello_labels;'),
        this.pool.query('SELECT * FROM clients;'),
        this.pool.query('SELECT * FROM trello_cards ORDER BY date_last_activity DESC;'),
        this.pool.query('SELECT * FROM trello_checklists;'),
        this.pool.query('SELECT * FROM trello_checklist_items;'),
        this.pool.query('SELECT * FROM trello_comments ORDER BY created_at DESC;'),
        this.pool.query('SELECT * FROM trello_activities ORDER BY timestamp DESC;'),
        this.pool.query('SELECT * FROM trello_attachments;'),
        this.pool.query('SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 20;'),
        this.pool.query('SELECT * FROM management_briefs ORDER BY created_at DESC;'),
        this.pool.query('SELECT * FROM chat_sessions ORDER BY updated_at DESC;'),
        this.pool.query('SELECT * FROM chat_messages ORDER BY created_at ASC;'),
      ]);

      const boards: Record<string, TrelloBoard> = {};
      for (const row of bRes.rows) {
        boards[row.id] = { id: row.id, name: row.name, url: row.url, closed: row.closed };
      }

      const lists: Record<string, TrelloList> = {};
      for (const row of lRes.rows) {
        lists[row.id] = {
          id: row.id,
          boardId: row.board_id,
          name: row.name,
          closed: row.closed,
          pos: row.pos,
          semanticType: row.semantic_type,
          mappedStatus: row.mapped_status,
          mappedPerson: row.mapped_person,
        };
      }

      const members: Record<string, TrelloMember> = {};
      for (const row of mRes.rows) {
        members[row.id] = {
          id: row.id,
          fullName: row.full_name,
          username: row.username,
          avatarUrl: row.avatar_url,
          role: row.role,
        };
      }

      const labels: Record<string, TrelloLabel> = {};
      for (const row of lblRes.rows) {
        labels[row.id] = { id: row.id, name: row.name, color: row.color };
      }

      const clients: Record<string, ClientEntity> = {};
      for (const row of cRes.rows) {
        clients[row.canonical_name] = {
          id: row.id,
          canonicalName: row.canonical_name,
          aliases: [],
          status: row.status || 'Active',
          agency: row.agency || 'Both',
          isHighPriority: Boolean(row.is_high_priority),
          activeCardCount: 0,
          completedTasksCount: 0,
          totalTasksCount: 0,
          teamMembers: [],
          lastActivityDate: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        };
      }

      // Populate aliases
      try {
        const aliasRes = await this.pool.query('SELECT client_id, alias FROM client_aliases;');
        const clientById: Record<string, ClientEntity> = {};
        Object.values(clients).forEach((c) => {
          clientById[c.id] = c;
        });
        for (const row of aliasRes.rows) {
          if (clientById[row.client_id]) {
            clientById[row.client_id].aliases.push(row.alias);
          }
        }
      } catch {
        // ignore alias load error
      }

      // Group checklists and items
      const checklistsByCard: Record<string, TrelloChecklist[]> = {};
      const itemsByChecklist: Record<string, any[]> = {};
      for (const row of chkiRes.rows) {
        if (!itemsByChecklist[row.checklist_id]) itemsByChecklist[row.checklist_id] = [];
        itemsByChecklist[row.checklist_id].push({
          id: row.id,
          checklistId: row.checklist_id,
          name: row.name,
          state: row.state,
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
        });
      }
      for (const row of chkRes.rows) {
        if (!checklistsByCard[row.card_id]) checklistsByCard[row.card_id] = [];
        checklistsByCard[row.card_id].push({
          id: row.id,
          cardId: row.card_id,
          name: row.name,
          items: itemsByChecklist[row.id] || [],
        });
      }

      // Group comments
      const commentsByCard: Record<string, TrelloComment[]> = {};
      for (const row of commRes.rows) {
        if (!commentsByCard[row.card_id]) commentsByCard[row.card_id] = [];
        commentsByCard[row.card_id].push({
          id: row.id,
          cardId: row.card_id,
          authorId: row.author_id,
          authorName: row.author_name,
          text: row.text,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        });
      }

      // Group activities
      const activitiesByCard: Record<string, TrelloActivity[]> = {};
      for (const row of actRes.rows) {
        if (!activitiesByCard[row.card_id]) activitiesByCard[row.card_id] = [];
        activitiesByCard[row.card_id].push({
          id: row.id,
          cardId: row.card_id,
          cardTitle: row.card_title,
          clientCanonical: row.client_canonical,
          person: row.person,
          activityType: row.activity_type,
          action: row.action,
          timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
          details: row.details,
        });
      }

      // Group attachments
      const attachmentsByCard: Record<string, TrelloAttachment[]> = {};
      for (const row of attRes.rows) {
        if (!attachmentsByCard[row.card_id]) attachmentsByCard[row.card_id] = [];
        attachmentsByCard[row.card_id].push({
          id: row.id,
          cardId: row.card_id,
          name: row.name,
          url: row.url,
          mimeType: row.mime_type,
          date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        });
      }

      // Build cards
      const cards: Record<string, TrelloCard> = {};
      for (const row of clRes.rows) {
        const rawLabels = Array.isArray(row.raw_labels)
          ? row.raw_labels
          : typeof row.raw_labels === 'string'
          ? JSON.parse(row.raw_labels)
          : [];
        const rawMembers = Array.isArray(row.raw_members)
          ? row.raw_members
          : typeof row.raw_members === 'string'
          ? JSON.parse(row.raw_members)
          : [];

        const list = lists[row.list_id];
        cards[row.id] = {
          id: row.id,
          boardId: row.board_id,
          listId: row.list_id,
          listName: list ? list.name : 'Unknown List',
          name: row.name,
          desc: row.description || '',
          url: row.url,
          due: row.due ? new Date(row.due).toISOString() : undefined,
          dateLastActivity: row.date_last_activity
            ? new Date(row.date_last_activity).toISOString()
            : new Date().toISOString(),
          closed: Boolean(row.closed),
          statusSemantic: row.status_semantic || 'To Do',
          isCompleted: Boolean(row.is_completed),
          isUnderProgress: Boolean(row.is_under_progress),
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
          completedAtVerified: Boolean(row.completed_at_verified),
          completedBy: row.completed_by || undefined,
          clientCanonical: row.client_canonical,
          labels: rawLabels,
          members: rawMembers,
          checklists: checklistsByCard[row.id] || [],
          comments: commentsByCard[row.id] || [],
          activities: activitiesByCard[row.id] || [],
          attachments: attachmentsByCard[row.id] || [],
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        };
      }

      // Sync runs
      const syncRuns: SyncRun[] = syncRes.rows.map((row) => ({
        id: row.id,
        startedAt: new Date(row.started_at).toISOString(),
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
        status: row.status,
        recordsProcessed: row.records_processed || 0,
        recordsCreated: row.records_created || 0,
        recordsUpdated: row.records_updated || 0,
        errors: Array.isArray(row.errors)
          ? row.errors
          : typeof row.errors === 'string'
          ? JSON.parse(row.errors)
          : [],
      }));

      // Management Briefs
      const managementBriefs: Record<string, ManagementBrief> = {};
      for (const row of briefRes.rows) {
        managementBriefs[row.id] = {
          id: row.id,
          periodType: row.period_type,
          dateFrom: row.date_from ? new Date(row.date_from).toISOString().slice(0, 10) : '',
          dateTo: row.date_to ? new Date(row.date_to).toISOString().slice(0, 10) : '',
          title: row.title,
          executiveSummary: row.executive_summary,
          majorAccomplishments: Array.isArray(row.major_accomplishments)
            ? row.major_accomplishments
            : JSON.parse(row.major_accomplishments || '[]'),
          seoActivity: Array.isArray(row.seo_activity)
            ? row.seo_activity
            : JSON.parse(row.seo_activity || '[]'),
          contentActivity: Array.isArray(row.content_activity)
            ? row.content_activity
            : JSON.parse(row.content_activity || '[]'),
          aiOverviewGeoActivity: Array.isArray(row.ai_overview_geo_activity)
            ? row.ai_overview_geo_activity
            : JSON.parse(row.ai_overview_geo_activity || '[]'),
          clientProgress: Array.isArray(row.client_progress)
            ? row.client_progress
            : JSON.parse(row.client_progress || '[]'),
          currentPriorities: Array.isArray(row.current_priorities)
            ? row.current_priorities
            : JSON.parse(row.current_priorities || '[]'),
          blockedWork: Array.isArray(row.blocked_work)
            ? row.blocked_work
            : JSON.parse(row.blocked_work || '[]'),
          innovationsExperiments: Array.isArray(row.innovations_experiments)
            ? row.innovations_experiments
            : JSON.parse(row.innovations_experiments || '[]'),
          talkingPoints: Array.isArray(row.talking_points)
            ? row.talking_points
            : JSON.parse(row.talking_points || '[]'),
          sourceCards: Array.isArray(row.source_cards)
            ? row.source_cards
            : JSON.parse(row.source_cards || '[]'),
          activePipelineCount: row.active_pipeline_count || 0,
          cardsCompletedCount: row.cards_completed_count || 0,
          checklistTasksCompletedCount: row.checklist_tasks_completed_count || 0,
          cardsCreatedCount: row.cards_created_count || 0,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        };
      }

      // Chat sessions & messages
      const chatSessions: Record<string, ChatSession> = {};
      const messagesBySession: Record<string, ChatMessage[]> = {};
      for (const row of msgRes.rows) {
        if (!messagesBySession[row.session_id]) messagesBySession[row.session_id] = [];
        messagesBySession[row.session_id].push({
          id: row.id,
          role: row.role,
          content: row.content,
          summary: row.summary || undefined,
          keyPoints: Array.isArray(row.key_points) ? row.key_points : JSON.parse(row.key_points || '[]'),
          statusBreakdown:
            typeof row.status_breakdown === 'object' && row.status_breakdown
              ? row.status_breakdown
              : JSON.parse(row.status_breakdown || '{}'),
          sources: Array.isArray(row.sources) ? row.sources : JSON.parse(row.sources || '[]'),
          evidenceStrength: row.evidence_strength || undefined,
          searchMetadata:
            typeof row.search_metadata === 'object' && row.search_metadata
              ? row.search_metadata
              : JSON.parse(row.search_metadata || '{}'),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        });
      }

      for (const row of sessRes.rows) {
        chatSessions[row.id] = {
          id: row.id,
          userId: row.user_id || undefined,
          title: row.title,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          messages: messagesBySession[row.id] || [],
        };
      }

      return {
        boards,
        lists,
        members,
        labels,
        clients,
        cards,
        syncRuns,
        managementBriefs,
        chatSessions,
      };
    } catch (err: any) {
      console.error('Failed to load state from PostgreSQL:', err.message);
      return null;
    }
  }
}

export const pgStore = new PostgresStore();
