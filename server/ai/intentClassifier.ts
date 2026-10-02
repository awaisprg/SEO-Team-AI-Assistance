import { StatusSemantic } from '../../src/types';
import { QueryIntent } from './intent';
import { resolveTeamMember } from './members';
import { GENERIC_STOPWORDS } from '../trello/normalizer';

export type PrimaryIntentCategory = 'client_status' | 'team_workload' | 'general_info';

export interface IntentClassification {
  category: PrimaryIntentCategory;
  categoryLabel: string;
  subIntent: string;
  subIntentLabel: string;
  confidence: number;
  reasoning: string;
  entities: {
    targetAgency?: 'GFM' | 'PDS' | 'all';
    targetClient?: string;
    clientAliases?: string[];
    targetPerson?: string;
    personAliases?: string[];
    personMemberIds?: string[];
    personLists?: string[];
    targetList?: string;
    topic?: string;
    statusFilter?: StatusSemantic | 'all';
    wantsCount?: boolean;
    isDeepInspection?: boolean;
    isBoardAnalysis?: boolean;
    dateRange?: {
      from?: string;
      to?: string;
      description?: string;
    };
  };
  directives: {
    restrictAgency?: 'GFM' | 'PDS';
    enforceActiveOnly?: boolean;
    isolateClientData?: boolean;
    isolatePersonData?: boolean;
    scopeToList?: string;
    responseFormat: 'direct_roster' | 'executive_summary' | 'detailed_workload' | 'qa_analysis';
  };
  toQueryIntent(): QueryIntent;
}

export function classifyUserQuery(
  rawQuestion: string,
  knownClients: { canonicalName: string; aliases: string[] }[] = [],
  knownMembers: { fullName: string; username?: string }[] = [],
  knownLists: { id: string; name: string }[] = []
): IntentClassification {
  const q = (rawQuestion || '').toLowerCase().trim();

  // --- 1. Entity Extraction ---
  // A. Agency detection
  let targetAgency: 'GFM' | 'PDS' | 'all' = 'all';
  const hasGfm = /\b(gfm|gold\s*flex|gold\s*flex\s*marketing)\b/i.test(q);
  const hasPds = /\b(pds|physicians?\s*digital(\s*services)?(\s*llc)?)\b/i.test(q);
  if (hasGfm && !hasPds) {
    targetAgency = 'GFM';
  } else if (hasPds && !hasGfm) {
    targetAgency = 'PDS';
  }

  // B. Count intent detection
  const wantsCount = Boolean(
    q.includes('how many') ||
    q.includes('how much') ||
    q.includes('count') ||
    q.includes('number of') ||
    q.includes('total number') ||
    q.includes('total count') ||
    q.includes('quantity') ||
    q.includes('tally') ||
    /\b(how many|count of|number of)\b/i.test(q)
  );

  // C. Deep inspection & board analysis
  const isDeepInspection = Boolean(
    q.includes('comment') ||
    q.includes('description') ||
    q.includes('checklist') ||
    q.includes('attachment') ||
    q.includes('detail')
  );

  const isBoardAnalysis = Boolean(
    q.includes('all lists') ||
    q.includes('all the lists') ||
    q.includes('every list') ||
    q.includes('whole board') ||
    q.includes('entire board') ||
    (q.includes('lists and cards') && isDeepInspection) ||
    (q.includes('analyze') && q.includes('lists'))
  );

  // D. Target List detection
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
  const candidateLists = [...knownLists.map((l) => l.name), ...standardLists];

  for (const listName of candidateLists) {
    const lLower = listName.toLowerCase();
    const isSpecialListName = ['completed', 'in process', 'in review', 'to do', 'ad hoc tasks', 'gfm clients', 'pds clients'].includes(lLower);
    if (isSpecialListName) {
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

  // E. Specific Client detection
  let matchedClient: string | undefined;
  let matchedClientAliases: string[] | undefined;
  const normalizeStr = (s: string) =>
    (s || '').toLowerCase().replace(/[,.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanQ = normalizeStr(rawQuestion);

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

  // F. Specific Person detection
  let matchedPerson: string | undefined;
  let personAliases: string[] | undefined;
  let personMemberIds: string[] | undefined;
  let personLists: string[] | undefined;

  const resolvedPerson = resolveTeamMember(rawQuestion, knownMembers, knownLists);
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

  if (matchedPerson && targetList && targetList.toLowerCase().includes(matchedPerson.toLowerCase().split(' ')[0])) {
    if (!personLists) personLists = [];
    if (!personLists.includes(targetList)) personLists.push(targetList);
    targetList = undefined;
  }

  // G. Status detection
  let status: StatusSemantic | 'all' = 'all';
  if (
    q.includes('completed') ||
    q.includes('complete') ||
    q.includes('finished') ||
    q.includes('accomplish') ||
    q.includes('done')
  ) {
    status = 'Completed';
  } else if (
    q.includes('in progress') ||
    q.includes('in process') ||
    q.includes('working on') ||
    q.includes('currently') ||
    q.includes('right now') ||
    q.includes('active')
  ) {
    status = 'In Process';
  } else if (q.includes('in review') || q.includes('under review')) {
    status = 'In Review';
  } else if (q.includes('to do') || q.includes('planned') || q.includes('next')) {
    status = 'To Do';
  } else if (q.includes('delayed') || q.includes('blocked') || q.includes('blocker') || q.includes('on hold') || q.includes('on-hold')) {
    status = 'Blocked';
  }

  // H. Date range detection
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  let timeRangeDescription: string | undefined;
  const now = new Date();

  if (q.includes('last 7 days') || q.includes('past 7 days') || q.includes('last week') || q.includes('this week')) {
    dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    dateTo = now.toISOString();
    timeRangeDescription = 'Last 7 Days';
  } else if (q.includes('last 30 days') || q.includes('past 30 days') || q.includes('this month') || q.includes('last month') || q.includes('1 month')) {
    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    dateTo = now.toISOString();
    timeRangeDescription = 'Last 30 Days';
  }

  // --- 2. Categorization Pipeline ---
  // Flag indicators
  const isAskingOnHold = Boolean(
    q.includes('on hold') ||
    q.includes('on-hold') ||
    (q.includes('hold') && !q.includes('threshold') && !q.includes('household') && !q.includes('withhold'))
  );

  const isAskingClosed = Boolean(
    q.includes('closed') ||
    q.includes('terminated') ||
    q.includes('discontinued') ||
    q.includes('project closed')
  );

  const isAskingActiveClients = Boolean(
    !isAskingOnHold &&
    !isAskingClosed &&
    (
      q.includes('active client') ||
      q.includes('active clients') ||
      q.includes('active accounts') ||
      q.includes('active account') ||
      q.includes('clients active') ||
      q.includes('active projects') ||
      (q.includes('active') && (q.includes('client') || q.includes('clients') || q.includes('account') || q.includes('pds') || q.includes('gfm') || q.includes('roster'))) ||
      ((q.includes('how many') || q.includes('count') || q.includes('list') || q.includes('show') || q.includes('who') || q.includes('what') || q.includes('which')) && q.includes('active')) ||
      q === 'active clients' ||
      q === 'active clients list' ||
      q === 'active clients only' ||
      q === 'active'
    )
  );

  const isAskingClientsOverview = Boolean(
    !isAskingOnHold &&
    !isAskingClosed &&
    !isAskingActiveClients &&
    !matchedClient &&
    (
      q.includes('how many clients') ||
      q.includes('how many total clients') ||
      q.includes('total clients') ||
      q.includes('count of clients') ||
      q.includes('number of clients') ||
      q.includes('all clients') ||
      q.includes('list of clients') ||
      q.includes('client roster') ||
      q.includes('client breakdown') ||
      q.includes('client portfolio') ||
      q.includes('clients status') ||
      q.includes('client status') ||
      q.includes('status of client') ||
      q.includes('status of clients') ||
      q.includes('client report') ||
      q.includes('clients report') ||
      q.includes('accounts status') ||
      q.includes('account status') ||
      q.includes('client overview') ||
      q.includes('clients overview') ||
      ((q.includes('status') || q.includes('report') || q.includes('overview') || q.includes('summary')) &&
        (hasGfm || hasPds || q.includes('client') || q.includes('clients') || q.includes('account') || q.includes('accounts')) &&
        !matchedPerson) ||
      (wantsCount && (q.includes('client') || q.includes('clients')) && (hasGfm || hasPds || q.includes('total') || q.includes('all') || q.includes('have')))
    )
  );

  const isGeneralExecutiveBrief = Boolean(
    q.includes('what can i tell senior management') ||
    q.includes('tell management') ||
    q.includes('senior management') ||
    q.includes('management brief') ||
    q.includes('executive brief')
  );

  const isAiOverviewGeo = Boolean(
    q.includes('ai overview') ||
    q.includes('ai overviews') ||
    q.includes('geo') ||
    q.includes('aeo') ||
    q.includes('google ai search') ||
    q.includes('generative search')
  );

  const isProductivityTools = Boolean(
    q.includes('chatgpt') ||
    q.includes('claude') ||
    q.includes('productivity tool') ||
    q.includes('automation tool') ||
    q.includes('ai tools')
  );

  // DECISION TREE
  let category: PrimaryIntentCategory = 'general_info';
  let categoryLabel = 'General Info';
  let subIntent = 'general_qa';
  let subIntentLabel = 'General Information & Inquiries';
  let confidence = 0.90;
  let reasoning = 'General operational or process inquiry.';
  let legacyIntent: QueryIntent['intent'] = 'general_team';

  // Branch 1: CLIENT STATUS
  if (
    isAskingActiveClients ||
    isAskingOnHold ||
    isAskingClosed ||
    isAskingClientsOverview ||
    matchedClient ||
    (q.includes('client') && (q.includes('status') || q.includes('health') || q.includes('deliverable') || q.includes('audit')))
  ) {
    category = 'client_status';
    categoryLabel = 'Client Status';

    if (isAskingActiveClients) {
      subIntent = 'active_clients_roster';
      subIntentLabel = 'Active Clients Roster & Count';
      legacyIntent = 'active_clients_list';
      status = 'In Process';
      confidence = 0.98;
      reasoning = `Manager is querying active client roster${targetAgency !== 'all' ? ` specifically for ${targetAgency}` : ''}.`;
    } else if (isAskingOnHold) {
      subIntent = 'on_hold_clients';
      subIntentLabel = 'Clients On-Hold Audit';
      legacyIntent = 'on_hold_clients_list';
      status = 'Blocked';
      confidence = 0.98;
      reasoning = `Manager is investigating clients on hold${targetAgency !== 'all' ? ` for ${targetAgency}` : ''} and documented blocker reasons.`;
    } else if (isAskingClosed) {
      subIntent = 'closed_clients';
      subIntentLabel = 'Closed & Terminated Clients';
      legacyIntent = 'closed_clients_list';
      status = 'Completed';
      confidence = 0.98;
      reasoning = `Manager is auditing closed or terminated client accounts${targetAgency !== 'all' ? ` in ${targetAgency}` : ''}.`;
    } else if (isAskingClientsOverview) {
      subIntent = 'portfolio_overview';
      subIntentLabel = 'Client Portfolio Breakdown';
      legacyIntent = 'clients_overview';
      confidence = 0.96;
      reasoning = `Manager is requesting high-level client portfolio totals and agency breakdown.`;
    } else if (matchedClient) {
      subIntent = 'client_deep_dive';
      subIntentLabel = `Client Status: ${matchedClient}`;
      legacyIntent = 'client_summary';
      confidence = 0.98;
      reasoning = `Targeted client inquiry for "${matchedClient}". Strict client data isolation required.`;
    } else {
      subIntent = 'client_inquiry';
      subIntentLabel = 'Client Inquiries';
      legacyIntent = 'client_summary';
      confidence = 0.85;
      reasoning = `Inquiry related to client status and operations.`;
    }
  }
  // Branch 2: TEAM WORKLOAD
  else if (
    matchedPerson ||
    targetList ||
    isBoardAnalysis ||
    q.includes('workload') ||
    q.includes('capacity') ||
    q.includes('who is working on') ||
    q.includes('tasks assigned') ||
    q.includes('in review') ||
    q.includes('in process') ||
    q.includes('blocked') ||
    q.includes('blockers')
  ) {
    category = 'team_workload';
    categoryLabel = 'Team Workload';

    if (matchedPerson) {
      subIntent = 'individual_member_workload';
      subIntentLabel = `Team Member Workload: ${matchedPerson}`;
      legacyIntent = 'person_activity';
      confidence = 0.97;
      reasoning = `Evaluating individual workload, active sprints, and deliverables for ${matchedPerson}.`;
    } else if (isBoardAnalysis) {
      subIntent = 'board_wide_capacity';
      subIntentLabel = 'Board-Wide Workload & List Analysis';
      legacyIntent = 'board_analysis';
      confidence = 0.95;
      reasoning = `Comprehensive analysis of all active lists, cards, and team distributions.`;
    } else if (targetList) {
      subIntent = 'list_workload_queue';
      subIntentLabel = `Workload Queue: "${targetList}"`;
      legacyIntent = 'list_analysis';
      confidence = 0.95;
      reasoning = `Analyzing deliverables and operational queue in target list "${targetList}".`;
    } else if (status === 'Blocked' || q.includes('blocker') || q.includes('delayed')) {
      subIntent = 'blocked_deliverables';
      subIntentLabel = 'Blocked Deliverables & Dependencies';
      legacyIntent = 'blockers';
      confidence = 0.94;
      reasoning = `Audit of blocked deliverables, delays, and approval dependencies.`;
    } else if (status === 'In Process' || q.includes('currently') || q.includes('right now')) {
      subIntent = 'active_sprints';
      subIntentLabel = 'Active Workstreams & Sprints';
      legacyIntent = 'current_activity';
      confidence = 0.92;
      reasoning = `Real-time sprint deliverables currently in progress.`;
    } else {
      subIntent = 'team_distribution';
      subIntentLabel = 'Team Distribution & Throughput';
      legacyIntent = 'general_team';
      confidence = 0.88;
      reasoning = `General team workload and throughput inquiry.`;
    }
  }
  // Branch 3: GENERAL INFO & STRATEGY
  else {
    category = 'general_info';
    categoryLabel = 'General Info';

    if (isGeneralExecutiveBrief) {
      subIntent = 'executive_brief';
      subIntentLabel = 'Executive Management Brief';
      legacyIntent = 'management_brief';
      confidence = 0.98;
      reasoning = `Executive summary prepared for senior management leadership review.`;
    } else if (isAiOverviewGeo) {
      subIntent = 'ai_overview_geo';
      subIntentLabel = 'AI Overviews & Search Visibility';
      legacyIntent = 'ai_overview_geo';
      confidence = 0.95;
      reasoning = `Technical strategy on Google AI Overviews, GEO, and generative search visibility.`;
    } else if (isProductivityTools) {
      subIntent = 'productivity_tools';
      subIntentLabel = 'AI Productivity & Tooling';
      legacyIntent = 'productivity_tools';
      confidence = 0.95;
      reasoning = `Tooling and AI-assisted workflow productivity analysis.`;
    } else if (timeRangeDescription) {
      subIntent = 'time_range_summary';
      subIntentLabel = `Historical Summary (${timeRangeDescription})`;
      legacyIntent = 'time_range';
      confidence = 0.90;
      reasoning = `Time-windowed deliverables analysis for ${timeRangeDescription}.`;
    } else {
      subIntent = 'general_qa';
      subIntentLabel = 'SEO & Content Information';
      legacyIntent = 'general_team';
      confidence = 0.85;
      reasoning = `Broad operational question regarding SEO & content team operations.`;
    }
  }

  // --- 3. Build Directives ---
  const formatStyle: 'direct_roster' | 'executive_summary' | 'detailed_workload' | 'qa_analysis' =
    category === 'client_status' && (subIntent === 'active_clients_roster' || subIntent === 'on_hold_clients' || subIntent === 'closed_clients')
      ? 'direct_roster'
      : subIntent === 'executive_brief'
      ? 'executive_summary'
      : category === 'team_workload'
      ? 'detailed_workload'
      : 'qa_analysis';

  const classification: IntentClassification = {
    category,
    categoryLabel,
    subIntent,
    subIntentLabel,
    confidence,
    reasoning,
    entities: {
      targetAgency,
      targetClient: matchedClient,
      clientAliases: matchedClientAliases,
      targetPerson: matchedPerson,
      personAliases,
      personMemberIds,
      personLists,
      targetList,
      statusFilter: status,
      wantsCount,
      isDeepInspection,
      isBoardAnalysis,
      dateRange: timeRangeDescription
        ? {
            from: dateFrom,
            to: dateTo,
            description: timeRangeDescription,
          }
        : undefined,
    },
    directives: {
      restrictAgency: targetAgency !== 'all' ? targetAgency : undefined,
      enforceActiveOnly: subIntent === 'active_clients_roster',
      isolateClientData: Boolean(matchedClient),
      isolatePersonData: Boolean(matchedPerson),
      scopeToList: targetList,
      responseFormat: formatStyle,
    },
    toQueryIntent(): QueryIntent {
      return {
        rawQuestion,
        intent: legacyIntent,
        targetAgency,
        wantsCount,
        isOverall: q.includes('overall') || q.includes('pipeline') || q.includes('all cards'),
        isBoardAnalysis,
        isDeepInspection,
        targetList:
          legacyIntent === 'clients_overview' ||
          legacyIntent === 'active_clients_list' ||
          legacyIntent === 'on_hold_clients_list' ||
          legacyIntent === 'closed_clients_list'
            ? undefined
            : targetList,
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
        isAiRelated: isAiOverviewGeo || isProductivityTools,
        confidence,
      };
    },
  };

  return classification;
}
