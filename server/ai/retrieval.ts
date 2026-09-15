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
  const allActivities = db.getActivities();
  const questionTokens = intent.rawQuestion
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const queryEmbedding = getLocalEmbedding(intent.rawQuestion);
  const scored: ScoredCard[] = [];

  for (const card of allCards) {
    let score = 0;
    const reasons: string[] = [];
    let matchType: ScoredCard['matchType'] = 'exact';
    let snippet: string | undefined;

    const cardTitleLower = card.name.toLowerCase();
    const cardDescLower = card.desc.toLowerCase();
    const listNameLower = card.listName.toLowerCase();

    // 1. Client filter / boost
    if (intent.client) {
      const isClientMatch =
        card.clientCanonical?.toLowerCase() === intent.client.toLowerCase() ||
        cardTitleLower.includes(intent.client.toLowerCase());
      if (isClientMatch) {
        score += 45;
        reasons.push(`Direct client match for ${intent.client}`);
      } else {
        // If query specifically asked about a client and this card isn't that client, heavily penalize
        score -= 50;
      }
    }

    // 2. Person filter / boost
    if (intent.person) {
      const p = intent.person.toLowerCase();
      const isAssigned = card.members.some((m) => m.fullName.toLowerCase().includes(p));
      const hasCompletedActivity = card.activities.some((a) => a.person.toLowerCase().includes(p));
      const hasCommented = card.comments.some((c) => c.authorName.toLowerCase().includes(p));
      const isPersonList = listNameLower.includes(p);

      if (isAssigned || hasCompletedActivity || hasCommented || isPersonList) {
        score += 40;
        reasons.push(`Work associated with ${intent.person}`);
        if (hasCompletedActivity) {
          const act = card.activities.find((a) => a.person.toLowerCase().includes(p));
          matchType = 'activity';
          snippet = act?.details;
        }
      } else {
        score -= 40;
      }
    }

    // 3. Status filter
    if (intent.status && intent.status !== 'all') {
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
        keywordHits += 1.5;
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
          keywordHits += 2;
          if (!snippet) {
            matchType = 'comment';
            snippet = `Comment by ${comm.authorName}: "${comm.text}"`;
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
      } else if (!intent.client && !intent.person) {
        // Unrelated card during AI search
        score -= 30;
      }
    }

    // 6. Semantic Cosine Similarity
    const cardFullText = `${card.name} ${card.desc} ${card.labels.map((l) => l.name).join(' ')} ${card.checklists.flatMap((c) => c.items.map((i) => i.name)).join(' ')}`;
    const cardEmb = getLocalEmbedding(cardFullText);
    const sim = cosineSimilarity(queryEmbedding, cardEmb);
    score += Math.round(sim * 25);

    // 7. Overall Summary filtering
    if (intent.isOverall) {
      if (card.isUnderProgress) {
        score += 45;
        reasons.push('Active deliverable under progress');
      } else {
        score -= 60; // Penalize completed cards for overall active summary
      }
    }

    // 8. Date Filtering (Strictly Created or Completed in Window)
    if (intent.dateFrom && intent.dateTo) {
      const from = intent.dateFrom;
      const to = intent.dateTo;

      const isCreatedInWindow = card.createdAt >= from && card.createdAt <= to;
      const isCompletedInWindow = Boolean(
        card.completedAt &&
        card.completedAtVerified &&
        card.completedAt >= from &&
        card.completedAt <= to
      );
      const hasChecklistCompletedInWindow = card.checklists.some((cl) =>
        cl.items.some((it) => it.completedAt && it.completedAt >= from && it.completedAt <= to)
      );

      if (isCreatedInWindow || isCompletedInWindow || hasChecklistCompletedInWindow) {
        score += 45;
        if (isCompletedInWindow) {
          reasons.push(`Card marked complete in ${intent.timeRangeDescription || 'period'}`);
        } else if (isCreatedInWindow) {
          reasons.push(`Card created in ${intent.timeRangeDescription || 'period'}`);
        } else {
          reasons.push(`Checklist tasks completed in ${intent.timeRangeDescription || 'period'}`);
        }
      } else {
        // Exclude older completed or inactive cards that had no creation or completion in this window
        score -= 50;
      }
    }

    // Cap score at 0 - 99
    const finalScore = Math.min(99, Math.max(0, Math.round(score)));

    if (finalScore >= threshold) {
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
