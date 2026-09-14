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

  async initSchema(): Promise<boolean> {
    if (!this.pool || this.isInitialized) return this.isInitialized;

    try {
      const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        // Execute schema initialization statements safely
        await this.pool.query(sql);
        this.isInitialized = true;
        console.log('PostgreSQL database schema initialized successfully.');
        return true;
      }
    } catch (err: any) {
      console.error('Failed to run PostgreSQL schema:', err.message);
    }
    return false;
  }

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

  async upsertCards(cards: TrelloCard[]): Promise<void> {
    if (!this.pool || cards.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of cards) {
        const query = `
          INSERT INTO trello_cards (
            id, board_id, list_id, name, description, url, due, date_last_activity, closed,
            status_semantic, client_canonical, raw_labels, raw_members, synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (id) DO UPDATE SET
            list_id = EXCLUDED.list_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            url = EXCLUDED.url,
            due = EXCLUDED.due,
            date_last_activity = EXCLUDED.date_last_activity,
            closed = EXCLUDED.closed,
            status_semantic = EXCLUDED.status_semantic,
            client_canonical = EXCLUDED.client_canonical,
            raw_labels = EXCLUDED.raw_labels,
            raw_members = EXCLUDED.raw_members,
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
          c.clientCanonical || null,
          JSON.stringify(c.labels || []),
          JSON.stringify(c.members || []),
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

  async recordSyncRun(run: SyncRun, boardId?: string): Promise<void> {
    if (!this.pool) return;
    const query = `
      INSERT INTO sync_runs (id, started_at, completed_at, status, records_processed, records_created, records_updated, errors)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
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
}

export const pgStore = new PostgresStore();
