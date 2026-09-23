import { StatusSemantic } from '../../src/types';
import { resolveTeamMember } from './members';
import { GENERIC_STOPWORDS } from '../trello/normalizer';

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
    | 'overall_summary'
    | 'list_analysis'
    | 'board_analysis'
    | 'general_team'
    | 'active_clients_list'
    | 'closed_clients_list'
    | 'on_hold_clients_list';
  isOverall?: boolean;
  isBoardAnalysis?: boolean;
  isDeepInspection?: boolean;
  targetList?: string;
  topic?: string;
  client?: string;
  clientAliases?: string[];
  person?: string;
  personAliases?: string[];
  personMemberIds?: string[];
  personLists?: string[];
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
  knownMembers: { fullName: string; username?: string }[] = [],
  knownLists: { id: string; name: string }[] = []
): QueryIntent {
  const q = question.toLowerCase().trim();

  // Detect requests to inspect descriptions, comments, or checklists
  const isDeepInspection = Boolean(
    q.includes('comment') ||
    q.includes('description') ||
    q.includes('checklist') ||
    q.includes('attachment') ||
    q.includes('detail')
  );

  // Detect board-wide analysis intent
  const isBoardAnalysis = Boolean(
    q.includes('all lists') ||
    q.includes('all the lists') ||
    q.includes('ignoring this list') ||
    q.includes('not analyzing all') ||
    q.includes('ignoring list') ||
    q.includes('every list') ||
    q.includes('whole board') ||
    q.includes('entire board') ||
    (q.includes('lists and cards') && isDeepInspection) ||
    (q.includes('analyze') && q.includes('lists'))
  );

  // Detect specific list target
  let targetList: string | undefined;
  const standardLists = [
    'In Process',
    'To Do GFM/PDS',
    'To Do Clients',
    'Haseeb Afzal',
    'Adil',
    'Ali Hamza II',
    'Ali Hamza',
    'Azeem Ahmad',
    'Humna Qayyum',
    'In Review',
    'Completed',
    'Ad Hoc Tasks',
    'GFM Clients',
    'PDS Resources',
  ];

  const candidateLists = [
    ...knownLists.map((l) => l.name),
    ...standardLists,
  ];

  for (const listName of candidateLists) {
    const lLower = listName.toLowerCase();
    const isStatusName = ['completed', 'in process', 'in review', 'to do', 'ad hoc tasks'].includes(lLower);
    if (isStatusName) {
      if (
        q.includes(`"${lLower}"`) ||
        q.includes(`'${lLower}'`) ||
        q.includes(`list: ${lLower}`) ||
        q.includes(`${lLower} list`) ||
        q.includes(`list ${lLower}`) ||
        q.includes(`in the ${lLower} list`) ||
        q.includes(`cards in ${lLower}`) ||
        q.includes(`list called ${lLower}`)
      ) {
        targetList = listName;
        break;
      }
    } else {
      if (
        q.includes(`"${lLower}"`) ||
        q.includes(`'${lLower}'`) ||
        q.includes(`list: ${lLower}`) ||
        q.includes(`${lLower} list`) ||
        q.includes(`list ${lLower}`) ||
        q.includes(lLower)
      ) {
        targetList = listName;
        break;
      }
    }
  }

  // 1. Topic detection
  let topic: string | undefined;
  let isAiRelated = false;

  if (q.includes('ai overview') || q.includes('ai overviews') || q.includes('google ai search') || q.includes('generative search') || q.includes('geo') || q.includes('aeo')) {
    topic = 'AI Overviews & Search Visibility';
    isAiRelated = true;
  } else if (q.includes('chatgpt') || q.includes('claude') || q.includes('productivity') || q.includes('ai tool') || q.includes('automation')) {
    topic = 'AI Productivity & Tooling';
    isAiRelated = true;
  } else if (/\b(ai|artificial intelligence)\b/i.test(q)) {
    topic = 'AI Initiatives';
    isAiRelated = true;
  } else if (q.includes('schema') || q.includes('technical seo') || q.includes('core web vitals') || q.includes('crawl') || q.includes('audit')) {
    topic = 'Technical SEO & Schema';
  } else if (q.includes('content') || q.includes('service page') || q.includes('blog') || q.includes('e-e-a-t')) {
    topic = 'Content Strategy';
  } else if (q.includes('seo strategy') || q.includes('strategy')) {
    topic = 'SEO Strategy';
  }

  // 2. Client detection with normalized punctuation and length-first priority
  let matchedClient: string | undefined;
  let matchedClientAliases: string[] | undefined;

  const normalizeStr = (s: string) =>
    (s || '').toLowerCase().replace(/[,.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanQ = normalizeStr(question);

  // Sort candidate clients by canonical name length descending so specific names match first
  const sortedKnownClients = [...knownClients].sort(
    (a, b) => b.canonicalName.length - a.canonicalName.length
  );

  for (const client of sortedKnownClients) {
    const rawAliases = [client.canonicalName, ...(client.aliases || [])];
    const candidateAliases = Array.from(
      new Set([
        client.canonicalName.toLowerCase(),
        normalizeStr(client.canonicalName),
        ...rawAliases.map((a) => a.toLowerCase()),
        ...rawAliases.map(normalizeStr),
      ])
    ).filter((a) => a.length >= 3 && !GENERIC_STOPWORDS.has(a));

    const isMatch = candidateAliases.some((alias) => {
      return (
        q.includes(alias) ||
        cleanQ.includes(alias) ||
        cleanQ.includes(` ${alias} `) ||
        cleanQ.startsWith(`${alias} `) ||
        cleanQ.endsWith(` ${alias}`)
      );
    });

    if (isMatch) {
      matchedClient = client.canonicalName;
      matchedClientAliases = candidateAliases;
      break;
    }
  }

  // 3. Person detection with first-name, alias & list mapping
  let matchedPerson: string | undefined;
  let personAliases: string[] | undefined;
  let personMemberIds: string[] | undefined;
  let personLists: string[] | undefined;

  const resolvedPerson = resolveTeamMember(question, knownMembers, knownLists);
  if (resolvedPerson) {
    matchedPerson = resolvedPerson.canonicalName;
    personAliases = resolvedPerson.aliases;
    personMemberIds = resolvedPerson.memberIds;
    personLists = resolvedPerson.associatedLists;
  } else {
    for (const m of knownMembers) {
      if (q.includes(m.fullName.toLowerCase()) || (m.username && q.includes(m.username.toLowerCase()))) {
        matchedPerson = m.fullName;
        personAliases = [m.fullName.toLowerCase(), (m.username || '').toLowerCase()].filter(Boolean);
        break;
      }
    }
  }

  // If a person's activity is queried directly (e.g. "What is Azeem doing?"),
  // don't constrain retrieval to just their namesake list if they also work in In Process/In Review
  if (matchedPerson && targetList && targetList.toLowerCase().includes(matchedPerson.toLowerCase().split(' ')[0])) {
    // Keep targetList in personLists so it gets boosted, but let intent be person_activity
    if (!personLists) personLists = [];
    if (!personLists.includes(targetList)) personLists.push(targetList);
    targetList = undefined;
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

  // 5. Overall summary check
  let isOverall = false;
  if (
    q.includes('overall summary') ||
    q.includes('overall report') ||
    q.includes('all cards') ||
    q.includes('not completed') ||
    q.includes('under progress') ||
    q.includes('pipeline summary') ||
    q.includes('entire pipeline')
  ) {
    isOverall = true;
  }

  // 6. Date detection (Using dynamic now, supporting 7 days and 30 days created/completed)
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  let timeRangeDescription: string | undefined;

  const now = new Date();

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < months.length; i++) {
    if (q.includes(months[i])) {
      const monthName = months[i].charAt(0).toUpperCase() + months[i].slice(1);
      const year = 2026;
      dateFrom = new Date(Date.UTC(year, i, 1)).toISOString();
      dateTo = new Date(Date.UTC(year, i + 1, 0, 23, 59, 59, 999)).toISOString();
      timeRangeDescription = `${monthName} ${year}`;
      break;
    }
  }

  if (!timeRangeDescription) {
    if (q.includes('last 7 days') || q.includes('past 7 days') || q.includes('7 days')) {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateTo = now.toISOString();
      timeRangeDescription = 'Last 7 Days (Created or Completed)';
    } else if (q.includes('last week') || q.includes('update of last week') || q.includes('last week report')) {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateTo = now.toISOString();
      timeRangeDescription = 'Last 7 Days (Created or Completed)';
    } else if (q.includes('this week')) {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateTo = now.toISOString();
      timeRangeDescription = 'This Week (Last 7 Days)';
    } else if (
      q.includes('last 30 days') ||
      q.includes('past 30 days') ||
      q.includes('30 days') ||
      q.includes('1 month') ||
      q.includes('1 month report') ||
      q.includes('one month') ||
      q.includes('last month report') ||
      q.includes('last month')
    ) {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateTo = now.toISOString();
      timeRangeDescription = 'Last 30 Days (Created or Completed)';
    } else if (q.includes('this month')) {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateTo = now.toISOString();
      timeRangeDescription = 'This Month (Last 30 Days)';
    }
  }

  // 7. Primary Intent classification
  let intent: QueryIntent['intent'] = 'general_team';

  const isAskingOnHoldClients = Boolean(
    q.includes('on hold client') ||
    q.includes('on hold clients') ||
    q.includes('on-hold client') ||
    q.includes('on-hold clients') ||
    q.includes('clients on hold') ||
    q.includes('client on hold') ||
    q.includes('accounts on hold') ||
    q.includes('account on hold') ||
    q.includes('hold client') ||
    q.includes('hold clients') ||
    ((q.includes('on hold') || q.includes('on-hold') || (q.includes('hold') && !q.includes('household') && !q.includes('threshold') && !q.includes('withhold'))) &&
      (q.includes('client') ||
        q.includes('clients') ||
        q.includes('account') ||
        q.includes('accounts') ||
        q.includes('pds') ||
        q.includes('gfm') ||
        q.includes('list') ||
        q.includes('show') ||
        q.includes('who') ||
        q.includes('what') ||
        q.includes('give') ||
        q.includes('names') ||
        q.includes('which') ||
        q === 'on hold' ||
        q === 'on-hold' ||
        q === 'clients on hold' ||
        q === 'on hold clients'))
  );

  const isAskingActiveClients = Boolean(
    (q.includes('active client') ||
      q.includes('active clients') ||
      q.includes('active accounts') ||
      q.includes('clients active') ||
      (q.includes('active') && (q.includes('client') || q.includes('clients') || q.includes('pds') || q.includes('gfm')))) &&
    (q.includes('list') ||
      q.includes('show') ||
      q.includes('who') ||
      q.includes('what') ||
      q.includes('give') ||
      q.includes('names') ||
      q.includes('all') ||
      q === 'active clients' ||
      q === 'active clients list')
  );

  const isAskingClosedClients = Boolean(
    q.includes('closed client') ||
    q.includes('closed clients') ||
    q.includes('terminated client') ||
    q.includes('terminated clients') ||
    q.includes('discontinued client') ||
    q.includes('discontinued clients') ||
    ((q.includes('closed') || q.includes('terminated') || q.includes('discontinued')) &&
      (q.includes('client') || q.includes('clients') || q.includes('accounts') || q.includes('list') || q.includes('show') || q.includes('who') || q.includes('what') || q.includes('names')))
  );

  if (isAskingOnHoldClients) {
    intent = 'on_hold_clients_list';
  } else if (isAskingActiveClients) {
    intent = 'active_clients_list';
  } else if (isAskingClosedClients) {
    intent = 'closed_clients_list';
  } else if (matchedClient) {
    intent = 'client_summary';
    // If targetList was set to a status list (e.g. Completed), clear it so the client query is not treated as a raw list dump
    if (targetList && ['completed', 'in process', 'in review', 'to do', 'ad hoc tasks'].includes(targetList.toLowerCase())) {
      targetList = undefined;
    }
  } else if (isBoardAnalysis) {
    intent = 'board_analysis';
  } else if (targetList) {
    intent = 'list_analysis';
  } else if (isOverall) {
    intent = 'overall_summary';
  } else if (
    q.includes('what can i tell senior management') ||
    q.includes('tell management') ||
    q.includes('senior management') ||
    q.includes('management brief')
  ) {
    intent = 'management_brief';
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
    isOverall,
    isBoardAnalysis,
    isDeepInspection,
    targetList,
    topic,
    client: matchedClient,
    clientAliases: matchedClientAliases,
    person: matchedPerson,
    personAliases,
    personMemberIds,
    personLists,
    status,
    dateFrom,
    dateTo,
    timeRangeDescription,
    isAiRelated,
    confidence: 0.95,
  };
}
