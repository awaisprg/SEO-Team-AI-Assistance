/**
 * Trello REST API Client
 * Secure server-side interface for Trello data retrieval.
 */

export interface TrelloApiCredentials {
  apiKey: string;
  token: string;
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
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  private async fetchTrello<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SEO-Content-Team-Intelligence/1.0',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new Error('Invalid Trello API Key or Token (Unauthorized 401)');
        }
        if (res.status === 429) {
          throw new Error('Trello API Rate Limit Exceeded. Please retry in a few moments.');
        }
        throw new Error(`Trello API Error (${res.status}): ${errorText || res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Trello API request timed out after 15 seconds.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<{ success: boolean; username?: string; fullName?: string; error?: string }> {
    try {
      const member = await this.fetchTrello<{ id: string; username: string; fullName: string }>('/members/me', {
        fields: 'id,username,fullName',
      });
      return { success: true, username: member.username, fullName: member.fullName };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async getBoards(): Promise<{ id: string; name: string; url: string; closed: boolean }[]> {
    return this.fetchTrello('/members/me/boards', {
      filter: 'open',
      fields: 'id,name,url,closed',
    });
  }

  async getBoard(boardId: string): Promise<{ id: string; name: string; url: string; closed: boolean }> {
    return this.fetchTrello(`/boards/${boardId}`, {
      fields: 'id,name,url,closed',
    });
  }

  async getLists(boardId: string): Promise<{ id: string; name: string; closed: boolean; pos: number }[]> {
    return this.fetchTrello(`/boards/${boardId}/lists`, {
      filter: 'all',
      fields: 'id,name,closed,pos',
    });
  }

  async getMembers(boardId: string): Promise<{ id: string; fullName: string; username: string; avatarUrl?: string }[]> {
    return this.fetchTrello(`/boards/${boardId}/members`, {
      fields: 'id,fullName,username,avatarUrl',
    });
  }

  async getLabels(boardId: string): Promise<{ id: string; name: string; color: string }[]> {
    return this.fetchTrello(`/boards/${boardId}/labels`, {
      fields: 'id,name,color',
    });
  }

  async getCardsWithDetails(boardId: string): Promise<any[]> {
    // Trello cards with checklists, attachments, and actions (comments & movements)
    return this.fetchTrello(`/boards/${boardId}/cards`, {
      filter: 'all',
      checklists: 'all',
      attachments: 'true',
      attachment_fields: 'id,name,url,mimeType,date',
      actions: 'commentCard,updateCard:idList,updateCheckItemStateOnCard',
      actions_limit: 50,
      fields: 'id,idBoard,idList,name,desc,url,due,dateLastActivity,closed,idLabels,idMembers,labels',
    });
  }
}
