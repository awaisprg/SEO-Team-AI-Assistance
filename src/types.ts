/**
 * Core type definitions for SEO & Content Team Intelligence
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type ListSemanticType = 'status' | 'person' | 'resources' | 'client' | 'adhoc' | 'other';

export type StatusSemantic =
  | 'Completed'
  | 'In Process'
  | 'In Review'
  | 'To Do'
  | 'Planned'
  | 'Research'
  | 'Idea'
  | 'Blocked';

export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
  closed: boolean;
}

export interface TrelloList {
  id: string;
  boardId: string;
  name: string;
  closed: boolean;
  pos?: number;
  semanticType: ListSemanticType;
  mappedStatus?: StatusSemantic;
  mappedPerson?: string;
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  role?: string;
}

export interface TrelloChecklistItem {
  id: string;
  checklistId: string;
  cardId: string;
  name: string;
  state: 'complete' | 'incomplete';
  completedAt?: string;
  completedBy?: string;
}

export interface TrelloChecklist {
  id: string;
  cardId: string;
  name: string;
  items: TrelloChecklistItem[];
}

export interface TrelloComment {
  id: string;
  cardId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface TrelloActivity {
  id: string;
  cardId: string;
  cardTitle: string;
  clientCanonical?: string;
  person: string;
  activityType: string;
  action: string;
  timestamp: string;
  details?: string;
  sourceUrl?: string;
}

export interface TrelloAttachment {
  id: string;
  cardId: string;
  name: string;
  url: string;
  mimeType?: string;
  date: string;
}

export interface TrelloCard {
  id: string;
  boardId: string;
  listId: string;
  listName: string;
  name: string;
  desc: string;
  url: string;
  due?: string | null;
  createdAt?: string;
  dateLastActivity: string;
  closed: boolean;
  statusSemantic: StatusSemantic;
  isCompleted?: boolean;
  isUnderProgress?: boolean;
  completedAt?: string | null;
  completedAtVerified?: boolean;
  completedBy?: string | null;
  agencySource?: 'PDS' | 'GFM' | 'Internal';
  priority?: 'High Priority' | 'Medium Priority' | 'Low Priority' | 'Normal';
  clientCanonical?: string;
  labels: TrelloLabel[];
  members: TrelloMember[];
  checklists: TrelloChecklist[];
  comments: TrelloComment[];
  activities: TrelloActivity[];
  attachments: TrelloAttachment[];
}

export interface ClientEntity {
  id: string;
  canonicalName: string;
  aliases: string[];
  status: 'Active' | 'Closed';
  agency?: 'PDS' | 'GFM' | 'Both' | 'Internal';
  isHighPriority?: boolean;
  activeCardCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  teamMembers: string[];
  lastActivityDate: string;
  cards?: TrelloCard[];
  recentActivities?: TrelloActivity[];
  recentComments?: TrelloComment[];
}

export interface SyncRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed' | 'in_progress';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}

export interface TrelloConnectionStatus {
  connected: boolean;
  isDemoData: boolean;
  mode: 'real' | 'demo';
  boardId?: string;
  boardName?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  totalCards: number;
  totalComments: number;
  totalActivities: number;
  totalClients: number;
  apiKeyConfigured: boolean;
  tokenConfigured: boolean;
}

export interface ChatSource {
  cardId: string;
  title: string;
  url: string;
  relevance: number; // 0 - 100
  reason: string;
  date: string;
  client?: string;
  status: StatusSemantic;
  listName?: string;
  matchType?: 'exact' | 'semantic' | 'checklist' | 'comment' | 'activity';
  snippet?: string;
}

export interface TeamMetrics {
  totalCards: number;
  activeWork: number;
  completedThisMonth: number;
  inReview: number;
  aiInitiatives: number;
  contentWork: number;
  seoWork: number;
  totalMembers: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  summary?: string;
  keyPoints?: string[];
  statusBreakdown?: Record<string, number>;
  sources?: ChatSource[];
  evidenceStrength?: 'high' | 'medium' | 'low';
  searchMetadata?: {
    resultCount: number;
    filtersApplied?: Record<string, any>;
    intent?: string;
    topic?: string;
    dateRange?: string;
  };
  createdAt: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ManagementBrief {
  id: string;
  periodType: 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'overall' | 'custom';
  dateFrom: string;
  dateTo: string;
  title: string;
  executiveSummary: string;
  cardsCreatedCount?: number;
  cardsCompletedCount?: number;
  checklistTasksCompletedCount?: number;
  activePipelineCount?: number;
  majorAccomplishments: string[];
  seoActivity: string[];
  contentActivity: string[];
  aiOverviewGeoActivity: string[];
  clientProgress: {
    client: string;
    summary: string;
    status: string;
  }[];
  currentPriorities: string[];
  blockedWork: string[];
  innovationsExperiments: string[];
  talkingPoints: string[];
  sourceCards: ChatSource[];
  createdAt: string;
}

export interface TeamMemberOverview {
  member: TrelloMember;
  activeCardsCount: number;
  completedActivitiesCount: number;
  recentCards: {
    id: string;
    name: string;
    listName: string;
    status: StatusSemantic;
    url: string;
  }[];
  recentActivities: TrelloActivity[];
}
