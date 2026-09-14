/**
 * Trello REST API Client
 * Secure server-side interface for Trello data retrieval.
 * Conforms to official Atlassian Trello REST API specifications.
 */

export interface TrelloApiCredentials {
  apiKey: string;
  token: string;
}

export interface TrelloMemberProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  email?: string;
}

export interface TrelloBoardSummary {
  id: string;
  name: string;
  url: string;
  closed: boolean;
  desc?: string;
}

export class TrelloClient {
  private apiKey: string;
  private token: string;
  private baseUrl = 'https://api.trello.com/1';

  constructor(creds: TrelloApiCredentials) {
    this.apiKey = creds.apiKey.trim();
    this.token = creds.token.trim();
  }

  private buildUrl(endpoint: string, params: Record<string, string | number | boolean> = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('token', this.token);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private sanitizeErrorMessage(msg: string): string {
    let sanitized = msg;
    if (this.apiKey) {
      sanitized = sanitized.split(this.apiKey).join('[REDACTED_KEY]');
    }
    if (this.token) {
      sanitized = sanitized.split(this.token).join('[REDACTED_TOKEN]');
    }
    return sanitized;
  }

  private async fetchTrello<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    retries = 3
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SEO-Content-Team-Intelligence/2.0',
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Unauthorized: Invalid Trello API Key or Member Token.');
          }

          if (res.status === 429) {
            if (attempt < retries) {
              const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
              const delay = Math.max(1000 * Math.pow(2, attempt), retryAfter * 1000);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error('Trello API Rate Limit Exceeded (429). Please retry in a few moments.');
          }

          const rawText = await res.text().catch(() => '');
          const cleanText = this.sanitizeErrorMessage(rawText);
          throw new Error(`Trello API Error (${res.status}): ${cleanText || res.statusText}`);
        }

        return (await res.json()) as T;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          if (attempt < retries) {
            continue;
          }
          throw new Error('Trello API request timed out after 20 seconds.');
        }
        if (attempt >= retries || err.message.includes('Unauthorized') || err.message.includes('Rate Limit')) {
          throw new Error(this.sanitizeErrorMessage(err.message || 'Trello request failed'));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Trello API request failed after maximum retries.');
  }

  // 1. getCurrentMember()
  async getCurrentMember(): Promise<TrelloMemberProfile> {
    const data = await this.fetchTrello<any>('/members/me', {
      fields: 'id,username,fullName,avatarUrl,email',
    });
    return {
      id: data.id,
      username: data.username,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      email: data.email,
    };
  }

  // Connection test
  async testConnection(): Promise<{ success: boolean; username?: string; fullName?: string; boardsCount?: number; error?: string }> {
    try {
      const member = await this.getCurrentMember();
      const boards = await this.getBoards();
      return {
        success: true,
        username: member.username,
        fullName: member.fullName,
        boardsCount: boards.length,
      };
    } catch (err: any) {
      return { success: false, error: this.sanitizeErrorMessage(err.message || 'Connection failed') };
    }
  }

  // 2. getBoards()
  async getBoards(): Promise<TrelloBoardSummary[]> {
    return this.fetchTrello<TrelloBoardSummary[]>('/members/me/boards', {
      filter: 'open',
      fields: 'id,name,url,closed,desc',
    });
  }

  // 3. getBoard(boardId)
  async getBoard(boardId: string): Promise<TrelloBoardSummary> {
    return this.fetchTrello<TrelloBoardSummary>(`/boards/${boardId}`, {
      fields: 'id,name,url,closed,desc',
    });
  }

  // 4. getLists(boardId)
  async getLists(boardId: string): Promise<{ id: string; name: string; closed: boolean; pos: number }[]> {
    return this.fetchTrello(`/boards/${boardId}/lists`, {
      filter: 'all',
      fields: 'id,name,closed,pos',
    });
  }

  // 5. getCards(boardId/listId)
  async getCards(targetId: string, isList = false): Promise<any[]> {
    const endpoint = isList ? `/lists/${targetId}/cards` : `/boards/${targetId}/cards`;
    return this.fetchTrello(endpoint, {
      filter: 'all',
      fields: 'id,idBoard,idList,name,desc,url,due,dateLastActivity,closed,idLabels,idMembers',
    });
  }

  // 6. getCard(cardId)
  async getCard(cardId: string): Promise<any> {
    return this.fetchTrello(`/cards/${cardId}`, {
      fields: 'id,idBoard,idList,name,desc,url,due,dateLastActivity,closed,idLabels,idMembers',
    });
  }

  // 7. getCardMembers(cardId)
  async getCardMembers(cardId: string): Promise<{ id: string; fullName: string; username: string }[]> {
    return this.fetchTrello(`/cards/${cardId}/members`, {
      fields: 'id,fullName,username',
    });
  }

  // 8. getCardLabels(cardId)
  async getCardLabels(cardId: string): Promise<{ id: string; name: string; color: string }[]> {
    return this.fetchTrello(`/cards/${cardId}/labels`, {
      fields: 'id,name,color',
    });
  }

  // 9. getChecklists(cardId)
  async getChecklists(cardId: string): Promise<any[]> {
    return this.fetchTrello(`/cards/${cardId}/checklists`);
  }

  // 10. getChecklistItems(checklistId)
  async getChecklistItems(checklistId: string): Promise<any[]> {
    return this.fetchTrello(`/checklists/${checklistId}/checkItems`);
  }

  // 11. getCardComments(cardId)
  async getCardComments(cardId: string): Promise<any[]> {
    return this.fetchTrello(`/cards/${cardId}/actions`, {
      filter: 'commentCard',
      limit: 50,
    });
  }

  // 12. getCardActions(cardId)
  async getCardActions(cardId: string): Promise<any[]> {
    return this.fetchTrello(`/cards/${cardId}/actions`, {
      filter: 'commentCard,updateCard:idList,updateCheckItemStateOnCard',
      limit: 50,
    });
  }

  // 13. getCardAttachments(cardId)
  async getCardAttachments(cardId: string): Promise<any[]> {
    return this.fetchTrello(`/cards/${cardId}/attachments`, {
      fields: 'id,name,url,mimeType,date',
    });
  }

  // 14. getBoardActions(boardId, limit, since)
  // Official Atlassian recommended pattern to avoid API_TOO_MANY_CARDS_REQUESTED (403)
  async getBoardActions(boardId: string, limit = 1000, since?: string): Promise<any[]> {
    const params: Record<string, string | number | boolean> = {
      filter: 'commentCard,updateCard:idList,updateCheckItemStateOnCard',
      limit: Math.min(limit, 1000),
      fields: 'id,idMemberCreator,data,type,date,memberCreator',
    };
    if (since) {
      params.since = since;
    }
    try {
      return await this.fetchTrello<any[]>(`/boards/${boardId}/actions`, params);
    } catch (err: any) {
      console.warn('Failed to fetch board actions (proceeding without board actions):', err.message);
      return [];
    }
  }

  // Board-level checklists (returns all checklists with their checkItems in a single call)
  async getBoardChecklists(boardId: string): Promise<any[]> {
    try {
      return await this.fetchTrello<any[]>(`/boards/${boardId}/checklists`);
    } catch (err: any) {
      console.warn('Failed to fetch board checklists (proceeding without board checklists):', err.message);
      return [];
    }
  }

  // Board-level members
  async getMembers(boardId: string): Promise<{ id: string; fullName: string; username: string; avatarUrl?: string }[]> {
    return this.fetchTrello(`/boards/${boardId}/members`, {
      fields: 'id,fullName,username,avatarUrl',
    });
  }

  // Board-level labels
  async getLabels(boardId: string): Promise<{ id: string; name: string; color: string }[]> {
    return this.fetchTrello(`/boards/${boardId}/labels`, {
      fields: 'id,name,color',
    });
  }

  // Comprehensive details query for full or incremental board sync
  // Note: NEVER pass `actions` in /boards/{id}/cards! Trello restricts nested action expansion
  // on boards with >50-100 cards, returning 403 API_TOO_MANY_CARDS_REQUESTED.
  // Instead, we fetch cards and board actions via /boards/{id}/actions separately and merge them.
  async getCardsWithDetails(boardId: string, since?: string): Promise<any[]> {
    const cardParams: Record<string, string | number | boolean> = {
      filter: 'all',
      checklists: 'all',
      attachments: 'true',
      attachment_fields: 'id,name,url,mimeType,date',
      fields: 'id,idBoard,idList,name,desc,url,due,dateLastActivity,closed,idLabels,idMembers,labels',
    };

    if (since) {
      cardParams.since = since;
    }

    // 1. Fetch cards and board actions concurrently without overloading the cards endpoint
    const [rawCards, boardActions] = await Promise.all([
      this.fetchTrello<any[]>(`/boards/${boardId}/cards`, cardParams).catch(async (cardErr: any) => {
        // Fallback for gigantic boards if attachments or checklists ever hit memory or payload limits
        if (cardErr.message?.includes('TOO_MANY') || cardErr.message?.includes('403')) {
          console.warn('Retrying /cards with minimal core fields due to board size limit:', cardErr.message);
          return await this.fetchTrello<any[]>(`/boards/${boardId}/cards`, {
            filter: 'all',
            fields: 'id,idBoard,idList,name,desc,url,due,dateLastActivity,closed,idLabels,idMembers,labels',
          });
        }
        throw cardErr;
      }),
      this.getBoardActions(boardId, 1000, since),
    ]);

    // 2. Group board actions by card ID
    const actionsByCardId = new Map<string, any[]>();
    for (const action of boardActions || []) {
      const cardId = action.data?.card?.id;
      if (cardId) {
        let list = actionsByCardId.get(cardId);
        if (!list) {
          list = [];
          actionsByCardId.set(cardId, list);
        }
        list.push(action);
      }
    }

    // 3. Attach mapped actions to each card
    for (const card of rawCards || []) {
      card.actions = actionsByCardId.get(card.id) || [];
    }

    return rawCards || [];
  }
}
