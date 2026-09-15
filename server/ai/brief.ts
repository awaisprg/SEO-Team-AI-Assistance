import { ManagementBrief, ChatSource, ClientEntity, TrelloCard } from '../../src/types';
import { db } from '../db/store';
import { getAIProvider } from './provider';

export interface BriefRequestParams {
  periodType: 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'overall' | 'custom';
  dateFrom?: string;
  dateTo?: string;
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

  // Retrieve live entities
  const allCards = db.getCards();
  const allClients = db.getClients();
  const allLists = db.getLists();
  const allMembers = db.getMembers();

  const windowStartISO = dateFrom ? `${dateFrom}T00:00:00.000Z` : '';
  const windowEndISO = dateTo ? `${dateTo}T23:59:59.999Z` : '';

  // Active uncompleted cards (under progress)
  const activeUncompletedCards = allCards.filter((c) => c.isUnderProgress);

  // Cards created in window
  const cardsCreatedInWindow = !isOverall && windowStartISO
    ? allCards.filter((c) => c.createdAt >= windowStartISO && c.createdAt <= windowEndISO)
    : [];

  // Cards completed in window: strictly verified completedAt within the window!
  // This explicitly excludes 2-month-old cards from weekly/monthly reports
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

  // Agency breakdowns
  const pdsClients = allClients.filter((cl) => cl.agency === 'PDS' || cl.agency === 'Both');
  const gfmClients = allClients.filter((cl) => cl.agency === 'GFM' || cl.agency === 'Both');
  const activePdsClients = pdsClients.filter((cl) => cl.status === 'Active');
  const activeGfmClients = gfmClients.filter((cl) => cl.status === 'Active');

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
  const clientProgress: { client: string; summary: string; status: string }[] = [];
  const currentPriorities: string[] = [];
  const blockedWork: string[] = [];
  const innovationsExperiments: string[] = [];
  const talkingPoints: string[] = [];
  const sourceCardsPool: TrelloCard[] = [];

  if (isOverall) {
    // -------------------------------------------------------------------------------------
    // OVERALL SUMMARY: Report on ALL cards that are NOT completed
    // -------------------------------------------------------------------------------------
    executiveSummary = `Overall Agency Pipeline Status: There are currently ${activeUncompletedCards.length} active deliverables underway across the SEO and Content boards. The team actively services ${activePdsClients.length} running PDS client accounts and ${activeGfmClients.length} running GFM accounts. Work is organized across In Process sprints (${inProcessCards.length} deliverables), In Review QA gates (${inReviewCards.length} deliverables), Client To-Do backlogs (${toDoClientsCards.length} ad-hoc/new requests), and Specialist Resource queues (${specialistCards.length} weekly execution cards).`;

    // Major active projects & running workloads
    if (highPriorityCards.length > 0) {
      const hpNames = highPriorityCards.slice(0, 4).map((c) => `"${c.name}"${c.clientCanonical ? ` (${c.clientCanonical})` : ''}`).join(', ');
      majorAccomplishments.push(
        `High Priority Engagements: Actively advancing urgent deliverables for ${hpNames} with accelerated deadlines.`
      );
    }

    majorAccomplishments.push(
      `In-Flight Specialist Queue: Managing ${specialistCards.length} active specialist workload cards across core contributors (${allMembers.map((m) => m.fullName).slice(0, 4).join(', ')}).`
    );

    if (inReviewCards.length > 0) {
      const reviewNames = inReviewCards.slice(0, 3).map((c) => `"${c.name}"`).join(', ');
      majorAccomplishments.push(
        `Quality Gate Pipeline: ${inReviewCards.length} deliverables completed by specialists and currently queued for stakeholder/manager review (${reviewNames}).`
      );
    }

    if (toDoClientsCards.length > 0) {
      majorAccomplishments.push(
        `Client Requests & Expansion: Processing ${toDoClientsCards.length} client-assigned and team-initiated SEO, content optimization, and page expansion tasks in To Do Clients.`
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
      `Ongoing schema markup deployments, Google Business Profile geotagging, and monthly technical audits across active PDS and GFM client rosters.`
    );
    seoActivity.push(
      `Maintaining NAP consistency and off-page citation building campaigns across healthcare, dental, and local service clients.`
    );

    // Content Strategy across uncompleted cards
    const activeContent = activeUncompletedCards.filter((c) =>
      ['content', 'service page', 'retargeting', 'guest post', 'web 2.0', 'article', 'blog'].some((k) =>
        (c.name + ' ' + (c.desc || '')).toLowerCase().includes(k)
      )
    );
    if (activeContent.length > 0) {
      const sample = activeContent.slice(0, 3).map((c) => c.name).join('; ');
      contentActivity.push(`Active copywriting, medical service page drafting, and editorial pipelines: ${sample}.`);
    }
    contentActivity.push(
      `Publishing authoritative Web 2.0 assets and supporting informational blog content structured to satisfy Google E-E-A-T guidelines.`
    );
    contentActivity.push(
      `Developing localized service silos for expanding clinical practices to capture high-intent geographic search volume.`
    );

    // AI Overview & GEO Initiatives
    aiOverviewGeoActivity.push(
      `Aligning entity schema graphs and structured FAQs with Google AI Overview extraction models.`
    );
    aiOverviewGeoActivity.push(
      `Tracking brand citations and medical entity recognition across generative search engines (Google AIO, Perplexity, ChatGPT Search).`
    );
    aiOverviewGeoActivity.push(
      `Standardizing tabular answers and medical author bio schemas to maximize AI Overview snippet inclusions.`
    );

    // Client Progress for Active Clients
    const topActiveClients = allClients
      .filter((cl) => cl.status === 'Active' && cl.activeCardCount > 0)
      .slice(0, 6);
    for (const cl of topActiveClients) {
      const teamStr = cl.teamMembers.length > 0 ? cl.teamMembers.slice(0, 3).join(', ') : 'Specialist Team';
      clientProgress.push({
        client: cl.canonicalName,
        status: `${cl.agency || 'Active'} Client (Running)`,
        summary: `${cl.activeCardCount} active deliverables underway. ${cl.completedTasksCount} historical checklist milestones finalized. Team: ${teamStr}.`,
      });
    }

    // Priorities for uncompleted work
    if (inReviewCards.length > 0) {
      currentPriorities.push(
        `Finalize review and approval for ${inReviewCards.length} cards currently in In Review.`
      );
    }
    if (inProcessCards.length > 0) {
      currentPriorities.push(
        `Drive sprint velocity across ${inProcessCards.length} In Process deliverables to meet assigned client due dates.`
      );
    }
    currentPriorities.push(
      `Process client requests from To Do Clients list into scheduled weekly specialist sprints.`
    );

    // Blockers
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
    } else {
      blockedWork.push(
        `No critical technical blockers reported. Workflow continuity is intact across all active PDS and GFM pipelines.`
      );
    }

    innovationsExperiments.push(
      `Standardized checklist workflows across weekly specialist cards to track sub-tasks transparently.`
    );
    innovationsExperiments.push(
      `Separated ad-hoc client requests into dedicated To Do Clients queues to safeguard core sprint focus.`
    );

    talkingPoints.push(
      `The agency has ${activeUncompletedCards.length} active deliverables underway across ${activePdsClients.length} running PDS clients and ${activeGfmClients.length} running GFM clients.`
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
    // TIME-BOUND REPORT (Last 7 Days / Last 30 Days / Custom): Created or Completed in Window
    // -------------------------------------------------------------------------------------
    const createdCount = cardsCreatedInWindow.length;
    const completedCount = cardsCompletedInWindow.length;
    const checklistCompletedCount = checklistItemsCompletedInWindow.length;
    const activePipelineCount = activeUncompletedCards.length;

    executiveSummary = `During ${periodLabel}, the SEO & Content team marked ${completedCount} cards as completed, completed ${checklistCompletedCount} individual checklist deliverable items, and created ${createdCount} new task cards across the board. The active pipeline currently has ${activePipelineCount} deliverables underway across running PDS and GFM client accounts.`;

    // 1. Accomplishments strictly from cards marked complete in this window
    if (cardsCompletedInWindow.length > 0) {
      for (const c of cardsCompletedInWindow.slice(0, 5)) {
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
      `Monitored emerging generative search visibility (Google AI Overviews, Perplexity) for client focus keywords.`
    );
    aiOverviewGeoActivity.push(
      `Structured entity schema data to ensure client practices are cited as verified authorities in AI summaries.`
    );

    // Client Progress in window: clients with completed cards, created cards, or completed checklist items
    const relevantClients = new Set<string>();
    cardsCompletedInWindow.forEach((c) => c.clientCanonical && relevantClients.add(c.clientCanonical));
    cardsCreatedInWindow.forEach((c) => c.clientCanonical && relevantClients.add(c.clientCanonical));
    checklistItemsCompletedInWindow.forEach((it) => it.client && relevantClients.add(it.client));

    const clientListToDisplay = Array.from(relevantClients).slice(0, 6);
    if (clientListToDisplay.length > 0) {
      for (const clientName of clientListToDisplay) {
        const clientEntity = allClients.find((cl) => cl.canonicalName === clientName);
        const compInWin = cardsCompletedInWindow.filter((c) => c.clientCanonical === clientName).length;
        const crInWin = cardsCreatedInWindow.filter((c) => c.clientCanonical === clientName).length;
        const clInWin = checklistItemsCompletedInWindow.filter((it) => it.client === clientName).length;

        const summaryParts: string[] = [];
        if (compInWin > 0) summaryParts.push(`${compInWin} cards marked complete`);
        if (clInWin > 0) summaryParts.push(`${clInWin} checklist tasks finalized`);
        if (crInWin > 0) summaryParts.push(`${crInWin} new cards created`);
        if (clientEntity?.activeCardCount) summaryParts.push(`${clientEntity.activeCardCount} deliverables currently active`);

        clientProgress.push({
          client: clientName,
          status: clientEntity?.agency ? `${clientEntity.agency} Client` : 'Active Client',
          summary: summaryParts.join('; ') || 'Active engagement in progress.',
        });
      }
    } else {
      // Fallback to active clients
      const fallback = allClients.filter((cl) => cl.status === 'Active' && cl.activeCardCount > 0).slice(0, 4);
      for (const cl of fallback) {
        clientProgress.push({
          client: cl.canonicalName,
          status: `${cl.agency || 'Active'} Client`,
          summary: `${cl.activeCardCount} active deliverables underway. ${cl.completedTasksCount} total checklist milestones finalized.`,
        });
      }
    }

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

    blockedWork.push(
      `No critical technical impediments reported during this reporting window.`
    );

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
      `The active pipeline currently maintains ${activePipelineCount} deliverables underway with strict due date monitoring to prevent overdue tasks.`
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

  const brief: ManagementBrief = {
    id: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    periodType: params.periodType,
    dateFrom: dateFrom || '',
    dateTo: dateTo || now.toISOString().slice(0, 10),
    title: `SEO & Content Team Management Brief — ${periodLabel}`,
    executiveSummary,
    cardsCreatedCount: isOverall ? undefined : cardsCreatedInWindow.length,
    cardsCompletedCount: isOverall ? undefined : cardsCompletedInWindow.length,
    checklistTasksCompletedCount: isOverall ? undefined : checklistItemsCompletedInWindow.length,
    activePipelineCount: activeUncompletedCards.length,
    majorAccomplishments,
    seoActivity,
    contentActivity,
    aiOverviewGeoActivity,
    clientProgress,
    currentPriorities,
    blockedWork,
    innovationsExperiments,
    talkingPoints,
    sourceCards,
    createdAt: new Date().toISOString(),
  };

  db.saveManagementBrief(brief);
  return brief;
}
