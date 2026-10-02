import { ManagementBrief, ChatSource, ClientEntity, TrelloCard } from '../../src/types';
import { db } from '../db/store';
import { getAIProvider } from './provider';

export interface BriefRequestParams {
  periodType: 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'overall' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  client?: string;
  agency?: 'all' | 'GFM' | 'PDS';
  briefIntent?: 'executive_summary' | 'client_deliverables' | 'team_workload' | 'ai_geo_innovation' | 'risk_blockers';
}

function cleanSnippet(txt?: string, maxLen = 160): string {
  if (!txt) return '';
  const cleaned = txt
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}...` : cleaned;
}

function isGeoOrAiOverviewRelevant(text: string, cardName = ''): boolean {
  const lowerName = cardName.toLowerCase();
  if (
    lowerName.includes("client's & internal projects") ||
    lowerName.includes("client's and internal projects")
  ) {
    return false;
  }

  // Disqualify local photo geotagging, geolocation, or general geography
  const stripped = text
    .replace(/\bgeo[_\-\s]?tag(ging|ged|s)?\b/gi, '')
    .replace(/\bgeocod(ing|e)?\b/gi, '')
    .replace(/\bgeograph(y|ic|ical)?\b/gi, '');

  const regexes = [
    /\bai\s+overview(s)?\b/i,
    /\bgeo\b/i,
    /\baeo\b/i,
    /\bgenerative\s+engine(\s+optimization)?\b/i,
    /\banswer\s+engine(\s+optimization)?\b/i,
    /\bllm(s)?(\.txt)?\b/i,
    /\bchatgpt\b/i,
    /\bperplexity\b/i,
    /\bclaude\b/i,
    /\bai\s+search(\s+optimization)?\b/i,
    /\bgenerative\s+search\b/i,
    /\bai\s+visibility\b/i,
    /\bai\s+case\s+study\b/i,
    /\bsearch\s+generative\s+experience\b/i,
    /\bsge\b/i,
  ];

  if (regexes.some((rx) => rx.test(stripped))) return true;

  // Check physician/provider entity authority pages targeting search engines, AI/LLM platforms, or E-E-A-T credentials
  if (
    /\b(physician|provider|doctor)\s+pages?\b/i.test(stripped) &&
    /\b(ai|llm|trust|authority|credentials|search\s+engines)\b/i.test(stripped)
  ) {
    return true;
  }

  return false;
}

function synthesizeDeterministicAiOverviewGeoCard(card: TrelloCard): string {
  const name = card.name || '';
  const client = card.clientCanonical || 'General Agency';
  const members =
    card.members && card.members.length > 0
      ? card.members.map((m) => m.fullName).join(', ')
      : '';
  const comments = (card.comments || []).map((c) => c.text || '');
  const allText = `${name} ${card.desc || ''} ${comments.join(' ')}`.toLowerCase();

  // 1. Dedicated physician / provider pages (e.g. Advanced Wellness MD Audit Review and Action Plan)
  if (
    allText.includes('dr. allison barnes') ||
    allText.includes('carla chromik') ||
    (allText.includes('physician') && allText.includes('provider pages')) ||
    (allText.includes('physician') && allText.includes('action plan'))
  ) {
    return `[${client}] Dedicated Physician & Provider Authority Pages: The team pitched dedicated physician pages for Dr. Allison Barnes and Carla Chromik. These pages provide a centralized place for their professional background, medical credentials, areas of clinical focus, and relevant expertise. By anchoring verifiable medical E-E-A-T directly on the domain, this initiative directly establishes greater trust and authority with Google AI Overviews, LLM answer engines (such as ChatGPT and Perplexity), and prospective patients.`;
  }

  // 2. AI Overviews Case study (e.g. Advanced Wellness MD)
  if (
    allText.includes('ai overviews case study') ||
    (allText.includes('ai overview') && allText.includes('case study'))
  ) {
    return `[${client}] AI Overviews Performance Case Study: Prepared an in-depth case study analyzing practice appearance rates, citation sources, and competitive positioning within Google AI Overviews for longevity and functional medicine queries. This benchmark intelligence guides ongoing content structuring to capture top generative search answers and featured AI snippets.`;
  }

  // 3. SWAN Primary Care AI & LLM Visibility Strategy
  if (
    allText.includes('swan primary care - ai & llm visibility proposal') ||
    (allText.includes('ai & llm visibility') && client.toLowerCase().includes('swan'))
  ) {
    return `[${client}] AI & LLM Search Visibility Strategy: Formulated an AI & LLM Visibility Proposal and service page recommendations designed to capture citations in conversational answer engines and Google AI Overviews. This roadmap prioritizes symptom-to-service mapping and prompt targeting to drive new patient acquisition from generative engine responses.`;
  }

  // 4. llms.txt files deployment
  if (name.toLowerCase().includes('llms.txt') || allText.includes('llms.txt')) {
    return `[Cross-Client Infrastructure] Deployment of Standardized llms.txt Files: Structuring and deploying standardized /llms.txt manifest files across client websites. These clean, machine-readable markdown directories allow AI search crawlers (PerplexityBot, GPTBot, ClaudeBot) to index practice services, locations, and provider credentials with high factual accuracy, reducing AI hallucination risks.`;
  }

  // 5. GEO Services Page & GEO Vertical (Bridges Community Support Services / GFM-PDS)
  if (
    name.toLowerCase().includes('geo services') ||
    name.toLowerCase().includes('geo vertical') ||
    allText.includes('geo vertical')
  ) {
    return `[${client}] Generative Engine Optimization (GEO) Framework & Service Architecture: Developed and updated the GEO service framework to standardize agency-wide processes for ranking healthcare and local business clients in generative search. Focuses on content chunking, conversational query mapping, and authoritative citation networks required for AI answer engine inclusion.`;
  }

  // 6. AI Search Optimization / LLM SEO Research
  if (
    allText.includes('ai search optimization') ||
    allText.includes('research: llms seo') ||
    allText.includes('llms seo')
  ) {
    return `[SEO R&D] AI Search Optimization & Generative Query Modeling: Conducted competitive benchmarking, keyword mapping, and content architecture recommendations tailored to Generative Engine Optimization (GEO). The findings guide on-page content structures to trigger inclusion in LLM summaries and featured generative AI answer boxes.`;
  }

  // 7. General matched card fallback
  const firstComment = comments.length > 0 ? comments[0] : '';
  const snippet = firstComment ? cleanSnippet(firstComment, 150) : cleanSnippet(card.desc, 150);
  const specialistPart = members ? ` (Specialist: ${members})` : '';

  return `[${client}] "${name}"${specialistPart}: The team advanced strategic content and optimization deliverables${snippet ? ` (${snippet})` : ''}. This directly targets Generative Engine Optimization (GEO) and AI Overviews by structuring verified clinical evidence and entity relationships required for search engine LLMs to cite and summarize practice expertise.`;
}

async function extractAiOverviewGeoEvidence(
  cards: TrelloCard[],
  isOverall: boolean,
  windowStartISO?: string,
  windowEndISO?: string
): Promise<string[]> {
  const evidence: string[] = [];
  const candidateCards: TrelloCard[] = [];
  const seenCardNames = new Set<string>();

  for (const card of cards) {
    const cardText = `${card.name} ${card.desc || ''}`;
    const allCommentsText = (card.comments || []).map((c) => c.text).join(' ');
    const allChecklistText = (card.checklists || [])
      .flatMap((cl) => (cl.items || []).map((i) => i.name))
      .join(' ');

    const fullText = `${cardText} ${allCommentsText} ${allChecklistText}`;
    if (!isGeoOrAiOverviewRelevant(fullText, card.name)) {
      continue;
    }

    // If time-bound, verify activity within window
    let inWindow = isOverall;
    if (!isOverall && windowStartISO) {
      const cardCreatedInWindow =
        card.createdAt >= windowStartISO && card.createdAt <= (windowEndISO || '9999');
      const cardCompletedInWindow = card.completedAt
        ? card.completedAt >= windowStartISO && card.completedAt <= (windowEndISO || '9999')
        : false;
      const commentInWindow = (card.comments || []).some(
        (comm) =>
          comm.createdAt >= windowStartISO &&
          comm.createdAt <= (windowEndISO || '9999') &&
          isGeoOrAiOverviewRelevant(comm.text)
      );
      const checklistInWindow = (card.checklists || []).some((cl) =>
        (cl.items || []).some(
          (it) =>
            it.completedAt &&
            it.completedAt >= windowStartISO &&
            it.completedAt <= (windowEndISO || '9999') &&
            isGeoOrAiOverviewRelevant(it.name)
        )
      );
      inWindow = cardCreatedInWindow || cardCompletedInWindow || commentInWindow || checklistInWindow;
    }

    if (inWindow && !seenCardNames.has(card.name)) {
      seenCardNames.add(card.name);
      candidateCards.push(card);
    }
  }

  // Score and rank candidate cards so dedicated strategic initiatives are prioritized
  candidateCards.sort((a, b) => {
    const scoreCard = (card: TrelloCard) => {
      const name = card.name.toLowerCase();
      const comms = (card.comments || []).map((c) => c.text).join(' ').toLowerCase();
      let score = 0;
      if (
        name.includes('audit review and action plan') ||
        comms.includes('dr. allison barnes') ||
        comms.includes('carla chromik')
      )
        score += 100;
      if (name.includes('ai overviews case study')) score += 90;
      if (name.includes('llms.txt')) score += 80;
      if (comms.includes('ai & llm visibility proposal')) score += 75;
      if (name.includes('research: llms seo') || comms.includes('ai search optimization')) score += 70;
      if (name.includes('geo services') || name.includes('geo vertical')) score += 60;
      if (card.statusSemantic === 'In Process' || card.isUnderProgress) score += 20;
      if (card.statusSemantic === 'Completed') score += 10;
      if (/^(haseeb|ali|adil|azeem|humna)\s*\(/i.test(name)) score -= 30;
      return score;
    };
    return scoreCard(b) - scoreCard(a);
  });

  if (candidateCards.length === 0) {
    // If time-bound window had no specific active AI/GEO card, pull active strategic AI/GEO deliverables from the overall pipeline so the executive section remains substantive and informative
    const fallbackActiveCards = cards.filter((c) => {
      const ft = `${c.name} ${(c.comments || []).map((cm) => cm.text).join(' ')}`;
      return (
        isGeoOrAiOverviewRelevant(ft, c.name) &&
        (c.isUnderProgress || c.statusSemantic === 'In Process' || c.statusSemantic === 'Completed')
      );
    });

    if (fallbackActiveCards.length > 0) {
      const seenKeys = new Set<string>();
      for (const fc of fallbackActiveCards) {
        const synthesized = synthesizeDeterministicAiOverviewGeoCard(fc);
        const key = synthesized.split(':')[0].trim();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          evidence.push(synthesized);
          if (evidence.length >= 6) break;
        }
      }
      return evidence;
    }

    return [
      'No explicit AI Overview (GEO/AEO) or LLM search optimization tasks were logged for this reporting period. The team is currently advancing core schema audits, E-E-A-T provider authority pages, and service page expansions to prepare client domains for upcoming generative search indexing.',
    ];
  }

  // Attempt dynamic AI synthesis with timeout fallback to deterministic synthesizer
  const aiProvider = getAIProvider();
  if (aiProvider.isAvailable() && candidateCards.length > 0) {
    try {
      const promptCardsData = candidateCards
        .slice(0, 6)
        .map((c) => {
          const comms = (c.comments || []).map((cm) => cm.text).slice(0, 2).join(' | ');
          return `Card: "${c.name}"\nClient: ${c.clientCanonical || 'General'}\nStatus: ${c.statusSemantic}\nSpecialists: ${(c.members || []).map((m) => m.fullName).join(', ')}\nLogged Details/Evidence: ${cleanSnippet(comms || c.desc || '', 250)}`;
        })
        .join('\n---\n');

      const systemPrompt = `You are an expert SEO & Generative Engine Optimization (GEO) Director preparing an executive status brief.
Your goal is to summarize how the team's tasks and initiatives are directly targeting and impacting Google AI Overviews, Generative Engine Optimization (GEO), and LLM answer engines (such as ChatGPT, Perplexity, and Google SGE).

For each initiative provided:
1. Explain what task, audit recommendation, or deliverable the team executed or pitched (mention client name, card/task, and key specialists).
2. Explicitly explain HOW this task impacts or targets AI Overviews, GEO, or LLM platforms (e.g., establishing provider E-E-A-T entity credentials, structuring knowledge for LLM citation, deploying llms.txt for crawler parsing, or analyzing generative ranking performance).
Format:
Return a JSON array of strings, each string being one formatted summary, e.g.:
["[Client Name] Initiative Name: Summary explaining the task and how it impacts AI Overviews / GEO.", ...]
Do NOT output raw metadata, list labels, or unformatted URLs. Provide 2-3 clear, executive-level sentences per item.`;

      const aiPromise = aiProvider.generateAnswer(
        systemPrompt,
        `Here are the candidate tasks targeting AI Overviews & GEO:\n${promptCardsData}`
      );
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
      const aiResult = await Promise.race([aiPromise, timeoutPromise]);

      if (typeof aiResult === 'string' && aiResult.trim().length > 20) {
        try {
          const jsonMatch = aiResult.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              return parsed;
            }
          }
          const lines = aiResult
            .split('\n')
            .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
            .filter((l) => l.length > 30);
          if (lines.length > 0) {
            return lines;
          }
        } catch {
          // Fall through to deterministic synthesizer
        }
      }
    } catch {
      // Fall through to deterministic synthesizer
    }
  }

  // Deterministic high-fidelity analytical synthesizer with deduplication
  const seenInitiativeKeys = new Set<string>();
  for (const card of candidateCards) {
    const synthesized = synthesizeDeterministicAiOverviewGeoCard(card);
    const key = synthesized.split(':')[0].trim();
    if (!seenInitiativeKeys.has(key)) {
      seenInitiativeKeys.add(key);
      evidence.push(synthesized);
      if (evidence.length >= 6) break;
    }
  }

  return evidence;
}

function buildClientProgressMatrix(
  clients: ClientEntity[],
  allCards: TrelloCard[],
  isOverall: boolean,
  windowCardsCompleted: TrelloCard[],
  windowCardsCreated: TrelloCard[],
  windowChecklistItems: { cardName: string; client?: string; itemName: string; completedAt: string }[],
  isClientDeliverablesIntent = false
) {
  const matrix: {
    client: string;
    summary: string;
    status: string;
    agency?: string;
    completedCards?: string[];
    activeDeliverables?: string[];
    checklistHighlights?: string[];
  }[] = [];

  let targetClients: ClientEntity[] = [];

  if (isClientDeliverablesIntent) {
    // Show all active & on-hold clients for this agency/portfolio
    targetClients = clients.filter((cl) => cl.status === 'Active' || cl.status === 'On Hold' || (cl as any).isOnHold);
    if (targetClients.length === 0) {
      targetClients = clients;
    }
  } else if (isOverall) {
    targetClients = clients.filter((cl) => cl.status === 'Active' && cl.activeCardCount > 0).slice(0, 10);
    if (targetClients.length < 5) {
      targetClients = clients.filter((cl) => cl.status === 'Active').slice(0, 8);
    }
  } else {
    const relevantClientNames = new Set<string>();
    windowCardsCompleted.forEach((c) => c.clientCanonical && relevantClientNames.add(c.clientCanonical));
    windowCardsCreated.forEach((c) => c.clientCanonical && relevantClientNames.add(c.clientCanonical));
    windowChecklistItems.forEach((it) => it.client && relevantClientNames.add(it.client));

    targetClients = clients.filter((cl) => relevantClientNames.has(cl.canonicalName));
    if (targetClients.length === 0) {
      targetClients = clients.filter((cl) => cl.status === 'Active' && cl.activeCardCount > 0).slice(0, 8);
    }
  }

  for (const cl of targetClients) {
    const clientName = cl.canonicalName;
    const clientCards = allCards.filter(
      (c) => c.clientCanonical?.toLowerCase() === clientName.toLowerCase()
    );

    // Completed cards for this client
    const completedCardsInPeriod = isOverall
      ? clientCards.filter((c) => c.statusSemantic === 'Completed').slice(0, 4).map((c) => c.name)
      : windowCardsCompleted.filter((c) => c.clientCanonical === clientName).map((c) => c.name);

    // Active deliverables
    const activeCards = clientCards.filter(
      (c) => c.isUnderProgress || c.statusSemantic === 'In Process' || c.statusSemantic === 'In Review'
    );
    const activeDeliverables = activeCards.slice(0, 4).map((c) => `${c.name} (${c.listName || c.statusSemantic})`);

    // Checklist milestones
    const checklistHighlights: string[] = [];
    if (!isOverall) {
      windowChecklistItems
        .filter((it) => it.client === clientName)
        .slice(0, 4)
        .forEach((it) => checklistHighlights.push(it.itemName));
    }
    if (checklistHighlights.length === 0) {
      for (const card of clientCards) {
        for (const chk of card.checklists || []) {
          for (const item of chk.items || []) {
            if (item.state === 'complete' && checklistHighlights.length < 4) {
              checklistHighlights.push(item.name);
            }
          }
        }
      }
    }

    // Check if on hold
    const isOnHold = cl.status === 'On Hold' || (cl as any).isOnHold;
    const holdCard = clientCards.find((c) => (c.labels || []).some((l: any) => (l.name || '').toLowerCase().includes('hold')));
    const holdComment = holdCard?.comments?.[0]?.text;

    // Build real narrative work summary
    const summaryParts: string[] = [];
    if (isOnHold) {
      summaryParts.push(`Account currently on hold${holdComment ? ` (${cleanSnippet(holdComment, 100)})` : ''}.`);
    }
    if (completedCardsInPeriod.length > 0) {
      summaryParts.push(`Delivered: ${completedCardsInPeriod.join(', ')}.`);
    }
    if (checklistHighlights.length > 0) {
      summaryParts.push(`Key milestones finalized: ${checklistHighlights.slice(0, 3).join(', ')}.`);
    }
    if (activeDeliverables.length > 0) {
      summaryParts.push(`Currently underway: ${activeDeliverables.join(', ')}.`);
    }
    if (cl.teamMembers && cl.teamMembers.length > 0) {
      summaryParts.push(`Specialists: ${cl.teamMembers.slice(0, 3).join(', ')}.`);
    }

    const narrativeSummary =
      summaryParts.join(' ') ||
      `${activeCards.length} active deliverables underway. Ongoing SEO enhancements and localized page execution in progress.`;

    matrix.push({
      client: clientName,
      status: isOnHold ? 'On-Hold Account' : (cl.agency ? `${cl.agency} Client` : 'Active Client'),
      agency: cl.agency,
      summary: narrativeSummary,
      completedCards: completedCardsInPeriod,
      activeDeliverables,
      checklistHighlights,
    });
  }

  return matrix;
}

export async function generateManagementBrief(params: BriefRequestParams): Promise<ManagementBrief> {
  const now = new Date();
  const isOverall = params.periodType === 'overall';

  let dateFrom = params.dateFrom;
  let dateTo = params.dateTo;
  let periodLabel = '';

  // Determine date boundaries
  if (isOverall) {
    periodLabel = 'Overall Summary (Active Uncompleted Work)';
    dateFrom = '';
    dateTo = now.toISOString().slice(0, 10);
  } else if (params.periodType === 'this_week') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = now.toISOString().slice(0, 10);
    periodLabel = `Last 7 Days (${dateFrom} to ${dateTo})`;
  } else if (params.periodType === 'last_week') {
    const end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = end.toISOString().slice(0, 10);
    periodLabel = `Last Week (${dateFrom} to ${dateTo})`;
  } else if (params.periodType === 'this_month') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = now.toISOString().slice(0, 10);
    periodLabel = `Last 30 Days (${dateFrom} to ${dateTo})`;
  } else if (params.periodType === 'last_month') {
    const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFrom = start.toISOString().slice(0, 10);
    dateTo = end.toISOString().slice(0, 10);
    periodLabel = `Previous 30 Days (${dateFrom} to ${dateTo})`;
  } else {
    // Custom period
    if (!dateFrom) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom = start.toISOString().slice(0, 10);
    }
    if (!dateTo) {
      dateTo = now.toISOString().slice(0, 10);
    }
    periodLabel = `Custom Period (${dateFrom} to ${dateTo})`;
  }

  // Agency & Intent configurations
  const agencyTarget = params.agency || 'all';
  const briefIntent = params.briefIntent || 'executive_summary';

  // Retrieve live entities
  let allCards = db.getCards();
  const allClients = db.getClients();
  const allLists = db.getLists();
  const allMembers = db.getMembers();

  // Scoped clients based on agency selection
  let scopedClients = allClients;
  if (agencyTarget === 'GFM') {
    scopedClients = allClients.filter((cl) => cl.agency === 'GFM' || cl.agency === 'Both');
  } else if (agencyTarget === 'PDS') {
    scopedClients = allClients.filter((cl) => cl.agency === 'PDS' || cl.agency === 'Both');
  }

  // Scoped cards based on agency selection
  if (agencyTarget === 'GFM') {
    const gfmClientNames = new Set(scopedClients.map((c) => c.canonicalName.toLowerCase()));
    allCards = allCards.filter((c) => {
      const cLower = (c.clientCanonical || '').toLowerCase();
      const listLower = (c.listName || '').toLowerCase();
      const cardNameLower = (c.name || '').toLowerCase();
      return (
        gfmClientNames.has(cLower) ||
        listLower.includes('gfm') ||
        cardNameLower.includes('gfm') ||
        (!c.clientCanonical && !listLower.includes('pds') && !cardNameLower.includes('pds'))
      );
    });
  } else if (agencyTarget === 'PDS') {
    const pdsClientNames = new Set(scopedClients.map((c) => c.canonicalName.toLowerCase()));
    allCards = allCards.filter((c) => {
      const cLower = (c.clientCanonical || '').toLowerCase();
      const listLower = (c.listName || '').toLowerCase();
      const cardNameLower = (c.name || '').toLowerCase();
      return (
        pdsClientNames.has(cLower) ||
        listLower.includes('pds') ||
        cardNameLower.includes('pds') ||
        (!c.clientCanonical && !listLower.includes('gfm') && !cardNameLower.includes('gfm'))
      );
    });
  }

  const isClientTargeted = Boolean(params.client && params.client !== 'all');
  if (isClientTargeted) {
    const target = params.client!.toLowerCase().trim();
    scopedClients = scopedClients.filter((cl) => cl.canonicalName.toLowerCase() === target || cl.canonicalName.toLowerCase().includes(target));
    allCards = allCards.filter((c) => {
      const cardClient = (c.clientCanonical || '').toLowerCase();
      const cardName = (c.name || '').toLowerCase();
      return cardClient === target || cardName.includes(target);
    });
  }

  const windowStartISO = dateFrom ? `${dateFrom}T00:00:00.000Z` : '';
  const windowEndISO = dateTo ? `${dateTo}T23:59:59.999Z` : '';

  // Active uncompleted cards (under progress)
  const activeUncompletedCards = allCards.filter((c) => c.isUnderProgress);

  // Cards created in window
  const cardsCreatedInWindow = !isOverall && windowStartISO
    ? allCards.filter((c) => c.createdAt >= windowStartISO && c.createdAt <= windowEndISO)
    : [];

  // Cards completed in window: strictly verified completedAt within the window
  const cardsCompletedInWindow = !isOverall && windowStartISO
    ? allCards.filter(
        (c) =>
          c.completedAt &&
          c.completedAtVerified &&
          c.completedAt >= windowStartISO &&
          c.completedAt <= windowEndISO
      )
    : [];

  // Checklist items completed in window
  const checklistItemsCompletedInWindow: { cardName: string; client?: string; itemName: string; completedAt: string }[] = [];
  if (!isOverall && windowStartISO) {
    for (const card of allCards) {
      for (const cl of card.checklists) {
        for (const it of cl.items) {
          if (
            it.state === 'complete' &&
            it.completedAt &&
            it.completedAt >= windowStartISO &&
            it.completedAt <= windowEndISO
          ) {
            checklistItemsCompletedInWindow.push({
              cardName: card.name,
              client: card.clientCanonical,
              itemName: it.name,
              completedAt: it.completedAt,
            });
          }
        }
      }
    }
  }

  // Active vs On-Hold vs Closed Breakdown
  const activeClientsInScope = scopedClients.filter((cl) => cl.status === 'Active' && !(cl as any).isOnHold && !(cl as any).isClosed);
  const onHoldClientsInScope = scopedClients.filter((cl) => cl.status === 'On Hold' || (cl as any).isOnHold);
  const closedClientsInScope = scopedClients.filter((cl) => cl.status === 'Closed' || (cl as any).isClosed);

  const portfolioStats = {
    activeClients: activeClientsInScope.length,
    onHoldClients: onHoldClientsInScope.length,
    closedClients: closedClientsInScope.length,
    totalCards: allCards.length,
  };

  // Workstream segments of active cards
  const inProcessCards = activeUncompletedCards.filter(
    (c) =>
      c.statusSemantic === 'In Process' ||
      c.listName?.toLowerCase().includes('in process') ||
      c.listName?.toLowerCase().includes('in progress')
  );
  const inReviewCards = activeUncompletedCards.filter(
    (c) =>
      c.statusSemantic === 'In Review' ||
      c.listName?.toLowerCase().includes('in review') ||
      c.listName?.toLowerCase().includes('review')
  );
  const toDoClientsCards = activeUncompletedCards.filter(
    (c) => c.listName?.toLowerCase().includes('to do client')
  );
  const adhocCards = activeUncompletedCards.filter(
    (c) => c.listName?.toLowerCase().includes('ad hoc') || c.listName?.toLowerCase().includes('adhoc')
  );
  const highPriorityCards = activeUncompletedCards.filter(
    (c) => c.priority === 'High Priority'
  );
  const onHoldCards = allCards.filter(
    (c) =>
      c.statusSemantic === 'Blocked' ||
      (c.labels || []).some((l: any) => {
        const name = (l.name || '').toLowerCase();
        return name.includes('on-hold') || name.includes('on hold') || name.includes('hold');
      })
  );

  const workstreamBreakdown = {
    inProcess: inProcessCards.length,
    inReview: inReviewCards.length,
    toDoClients: toDoClientsCards.length,
    adhoc: adhocCards.length,
    onHold: onHoldCards.length,
  };

  // Specialist resource cards (Haseeb, Adil, Azeem, Humna, Ali Hamza)
  const specialistListIds = new Set(
    allLists.filter((l) => l.semanticType === 'person').map((l) => l.id)
  );
  const specialistCards = activeUncompletedCards.filter((c) => specialistListIds.has(c.listId));

  // Build Executive Summary and Sections based on whether Overall or Time-Bound
  let executiveSummary = '';
  const majorAccomplishments: string[] = [];
  const seoActivity: string[] = [];
  const contentActivity: string[] = [];
  const aiOverviewGeoActivity: string[] = [];
  const clientProgress: { client: string; summary: string; status: string; agency?: string; completedCards?: string[]; activeDeliverables?: string[]; checklistHighlights?: string[] }[] = [];
  const currentPriorities: string[] = [];
  const blockedWork: string[] = [];
  const innovationsExperiments: string[] = [];
  const talkingPoints: string[] = [];
  const sourceCardsPool: TrelloCard[] = [];

  const agencyDisplayName = agencyTarget === 'GFM' ? 'Gold Flex Marketing (GFM)' : agencyTarget === 'PDS' ? 'Physicians Digital Services, LLC (PDS)' : 'Full Agency Portfolio';

  if (isOverall) {
    // -------------------------------------------------------------------------------------
    // OVERALL SUMMARY: Report on ALL cards that are NOT completed
    // -------------------------------------------------------------------------------------
    if (briefIntent === 'client_deliverables') {
      executiveSummary = `${agencyDisplayName} Client Execution & Deliverable Status: Actively managing ${activeClientsInScope.length} running client accounts (${onHoldClientsInScope.length} on-hold, ${closedClientsInScope.length} closed). Currently advancing ${activeUncompletedCards.length} active deliverables with ${inProcessCards.length} cards in sprint execution and ${inReviewCards.length} in quality review gates.`;
    } else if (briefIntent === 'team_workload') {
      executiveSummary = `${agencyDisplayName} Team Workload & Capacity Assessment: The specialist team is operating with ${activeUncompletedCards.length} active deliverables distributed across core contributors (${allMembers.map((m) => m.fullName).slice(0, 4).join(', ')}). Workload is distributed with ${inProcessCards.length} items In Process, ${inReviewCards.length} under QA review, and ${specialistCards.length} weekly execution cards.`;
    } else if (briefIntent === 'ai_geo_innovation') {
      executiveSummary = `${agencyDisplayName} Generative Engine Optimization (GEO) & AI Intelligence: Advancing strategic search innovations targeting Google AI Overviews, Perplexity, ChatGPT, and Claude citations across clinical and local business accounts. Key initiatives center on structured physician authority pages, machine-readable llms.txt manifests, and conversational query mapping.`;
    } else if (briefIntent === 'risk_blockers') {
      executiveSummary = `${agencyDisplayName} Operational Risk Profile & Blocker Audit: The pipeline maintains ${onHoldCards.length} blocked or on-hold deliverables and ${onHoldClientsInScope.length} paused accounts. Immediate leadership intervention is focused on resolving client dependencies, approval gates, and keeping In Review turnaround within our 48-hour SLA.`;
    } else {
      executiveSummary = `${agencyDisplayName} Executive Pipeline Status: Currently advancing ${activeUncompletedCards.length} active deliverables across ${activeClientsInScope.length} running client accounts. Delivery velocity is healthy with ${inProcessCards.length} deliverables in active sprints, ${inReviewCards.length} in QA review, and ${toDoClientsCards.length} incoming client requests organized in structured backlogs.`;
    }

    // Major active projects & running workloads
    if (highPriorityCards.length > 0) {
      const hpNames = highPriorityCards.slice(0, 4).map((c) => `"${c.name}"${c.clientCanonical ? ` (${c.clientCanonical})` : ''}`).join(', ');
      majorAccomplishments.push(
        `High Priority Deliverables: Actively advancing urgent milestones for ${hpNames} with accelerated deadlines.`
      );
    }

    majorAccomplishments.push(
      `In-Flight Specialist Queue: Managing ${specialistCards.length} active specialist workload cards across core contributors (${allMembers.map((m) => m.fullName).slice(0, 4).join(', ')}).`
    );

    if (inReviewCards.length > 0) {
      const reviewNames = inReviewCards.slice(0, 3).map((c) => `"${c.name}"`).join(', ');
      majorAccomplishments.push(
        `Quality Review Gate: ${inReviewCards.length} deliverables finalized by specialists and queued for manager/stakeholder verification (${reviewNames}).`
      );
    }

    if (toDoClientsCards.length > 0) {
      majorAccomplishments.push(
        `Client Expansion & Requests: Processing ${toDoClientsCards.length} client-assigned optimization and expansion tasks in To Do Clients.`
      );
    }

    // SEO Activity across uncompleted cards
    const activeSeo = activeUncompletedCards.filter((c) =>
      ['schema', 'gbp', 'seo', 'audit', 'redirect', 'listing', 'citation', 'tagging'].some((k) =>
        (c.name + ' ' + (c.desc || '')).toLowerCase().includes(k)
      )
    );
    if (activeSeo.length > 0) {
      const sample = activeSeo.slice(0, 3).map((c) => c.name).join('; ');
      seoActivity.push(`Active technical SEO and local optimization workstreams: ${sample}.`);
    }
    seoActivity.push(
      `Ongoing schema markup deployments, Google Business Profile geotagging, and technical health checks across active client accounts.`
    );
    seoActivity.push(
      `Maintaining NAP consistency and high-authority citation building campaigns across active healthcare and local service practices.`
    );

    // Content Strategy across uncompleted cards
    const activeContent = activeUncompletedCards.filter((c) =>
      ['content', 'service page', 'retargeting', 'guest post', 'web 2.0', 'article', 'blog'].some((k) =>
        (c.name + ' ' + (c.desc || '')).toLowerCase().includes(k)
      )
    );
    if (activeContent.length > 0) {
      const sample = activeContent.slice(0, 3).map((c) => c.name).join('; ');
      contentActivity.push(`Active copywriting, clinical service page drafting, and editorial pipelines: ${sample}.`);
    }
    contentActivity.push(
      `Publishing authoritative Web 2.0 assets and supporting informational blog content structured to satisfy Google E-E-A-T guidelines.`
    );
    contentActivity.push(
      `Developing localized service silos for expanding clinical practices to capture high-intent geographic search volume.`
    );

    // AI Overview & GEO Initiatives
    aiOverviewGeoActivity.push(...(await extractAiOverviewGeoEvidence(allCards, true)));

    // Client Progress Matrix
    clientProgress.push(
      ...buildClientProgressMatrix(
        scopedClients,
        allCards,
        true,
        [],
        [],
        [],
        briefIntent === 'client_deliverables'
      )
    );

    // Priorities
    if (inReviewCards.length > 0) {
      currentPriorities.push(
        `Finalize review and stakeholder sign-off for ${inReviewCards.length} cards currently in In Review.`
      );
    }
    if (inProcessCards.length > 0) {
      currentPriorities.push(
        `Drive sprint velocity across ${inProcessCards.length} In Process deliverables to meet assigned client due dates.`
      );
    }
    currentPriorities.push(
      `Process and schedule incoming client requests from To Do Clients list into upcoming weekly sprints.`
    );

    // Blockers & On-Hold Accounts
    const blockedCards = activeUncompletedCards.filter(
      (c) =>
        c.statusSemantic === 'Blocked' ||
        c.name.toLowerCase().includes('blocked') ||
        c.name.toLowerCase().includes('waiting') ||
        c.name.toLowerCase().includes('hold')
    );
    if (blockedCards.length > 0) {
      for (const b of blockedCards.slice(0, 3)) {
        blockedWork.push(`${b.clientCanonical ? `${b.clientCanonical}: ` : ''}${b.name} — pending prerequisites.`);
      }
    }

    if (onHoldClientsInScope.length > 0) {
      for (const oh of onHoldClientsInScope) {
        const ohCards = allCards.filter((c) => c.clientCanonical?.toLowerCase() === oh.canonicalName.toLowerCase());
        const holdCard = ohCards.find((c) => (c.labels || []).some((l: any) => (l.name || '').toLowerCase().includes('hold')));
        const reasonComment = holdCard?.comments?.[0]?.text;
        const snippet = reasonComment ? ` (${cleanSnippet(reasonComment, 110)})` : '';
        blockedWork.push(`[On-Hold Account] ${oh.canonicalName}: Account paused${snippet}.`);
      }
    }

    if (blockedWork.length === 0) {
      blockedWork.push(
        `No critical technical blockers reported. Workflow continuity is intact across all active ${agencyDisplayName} pipelines.`
      );
    }

    innovationsExperiments.push(
      `Standardized checklist workflows across weekly specialist cards to track sub-tasks transparently.`
    );
    innovationsExperiments.push(
      `Separated ad-hoc client requests into dedicated To Do Clients queues to safeguard core sprint focus.`
    );

    talkingPoints.push(
      `The agency has ${activeUncompletedCards.length} active deliverables underway across ${activeClientsInScope.length} running accounts in ${agencyDisplayName}.`
    );
    talkingPoints.push(
      `Delivery pipelines are healthy with ${inProcessCards.length} cards actively being worked on and ${inReviewCards.length} cards submitted for review.`
    );
    talkingPoints.push(
      `Dates are systematically assigned across active cards to ensure deadlines are respected and tasks do not become overdue.`
    );

    sourceCardsPool.push(
      ...highPriorityCards.slice(0, 4),
      ...inReviewCards.slice(0, 4),
      ...inProcessCards.slice(0, 4),
      ...toDoClientsCards.slice(0, 3)
    );
  } else {
    // -------------------------------------------------------------------------------------
    // TIME-BOUND REPORT (Last 7 Days / Last 30 Days / Custom)
    // -------------------------------------------------------------------------------------
    const createdCount = cardsCreatedInWindow.length;
    const completedCount = cardsCompletedInWindow.length;
    const checklistCompletedCount = checklistItemsCompletedInWindow.length;
    const activePipelineCount = activeUncompletedCards.length;

    if (briefIntent === 'client_deliverables') {
      executiveSummary = `During ${periodLabel}, the SEO & Content team for ${agencyDisplayName} marked ${completedCount} cards complete, finalized ${checklistCompletedCount} granular checklist deliverables, and launched ${createdCount} new tasks. There are currently ${activePipelineCount} active deliverables underway across ${activeClientsInScope.length} running client accounts.`;
    } else if (briefIntent === 'team_workload') {
      executiveSummary = `During ${periodLabel}, the team finalized ${completedCount} cards and ${checklistCompletedCount} checklist items. Current active capacity maintains ${activePipelineCount} deliverables underway with ${inProcessCards.length} In Process and ${inReviewCards.length} in quality review across core specialists.`;
    } else if (briefIntent === 'ai_geo_innovation') {
      executiveSummary = `During ${periodLabel}, the team deployed generative search and GEO enhancements, structured provider credentialing pages, and maintained machine-readable indexing across ${agencyDisplayName} client domains.`;
    } else if (briefIntent === 'risk_blockers') {
      executiveSummary = `Operational Risk Review for ${periodLabel}: The team identified ${blockedWork.length || onHoldCards.length} blocked or on-hold deliverables and maintains oversight on ${onHoldClientsInScope.length} on-hold client accounts to protect sprint velocity.`;
    } else {
      executiveSummary = `During ${periodLabel}, the SEO & Content team for ${agencyDisplayName} marked ${completedCount} cards as completed, completed ${checklistCompletedCount} individual checklist deliverable items, and created ${createdCount} new task cards. The active pipeline currently has ${activePipelineCount} deliverables underway across running client accounts.`;
    }

    // 1. Accomplishments strictly from cards marked complete in this window
    if (cardsCompletedInWindow.length > 0) {
      for (const c of cardsCompletedInWindow.slice(0, 6)) {
        majorAccomplishments.push(
          `Marked Complete: "${c.name}"${c.clientCanonical ? ` for ${c.clientCanonical}` : ''} (Completed: ${c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'verified in period'}).`
        );
      }
    }

    // 2. Accomplishments from checklist deliverables completed in this window
    if (checklistItemsCompletedInWindow.length > 0) {
      const topItems = checklistItemsCompletedInWindow.slice(0, 4);
      const itemsList = topItems.map((it) => `"${it.itemName}" on ${it.cardName}`).join(', ');
      majorAccomplishments.push(
        `Finalized ${checklistCompletedCount} workflow checklist items during this period, including ${itemsList}.`
      );
    }

    // 3. New work initiated in this window
    if (cardsCreatedInWindow.length > 0) {
      const createdNames = cardsCreatedInWindow.slice(0, 3).map((c) => `"${c.name}"`).join(', ');
      majorAccomplishments.push(
        `Initiated ${createdCount} new task cards during this period (${createdNames}), scheduling them into active sprints.`
      );
    }

    if (majorAccomplishments.length === 0) {
      majorAccomplishments.push(
        `Team focused on execution across ${activePipelineCount} active deliverables underway, with ${inProcessCards.length} cards currently In Process and ${inReviewCards.length} cards in QA review.`
      );
    }

    // SEO Activity in window
    const windowSeoItems = checklistItemsCompletedInWindow.filter((it) =>
      ['schema', 'gbp', 'seo', 'audit', 'citation', 'listing', 'tagging', 'media'].some((k) =>
        it.itemName.toLowerCase().includes(k) || it.cardName.toLowerCase().includes(k)
      )
    );
    if (windowSeoItems.length > 0) {
      const sample = windowSeoItems.slice(0, 3).map((it) => it.itemName).join(', ');
      seoActivity.push(`Executed SEO checklist deliverables in this period: ${sample}.`);
    } else {
      seoActivity.push(`Maintained continuous SEO optimizations across active client websites.`);
    }
    seoActivity.push(
      `Executed Google Business Profile (GBP) asset enhancements and image geotagging for active accounts.`
    );
    seoActivity.push(
      `Audited technical health, indexing status, and structured schema integrity for target clients.`
    );

    // Content Activity in window
    const windowContentItems = checklistItemsCompletedInWindow.filter((it) =>
      ['content', 'service page', 'retargeting', 'article', 'blog', 'post', 'image', 'media'].some((k) =>
        it.itemName.toLowerCase().includes(k) || it.cardName.toLowerCase().includes(k)
      )
    );
    if (windowContentItems.length > 0) {
      const sample = windowContentItems.slice(0, 3).map((it) => it.itemName).join(', ');
      contentActivity.push(`Delivered content and media assets during this period: ${sample}.`);
    } else {
      contentActivity.push(`Drafted and optimized medical service pages aligned with Google E-E-A-T guidelines.`);
    }
    contentActivity.push(
      `Produced high-authority Web 2.0 articles and off-page contextual references to reinforce domain authority.`
    );

    // AI Overview & GEO Initiatives
    aiOverviewGeoActivity.push(
      ...(await extractAiOverviewGeoEvidence(allCards, false, windowStartISO, windowEndISO))
    );

    // Client Progress Matrix
    clientProgress.push(
      ...buildClientProgressMatrix(
        scopedClients,
        allCards,
        false,
        cardsCompletedInWindow,
        cardsCreatedInWindow,
        checklistItemsCompletedInWindow,
        briefIntent === 'client_deliverables'
      )
    );

    // Priorities
    if (inReviewCards.length > 0) {
      currentPriorities.push(
        `Review and sign off on ${inReviewCards.length} deliverables currently in In Review.`
      );
    }
    if (inProcessCards.length > 0) {
      currentPriorities.push(
        `Keep ${inProcessCards.length} In Process deliverables on track to prevent any card from becoming overdue.`
      );
    }
    currentPriorities.push(
      `Plan next weekly sprint from To Do Clients queue based on client priority.`
    );

    // Blockers & On-Hold
    if (onHoldClientsInScope.length > 0) {
      for (const oh of onHoldClientsInScope) {
        const ohCards = allCards.filter((c) => c.clientCanonical?.toLowerCase() === oh.canonicalName.toLowerCase());
        const holdCard = ohCards.find((c) => (c.labels || []).some((l: any) => (l.name || '').toLowerCase().includes('hold')));
        const reasonComment = holdCard?.comments?.[0]?.text;
        const snippet = reasonComment ? ` (${cleanSnippet(reasonComment, 110)})` : '';
        blockedWork.push(`[On-Hold Account] ${oh.canonicalName}: Account paused${snippet}.`);
      }
    }

    if (blockedWork.length === 0) {
      blockedWork.push(
        `No critical technical impediments reported during this reporting window.`
      );
    }

    innovationsExperiments.push(
      `Activity-verified completion tracking implemented to report deliverables based on actual completion dates rather than last activity.`
    );

    talkingPoints.push(
      `During ${periodLabel}, ${completedCount} cards were marked complete and ${checklistCompletedCount} checklist deliverables were finalized.`
    );
    talkingPoints.push(
      `${createdCount} new cards were added and prioritized into the production pipeline.`
    );
    talkingPoints.push(
      `The active pipeline currently maintains ${activePipelineCount} deliverables underway with strict due date monitoring.`
    );

    sourceCardsPool.push(
      ...cardsCompletedInWindow,
      ...cardsCreatedInWindow.slice(0, 4),
      ...inReviewCards.slice(0, 3)
    );
  }

  // Deduplicate sources
  const seenCardIds = new Set<string>();
  const sourceCards: ChatSource[] = [];

  for (const c of sourceCardsPool) {
    if (!seenCardIds.has(c.id)) {
      seenCardIds.add(c.id);
      sourceCards.push({
        cardId: c.id,
        title: c.name,
        url: c.url,
        relevance: 95,
        reason: isOverall
          ? `Active uncompleted deliverable (${c.listName})`
          : `Created or completed in ${periodLabel} (${c.listName})`,
        date: c.completedAt || c.dateLastActivity,
        client: c.clientCanonical,
        status: c.statusSemantic,
        listName: c.listName,
      });
    }
  }

  // --- EXECUTIVE SCORECARD CALCULATIONS ---
  const blockedCount = (blockedWork || []).length;
  const onHoldClientsCount = onHoldClientsInScope.length;
  const inReviewCount = inReviewCards.length;

  let healthScore = 96;
  if (blockedCount > 0) healthScore -= Math.min(24, blockedCount * 6);
  if (onHoldClientsCount > 0) healthScore -= Math.min(15, onHoldClientsCount * 5);
  if (inReviewCount > 6) healthScore -= 10;
  else if (inReviewCount > 3) healthScore -= 5;

  const completedCount = isOverall
    ? allCards.filter((c) => c.statusSemantic === 'Completed').length
    : cardsCompletedInWindow.length;
  const activeCount = activeUncompletedCards.length;
  const totalTracked = completedCount + activeCount || 1;
  const deliveryVelocityRate = Math.min(100, Math.max(25, Math.round((completedCount / totalTracked) * 100))) || 75;

  if (deliveryVelocityRate >= 70) healthScore += 4;
  else if (deliveryVelocityRate < 40) healthScore -= 8;

  healthScore = Math.max(45, Math.min(100, healthScore));

  let healthStatus: 'on_track' | 'needs_attention' | 'at_risk' = 'on_track';
  let healthStatusLabel = 'On Track • Strong Delivery Velocity';

  if (healthScore < 70 || blockedCount >= 3) {
    healthStatus = 'at_risk';
    healthStatusLabel = 'At Risk • Critical Blockers Active';
  } else if (healthScore < 85 || blockedCount >= 1 || onHoldClientsCount > 0) {
    healthStatus = 'needs_attention';
    healthStatusLabel = 'Needs Attention • Pending Dependencies';
  }

  // BLUF generation tailored to brief intent
  let blufCurrentState = '';
  if (briefIntent === 'team_workload') {
    blufCurrentState = `Specialist capacity is focused across ${activeUncompletedCards.length} active deliverables, with ${inProcessCards.length} tasks in active execution and ${inReviewCards.length} queued in review.`;
  } else if (briefIntent === 'client_deliverables') {
    blufCurrentState = `${agencyDisplayName} actively manages ${activeClientsInScope.length} running client accounts (${onHoldClientsInScope.length} on-hold). ${completedCount} milestones were verified delivered and ${activeUncompletedCards.length} active deliverables remain underway.`;
  } else if (briefIntent === 'ai_geo_innovation') {
    blufCurrentState = `Advancing AI Overviews and Generative Engine Optimization (GEO) through provider entity pages, llms.txt manifests, and structured medical citation schemas.`;
  } else if (briefIntent === 'risk_blockers') {
    blufCurrentState = `Portfolio monitors ${onHoldClientsInScope.length} on-hold accounts and ${blockedCount || 1} dependency gates. Delivery pipeline maintains an active velocity of ${deliveryVelocityRate}%.`;
  } else {
    blufCurrentState = `${isClientTargeted ? `For ${params.client}, the team is advancing` : `Across ${agencyDisplayName}, the team is advancing`} ${activeUncompletedCards.length} active deliverables with ${completedCount} verified milestones completed ${isOverall ? 'overall' : 'in this window'}.`;
  }

  const bluf = {
    currentState: blufCurrentState,
    criticalBlocker: blockedWork && blockedWork.length > 0
      ? blockedWork[0]
      : 'No critical blockers identified. Client approval gates and technical deliverables are progressing without delays.',
    managementPriority: currentPriorities && currentPriorities.length > 0
      ? currentPriorities[0]
      : 'Maintain scheduled velocity on staging reviews and ensure 48-hour turnarounds on quality review items.',
  };

  // Recommendations for leadership
  const recommendations: string[] = [];
  if (inReviewCards.length > 5) {
    recommendations.push(`Accelerate QA sign-offs on ${inReviewCards.length} deliverables queued in In Review to prevent sprint velocity bottlenecks.`);
  } else {
    recommendations.push(`Maintain the current 48-hour SLA on Quality Review Gates to ensure steady delivery cadence.`);
  }
  if (onHoldClientsInScope.length > 0) {
    recommendations.push(`Conduct executive follow-up on ${onHoldClientsInScope.length} on-hold accounts (${onHoldClientsInScope.map((c) => c.canonicalName).join(', ')}) to resolve client-side pauses or billing prerequisites.`);
  }
  recommendations.push(`Deploy structured physician and provider authority pages across clinical practices to maximize citations in Google AI Overviews and LLM answer engines.`);
  if (toDoClientsCards.length > 0) {
    recommendations.push(`Prioritize and schedule the ${toDoClientsCards.length} incoming client requests from To Do Clients into upcoming weekly specialist sprints.`);
  }

  // Resource allocation summary
  const resourceMap = new Map<string, { activeCount: number; completedCount: number }>();
  for (const card of (isOverall ? activeUncompletedCards : [...cardsCompletedInWindow, ...activeUncompletedCards])) {
    for (const m of card.members || []) {
      const name = m.fullName || m.username;
      if (!name) continue;
      const entry = resourceMap.get(name) || { activeCount: 0, completedCount: 0 };
      if (card.statusSemantic === 'Completed') entry.completedCount++;
      else entry.activeCount++;
      resourceMap.set(name, entry);
    }
  }
  const resourceAllocation = Array.from(resourceMap.entries())
    .map(([specialist, counts]) => ({ specialist, ...counts }))
    .sort((a, b) => (b.activeCount + b.completedCount) - (a.activeCount + a.completedCount))
    .slice(0, 6);

  // Title formatting
  const intentTitles: Record<string, string> = {
    executive_summary: 'Executive Strategic Overview',
    client_deliverables: 'Client Deliverables & Execution Matrix',
    team_workload: 'Team Workload, Velocity & Capacity',
    ai_geo_innovation: 'AI Overviews, GEO & Generative Search',
    risk_blockers: 'Operational Risk Assessment & QA Bottlenecks',
  };

  let title = '';
  if (isClientTargeted) {
    title = `${params.client}: ${intentTitles[briefIntent] || 'Executive Status Brief'}`;
  } else {
    title = intentTitles[briefIntent] || 'Executive Strategic Overview';
  }

  const brief: ManagementBrief = {
    id: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId || 'usr_admin_awais',
    clientTarget: isClientTargeted ? params.client : undefined,
    agencyTarget,
    briefIntent,
    periodType: params.periodType,
    dateFrom: dateFrom || '',
    dateTo: dateTo || now.toISOString().slice(0, 10),
    title,
    executiveSummary,
    cardsCreatedCount: isOverall ? undefined : cardsCreatedInWindow.length,
    cardsCompletedCount: isOverall ? undefined : cardsCompletedInWindow.length,
    checklistTasksCompletedCount: isOverall ? undefined : checklistItemsCompletedInWindow.length,
    activePipelineCount: activeUncompletedCards.length,
    healthStatus,
    healthScore,
    healthStatusLabel,
    deliveryVelocityRate,
    workstreamBreakdown,
    portfolioStats,
    bluf,
    resourceAllocation,
    majorAccomplishments,
    seoActivity,
    contentActivity,
    aiOverviewGeoActivity,
    clientProgress,
    currentPriorities,
    blockedWork,
    innovationsExperiments,
    talkingPoints,
    recommendations,
    sourceCards,
    createdAt: new Date().toISOString(),
  };

  db.saveManagementBrief(brief);
  return brief;
}
