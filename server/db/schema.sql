-- ==========================================================
-- SEO & Content Team Intelligence PostgreSQL Schema
-- Compatible with Supabase and standard PostgreSQL with pgvector
-- ==========================================================

-- Enable pgvector if available
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles & Users
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

INSERT INTO roles (id, name, description) VALUES
  ('ADMIN', 'Administrator', 'Full system access, Trello configuration, aliases'),
  ('VIEWER', 'Viewer', 'Intelligence retrieval, source viewing, and executive briefs')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL REFERENCES roles(id) DEFAULT 'VIEWER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dedicated App Users Table with credential hashing for persistent admin user provisioning
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

-- 2. Trello Connections & Configuration (NO SECRETS STORED IN DB)
CREATE TABLE IF NOT EXISTS trello_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id VARCHAR(100),
  board_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'disconnected',
  mode VARCHAR(50) DEFAULT 'real',
  is_demo_data BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trello Boards
CREATE TABLE IF NOT EXISTS trello_boards (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT,
  closed BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trello Lists & Semantic Classification
CREATE TABLE IF NOT EXISTS trello_lists (
  id VARCHAR(100) PRIMARY KEY,
  board_id VARCHAR(100) REFERENCES trello_boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  closed BOOLEAN DEFAULT FALSE,
  pos NUMERIC,
  semantic_type VARCHAR(50) DEFAULT 'other', -- status, person, resources, client, adhoc, other
  mapped_status VARCHAR(50), -- Completed, In Process, In Review, To Do, Planned, Research, Idea, Blocked
  mapped_person VARCHAR(100), -- Team member name if list represents person
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Trello Members
CREATE TABLE IF NOT EXISTS trello_members (
  id VARCHAR(100) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(100),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trello Labels
CREATE TABLE IF NOT EXISTS trello_labels (
  id VARCHAR(100) PRIMARY KEY,
  board_id VARCHAR(100) REFERENCES trello_boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Clients & Client Aliases
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  alias VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Trello Cards
CREATE TABLE IF NOT EXISTS trello_cards (
  id VARCHAR(100) PRIMARY KEY,
  board_id VARCHAR(100) REFERENCES trello_boards(id) ON DELETE CASCADE,
  list_id VARCHAR(100) REFERENCES trello_lists(id) ON DELETE SET NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  due TIMESTAMPTZ,
  date_last_activity TIMESTAMPTZ,
  closed BOOLEAN DEFAULT FALSE,
  status_semantic VARCHAR(50) DEFAULT 'To Do',
  is_completed BOOLEAN DEFAULT FALSE,
  is_under_progress BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_at_verified BOOLEAN DEFAULT FALSE,
  completed_by VARCHAR(255),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_canonical VARCHAR(255),
  raw_labels JSONB DEFAULT '[]',
  raw_members JSONB DEFAULT '[]',
  content_hash VARCHAR(64),
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trello_cards_list ON trello_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_client ON trello_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_trello_cards_status ON trello_cards(status_semantic);
CREATE INDEX IF NOT EXISTS idx_trello_cards_date_activity ON trello_cards(date_last_activity);

-- 9. Card Checklists & Items
CREATE TABLE IF NOT EXISTS trello_checklists (
  id VARCHAR(100) PRIMARY KEY,
  card_id VARCHAR(100) REFERENCES trello_cards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trello_checklist_items (
  id VARCHAR(100) PRIMARY KEY,
  checklist_id VARCHAR(100) REFERENCES trello_checklists(id) ON DELETE CASCADE,
  card_id VARCHAR(100) REFERENCES trello_cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state VARCHAR(20) DEFAULT 'incomplete', -- complete / incomplete
  completed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_card ON trello_checklist_items(card_id);

-- 10. Card Comments
CREATE TABLE IF NOT EXISTS trello_comments (
  id VARCHAR(100) PRIMARY KEY,
  card_id VARCHAR(100) REFERENCES trello_cards(id) ON DELETE CASCADE,
  author_id VARCHAR(100),
  author_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON trello_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON trello_comments(author_name);

-- 11. Card Activities & First-Class Events
CREATE TABLE IF NOT EXISTS trello_activities (
  id VARCHAR(100) PRIMARY KEY,
  card_id VARCHAR(100) REFERENCES trello_cards(id) ON DELETE CASCADE,
  card_title VARCHAR(500),
  client_canonical VARCHAR(255),
  person VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  details TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_card ON trello_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_activities_person ON trello_activities(person);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON trello_activities(timestamp);

-- 12. Card Attachments
CREATE TABLE IF NOT EXISTS trello_attachments (
  id VARCHAR(100) PRIMARY KEY,
  card_id VARCHAR(100) REFERENCES trello_cards(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  url TEXT,
  mime_type VARCHAR(100),
  date TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Sync Runs & Errors
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL, -- success, failed, in_progress
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  errors JSONB DEFAULT '[]'
);

-- 14. Chat Sessions & Messages (Auditability)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  summary TEXT,
  key_points JSONB DEFAULT '[]',
  status_breakdown JSONB DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  evidence_strength VARCHAR(20), -- high, medium, low
  search_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Management Briefs
CREATE TABLE IF NOT EXISTS management_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(50) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  executive_summary TEXT NOT NULL,
  major_accomplishments JSONB DEFAULT '[]',
  seo_activity JSONB DEFAULT '[]',
  content_activity JSONB DEFAULT '[]',
  ai_overview_geo_activity JSONB DEFAULT '[]',
  client_progress JSONB DEFAULT '[]',
  current_priorities JSONB DEFAULT '[]',
  blocked_work JSONB DEFAULT '[]',
  innovations_experiments JSONB DEFAULT '[]',
  talking_points JSONB DEFAULT '[]',
  source_cards JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
