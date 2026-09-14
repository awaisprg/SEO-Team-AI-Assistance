import { StatusSemantic } from '../../src/types';

export interface QueryIntent {
  rawQuestion: string;
  intent:
    | 'activity_summary'
    | 'client_summary'
    | 'current_activity'
    | 'person_activity'
    | 'ai_overview_geo'
    | 'productivity_tools'
    | 'time_range'
    | 'blockers'
    | 'management_brief'
    | 'general_team';
  topic?: string;
  client?: string;
  person?: string;
  status?: StatusSemantic | 'all';
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
  timeRangeDescription?: string;
  isAiRelated: boolean;
  confidence: number;
}

export function extractQueryIntent(
  question: string,
  knownClients: { canonicalName: string; aliases: string[] }[] = [],
  knownMembers: { fullName: string; username?: string }[] = []
): QueryIntent {
  const q = question.toLowerCase().trim();

  // 1. Topic detection
  let topic: string | undefined;
  let isAiRelated = false;

  if (q.includes('ai overview') || q.includes('ai overviews') || q.includes('google ai search') || q.includes('generative search') || q.includes('geo') || q.includes('aeo')) {
    topic = 'AI Overviews & Search Visibility';
    isAiRelated = true;
  } else if (q.includes('chatgpt') || q.includes('claude') || q.includes('productivity') || q.includes('ai tool') || q.includes('automation')) {
    topic = 'AI Productivity & Tooling';
    isAiRelated = true;
  } else if (q.includes('ai') || q.includes('artificial intelligence')) {
    topic = 'AI Initiatives';
    isAiRelated = true;
  } else if (q.includes('schema') || q.includes('technical seo') || q.includes('core web vitals') || q.includes('crawl') || q.includes('audit')) {
    topic = 'Technical SEO & Schema';
  } else if (q.includes('content') || q.includes('service page') || q.includes('blog') || q.includes('e-e-a-t')) {
    topic = 'Content Strategy';
  } else if (q.includes('seo strategy') || q.includes('strategy')) {
    topic = 'SEO Strategy';
  }

  // 2. Client detection
  let matchedClient: string | undefined;
  for (const client of knownClients) {
    if (q.includes(client.canonicalName.toLowerCase())) {
      matchedClient = client.canonicalName;
      break;
    }
    for (const alias of client.aliases) {
      if (q.includes(alias.toLowerCase())) {
        matchedClient = client.canonicalName;
        break;
      }
    }
    if (matchedClient) break;
  }

  // 3. Person detection
  let matchedPerson: string | undefined;
  for (const m of knownMembers) {
    if (q.includes(m.fullName.toLowerCase()) || (m.username && q.includes(m.username.toLowerCase()))) {
      matchedPerson = m.fullName;
      break;
    }
  }
  if (!matchedPerson) {
    // Check known team names directly
    const names = [
      { name: 'Awais', full: 'Awais' },
      { name: 'Haseeb', full: 'Haseeb Afzal' },
      { name: 'Haseeb Afzal', full: 'Haseeb Afzal' },
      { name: 'Adil', full: 'Adil' },
      { name: 'Hamza', full: 'Hamza' },
      { name: 'Azeem', full: 'Azeem Ahmad' },
      { name: 'Azeem Ahmad', full: 'Azeem Ahmad' },
      { name: 'Humna', full: 'Humna Qayyum' },
      { name: 'Humna Qayyum', full: 'Humna Qayyum' },
    ];
    for (const item of names) {
      if (q.includes(item.name.toLowerCase())) {
        matchedPerson = item.full;
        break;
      }
    }
  }

  // 4. Status detection
  let status: StatusSemantic | 'all' = 'all';
  if (
    q.includes('completed') ||
    q.includes('complete') ||
    q.includes('finished') ||
    q.includes('accomplish') ||
    q.includes('achieved') ||
    q.includes('done')
  ) {
    status = 'Completed';
  } else if (
    q.includes('in progress') ||
    q.includes('in process') ||
    q.includes('working on') ||
    q.includes('currently') ||
    q.includes('right now') ||
    q.includes('at the moment')
  ) {
    status = 'In Process';
  } else if (q.includes('in review') || q.includes('under review')) {
    status = 'In Review';
  } else if (q.includes('to do') || q.includes('planned') || q.includes('next')) {
    status = 'To Do';
  } else if (q.includes('delayed') || q.includes('blocked') || q.includes('blocker')) {
    status = 'Blocked';
  }

  // 5. Date detection (Anchor reference date: Sep 2026 based on metadata)
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  let timeRangeDescription: string | undefined;

  const now = new Date('2026-09-14T10:00:00Z');

  if (q.includes('august')) {
    dateFrom = '2026-08-01T00:00:00Z';
    dateTo = '2026-08-31T23:59:59Z';
    timeRangeDescription = 'August 2026';
  } else if (q.includes('september')) {
    dateFrom = '2026-09-01T00:00:00Z';
    dateTo = '2026-09-30T23:59:59Z';
    timeRangeDescription = 'September 2026';
  } else if (q.includes('this week')) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    dateFrom = startOfWeek.toISOString();
    dateTo = now.toISOString();
    timeRangeDescription = 'This week';
  } else if (q.includes('last week')) {
    const endLastWeek = new Date(now);
    endLastWeek.setDate(now.getDate() - now.getDay() - 1);
    const startLastWeek = new Date(endLastWeek);
    startLastWeek.setDate(endLastWeek.getDate() - 6);
    dateFrom = startLastWeek.toISOString();
    dateTo = endLastWeek.toISOString();
    timeRangeDescription = 'Last week';
  } else if (q.includes('this month')) {
    dateFrom = '2026-09-01T00:00:00Z';
    dateTo = '2026-09-30T23:59:59Z';
    timeRangeDescription = 'This month (September)';
  } else if (q.includes('last month')) {
    dateFrom = '2026-08-01T00:00:00Z';
    dateTo = '2026-08-31T23:59:59Z';
    timeRangeDescription = 'Last month (August)';
  } else if (q.includes('last 30 days') || q.includes('past 30 days')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    dateFrom = d.toISOString();
    dateTo = now.toISOString();
    timeRangeDescription = 'Last 30 days';
  }

  // 6. Primary Intent classification
  let intent: QueryIntent['intent'] = 'general_team';

  if (q.includes('what can i tell senior management') || q.includes('tell management') || q.includes('senior management') || q.includes('management brief')) {
    intent = 'management_brief';
  } else if (matchedClient) {
    intent = 'client_summary';
  } else if (matchedPerson) {
    intent = 'person_activity';
  } else if (q.includes('ai overview') || q.includes('geo') || q.includes('aeo') || q.includes('google ai')) {
    intent = 'ai_overview_geo';
  } else if (q.includes('chatgpt') || q.includes('claude') || q.includes('productivity') || q.includes('tool')) {
    intent = 'productivity_tools';
  } else if (status === 'Blocked') {
    intent = 'blockers';
  } else if (timeRangeDescription) {
    intent = 'time_range';
  } else if (status === 'In Process' || q.includes('right now') || q.includes('currently')) {
    intent = 'current_activity';
  } else if (status === 'Completed') {
    intent = 'activity_summary';
  }

  return {
    rawQuestion: question,
    intent,
    topic,
    client: matchedClient,
    person: matchedPerson,
    status,
    dateFrom,
    dateTo,
    timeRangeDescription,
    isAiRelated,
    confidence: 0.95,
  };
}
