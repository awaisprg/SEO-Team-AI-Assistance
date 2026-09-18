import { TrelloCard, ChatSource } from '../../src/types';
import { db } from '../db/store';
import { QueryIntent } from './intent';
import { getLocalEmbedding, cosineSimilarity } from './provider';

export interface ScoredCard {
  card: TrelloCard;
  relevance: number; // 0 to 100
  reason: string;
  matchType: 'exact' | 'semantic' | 'checklist' | 'comment' | 'activity';
  snippet?: string;
  matchedPerson?: string;
  matchedClient?: string;
}

export function hybridRetrieve(intent: QueryIntent, threshold = 35): ScoredCard[] {
  const allCards = db.getCards();
  const questionTokens = intent.rawQuestion
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const queryEmbedding = getLocalEmbedding(intent.rawQuestion);
  const scored: ScoredCard[] = [];
  const effectiveThreshold = (intent.targetList || intent.intent === 'list_analysis' || intent.isBoardAnalysis || intent.person) ? 15 : threshold;

  for (const card of allCards) {
    let score = 0;
    const reasons: string[] = [];
    let matchType: ScoredCard['matchType'] = 'exact';
    let snippet: string | undefined;

    const cardTitleLower = card.name.toLowerCase();
    const cardDescLower = card.desc.toLowerCase();
    const listNameLower = card.listName.toLowerCase();

    // 0. Target List Filter / Boost (Highest Priority when querying a specific list like "In Process")
    if (intent.targetList) {
      const targetLower = intent.targetList.toLowerCase();
      const isDirectListMatch =
        listNameLower === targetLower ||
        listNameLower.includes(targetLower) ||
        targetLower.includes(listNameLower);

      if (isDirectListMatch) {
        score += 75;
        reasons.push(`Card located in target list "${card.listName}"`);
        matchType = 'exact';
      } else if (intent.intent === 'list_analysis') {
        score -= 60;
      }
    } else if (questionTokens.some((t) => t.length >= 4 && listNameLower.includes(t))) {
      score += 35;
      reasons.push(`List "${card.listName}" matches query keywords`);
    }

    // 0b. Board Analysis Boost
    if (intent.isBoardAnalysis) {
      if (card.isUnderProgress) {
        score += 45;
        reasons.push(`Active deliverable in list "${card.listName}"`);
      } else {
        score += 15;
      }
      if (card.comments && card.comments.length > 0) {
        score += 10;
      }
      if (card.desc && card.desc.trim().length > 10) {
        score += 10;
      }
    }

    // 1. Client filter / boost
    if (intent.client) {
      const isClientMatch =
        card.clientCanonical?.toLowerCase() === intent.client.toLowerCase() ||
        cardTitleLower.includes(intent.client.toLowerCase());
      if (isClientMatch) {
        score += 45;
        reasons.push(`Direct client match for ${intent.client}`);
      } else {
        score -= 50;
      }
    }

    // 2. Person filter / boost
    if (intent.person) {
      const p = intent.person.toLowerCase();
      const aliases = (intent.personAliases || [p, p.split(' ')[0]]).map((a) => a.toLowerCase());
      const memberIds = new Set(intent.personMemberIds || []);
      const lists = (intent.personLists || []).map((l) => l.toLowerCase());

      const isAssigned = card.members.some((m) => {
        if (memberIds.has(m.id)) return true;
        const mfn = (m.fullName || '').toLowerCase();
        const mun = (m.username || '').toLowerCase();
        return aliases.some((a) => mfn.includes(a) || mun.includes(a) || a.includes(mfn) || a.includes(mun));
      });

      const isPersonList =
        lists.some((l) => listNameLower.includes(l) || l.includes(listNameLower)) ||
        aliases.some((a) => listNameLower.includes(a));

      const isTitleMatch = aliases.some((a) => cardTitleLower.includes(a));

      const hasCompletedActivity = card.activities.some((a) => {
        const ap = (a.person || '').toLowerCase();
        return aliases.some((al) => ap.includes(al) || al.includes(ap));
      });

      const hasCommented = card.comments.some((c) => {
        const can = (c.authorName || '').toLowerCase();
        return aliases.some((al) => can.includes(al) || al.includes(can));
      });

      const mentionsInChecklist = card.checklists.some((cl) => {
        const clName = cl.name.toLowerCase();
        if (aliases.some((a) => clName.includes(a))) return true;
        return cl.items.some((it) => {
          const itName = it.name.toLowerCase();
          const itBy = (it.completedBy || '').toLowerCase();
          return aliases.some((a) => itName.includes(a) || itBy.includes(a));
        });
      });

      const mentionsInDesc = aliases.some((a) => a.length >= 4 && cardDescLower.includes(a));

      const isPersonMatch =
        isAssigned ||
        isPersonList ||
        isTitleMatch ||
        hasCompletedActivity ||
        hasCommented ||
        mentionsInChecklist ||
        mentionsInDesc;

      if (isPersonMatch) {
        score += 65;
        reasons.push(`Direct work match for ${intent.person}`);

        // Direct member ID or designated personal list priority
        const hasDirectMemberId = card.members.some((m) => memberIds.has(m.id) || m.username === 'aahmad102871' || m.fullName === 'aahmad10287');
        if (hasDirectMemberId || isPersonList) {
          score += 35;
          reasons.push(`Direct member or dedicated list match`);
        }

        // Disambiguation: avoid mixing distinct colleagues (e.g. Shahid Azeem when asking about Azeem)
        if (!questionTokens.includes('shahid') && cardTitleLower.includes('shahid')) {
          score -= 30;
        }

        if (card.isUnderProgress || card.statusSemantic === 'In Process' || card.statusSemantic === 'In Review') {
          score += 20;
          reasons.push(`Active deliverable in list "${card.listName}"`);
        }
        if (isAssigned) matchType = 'exact';
        else if (isPersonList) matchType = 'exact';
        else if (hasCommented) matchType = 'comment';
        else if (mentionsInChecklist) matchType = 'checklist';
        else if (hasCompletedActivity) {
          const act = card.activities.find((a) => {
            const ap = (a.person || '').toLowerCase();
            return aliases.some((al) => ap.includes(al) || al.includes(ap));
          });
          matchType = 'activity';
          snippet = act?.details;
        }
      } else if (!intent.isBoardAnalysis && !intent.targetList) {
        score -= 40;
      }
    }

    // 3. Status filter
    if (intent.status && intent.status !== 'all' && !intent.targetList && !intent.isBoardAnalysis) {
      if (card.statusSemantic === intent.status) {
        score += 20;
        reasons.push(`Status is ${card.statusSemantic}`);
      } else if (intent.status === 'Completed' && card.statusSemantic !== 'Completed') {
        score -= 30;
      } else if (intent.status === 'In Process' && card.statusSemantic !== 'In Process') {
        score -= 20;
      }
    }

    // 4. Topic & Keyword Matching
    let keywordHits = 0;
    for (const token of questionTokens) {
      if (cardTitleLower.includes(token)) {
        keywordHits += 3;
      } else if (cardDescLower.includes(token)) {
        keywordHits += 2;
        if (!snippet) {
          snippet = `Description: ${card.desc.slice(0, 140)}...`;
        }
      }
    }

    // Check checklist items for keyword hits
    for (const cl of card.checklists) {
      for (const item of cl.items) {
        const itemLower = item.name.toLowerCase();
        for (const token of questionTokens) {
          if (itemLower.includes(token)) {
            keywordHits += 2;
            if (!snippet) {
              matchType = 'checklist';
              snippet = `Checklist item: "${item.name}" (${item.state})`;
            }
          }
        }
      }
    }

    // Check comments for keyword hits
    for (const comm of card.comments) {
      const commLower = comm.text.toLowerCase();
      for (const token of questionTokens) {
        if (commLower.includes(token)) {
          keywordHits += 2.5;
          if (!snippet) {
            matchType = 'comment';
            snippet = `Comment by ${comm.authorName}: "${comm.text.slice(0, 120)}"`;
          }
        }
      }
    }

    // Check activities for keyword hits
    for (const act of card.activities) {
      const actLower = `${act.details || ''} ${act.activityType} ${act.action}`.toLowerCase();
      for (const token of questionTokens) {
        if (actLower.includes(token)) {
          keywordHits += 2;
          if (!snippet) {
            matchType = 'activity';
            snippet = `Activity: ${act.details}`;
          }
        }
      }
    }

    score += Math.min(keywordHits * 4, 40);

    // Default snippet if still empty
    if (!snippet) {
      if (card.desc && card.desc.trim().length > 0) {
        snippet = card.desc.slice(0, 140);
      } else if (card.comments && card.comments.length > 0) {
        snippet = `Comment: "${card.comments[0].text.slice(0, 120)}" (${card.comments[0].authorName})`;
      } else if (card.checklists && card.checklists.length > 0) {
        const totalItems = card.checklists.reduce((sum, cl) => sum + cl.items.length, 0);
        const doneItems = card.checklists.reduce((sum, cl) => sum + cl.items.filter((i) => i.state === 'complete').length, 0);
        snippet = `Checklist progress: ${doneItems}/${totalItems} tasks completed`;
      }
    }

    // 5. Special AI / AI Overview / GEO boost
    if (intent.isAiRelated) {
      const hasAiLabel = card.labels.some((l) =>
        l.name.toLowerCase().includes('ai') || l.name.toLowerCase().includes('geo')
      );
      const mentionsAi =
        cardTitleLower.includes('ai overview') ||
        cardTitleLower.includes('geo') ||
        cardTitleLower.includes('ai search') ||
        cardTitleLower.includes('claude') ||
        cardTitleLower.includes('chatgpt') ||
        cardTitleLower.includes('automation') ||
        cardDescLower.includes('ai overview') ||
        cardDescLower.includes('generative');

      if (cardTitleLower.includes('ai overview') && intent.rawQuestion.toLowerCase().includes('ai overview')) {
        score += 45;
        reasons.push('Direct match on AI Overview initiative');
      } else if (hasAiLabel || mentionsAi) {
        score += 35;
        reasons.push('Relevant to AI/GEO initiative');
      } else if (!intent.client && !intent.person && !intent.isBoardAnalysis) {
        score -= 30;
      }
    }

    // 6. Semantic Cosine Similarity
    const cardFullText = `${card.name} ${card.desc} ${card.listName} ${card.labels.map((l) => l.name).join(' ')} ${card.comments.map((cm) => cm.text).join(' ')}`;
    const cardEmb = getLocalEmbedding(cardFullText);
    const sim = cosineSimilarity(queryEmbedding, cardEmb);
    score += Math.round(sim * 25);

    // 7. Overall Summary filtering
    if (intent.isOverall) {
      if (card.isUnderProgress) {
        score += 45;
        reasons.push('Active deliverable under progress');
      } else {
        score -= 60;
      }
    }

    // 8. Date Filtering (Strictly Created or Completed in Window)
    if (intent.dateFrom && intent.dateTo && !intent.targetList && !intent.isBoardAnalysis) {
      const from = intent.dateFrom;
      const to = intent.dateTo;

      const isCreatedInWindow = Boolean(card.createdAt && card.createdAt >= from && card.createdAt <= to);
      const isCompletedInWindow = Boolean(
        (card.isCompleted || card.statusSemantic === 'Completed') &&
        card.completedAt &&
        card.completedAt >= from &&
        card.completedAt <= to
      );
      const hasChecklistCompletedInWindow = card.checklists.some((cl) =>
        cl.items.some((it) => it.completedAt && it.completedAt >= from && it.completedAt <= to)
      );

      if (isCreatedInWindow || isCompletedInWindow || hasChecklistCompletedInWindow) {
        score += 55;
        if (isCompletedInWindow) {
          reasons.push(`Card marked complete in ${intent.timeRangeDescription || 'period'}`);
        } else if (isCreatedInWindow) {
          reasons.push(`Card created in ${intent.timeRangeDescription || 'period'}`);
        } else {
          reasons.push(`Checklist tasks completed in ${intent.timeRangeDescription || 'period'}`);
        }
      } else {
        score -= 60;
      }
    }

    // Cap score at 0 - 99
    const finalScore = Math.min(99, Math.max(0, Math.round(score)));

    if (finalScore >= effectiveThreshold) {
      scored.push({
        card,
        relevance: finalScore,
        reason: reasons.join('; ') || 'Keywords and semantic relevance match',
        matchType,
        snippet: snippet || (card.desc ? card.desc.slice(0, 140) + '...' : undefined),
        matchedClient: card.clientCanonical,
        matchedPerson: intent.person,
      });
    }
  }

  // If board-wide analysis was requested, balance cards across all active lists
  if (intent.isBoardAnalysis) {
    const listMap = new Map<string, ScoredCard[]>();
    for (const sc of scored) {
      const lName = sc.card.listName || 'Other';
      let lCards = listMap.get(lName);
      if (!lCards) {
        lCards = [];
        listMap.set(lName, lCards);
      }
      lCards.push(sc);
    }

    const balanced: ScoredCard[] = [];
    // Prioritize operational lists first
    const priorityLists = ['In Process', 'Haseeb Afzal', 'Adil', 'In Review', 'To Do Clients', 'To Do GFM/PDS', 'Ali Hamza II', 'Azeem Ahmad', 'Humna Qayyum', 'Ad Hoc Tasks', 'GFM Clients', 'PDS Resources'];
    const orderedListNames = [
      ...priorityLists.filter((pl) => listMap.has(pl)),
      ...Array.from(listMap.keys()).filter((k) => !priorityLists.includes(k)),
    ];

    for (const lName of orderedListNames) {
      const cardsInList = listMap.get(lName) || [];
      cardsInList.sort((a, b) => b.relevance - a.relevance);
      // Include top cards from each list (all cards if list has <= 8 cards)
      balanced.push(...cardsInList.slice(0, 8));
    }

    return balanced;
  }

  // Sort descending by relevance
  return scored.sort((a, b) => b.relevance - a.relevance);
}

export function formatSources(scoredCards: ScoredCard[]): ChatSource[] {
  return scoredCards.map((item) => ({
    cardId: item.card.id,
    title: item.card.name,
    url: item.card.url,
    relevance: item.relevance,
    reason: item.reason,
    date: item.card.dateLastActivity,
    client: item.card.clientCanonical,
    status: item.card.statusSemantic,
    listName: item.card.listName,
    matchType: item.matchType,
    snippet: item.snippet,
  }));
}
