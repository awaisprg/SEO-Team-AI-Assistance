/**
 * Team member profile definition and resolution for Trello queries.
 * Bridges disparities between Trello usernames (e.g. 'aahmad10287'),
 * first names (e.g. 'Azeem'), list names (e.g. 'Azeem Ahmad'), and full names.
 */

export interface TeamMemberProfile {
  canonicalName: string;
  firstName: string;
  aliases: string[];
  memberIds: string[];
  associatedLists: string[];
}

export const KNOWN_TEAM_PROFILES: TeamMemberProfile[] = [
  {
    canonicalName: 'Azeem Ahmad',
    firstName: 'Azeem',
    aliases: [
      'azeem',
      'azeem ahmad',
      'aahmad',
      'aahmad10287',
      'aahmad102871',
      'azeem-sep',
      'azeem june',
    ],
    memberIds: ['6a3318691ffb7d5225b5effc'],
    associatedLists: ['Azeem Ahmad', 'Azeem'],
  },
  {
    canonicalName: 'Muhammad Haseeb Afzal',
    firstName: 'Haseeb',
    aliases: [
      'haseeb',
      'haseeb afzal',
      'muhammad haseeb afzal',
      'muhammadhaseebafzal',
      'm haseeb',
    ],
    memberIds: ['68a882e6e7e220ed4b018f48'],
    associatedLists: ['Haseeb Afzal', 'Haseeb'],
  },
  {
    canonicalName: 'Adil Rehman',
    firstName: 'Adil',
    aliases: ['adil', 'adil rehman', 'adilrehman', 'adilrehman22'],
    memberIds: ['68122340643ead58aa486ac9'],
    associatedLists: ['Adil', 'Adil Rehman'],
  },
  {
    canonicalName: 'Ali Hamza',
    firstName: 'Hamza',
    aliases: [
      'ali hamza',
      'hamza',
      'ahmad hamza',
      'ali hamza ii',
      'alihamza',
      'alihamza15',
      'alihamza332',
    ],
    memberIds: ['6a1f3355a8c7c9545ec15377', '681223d28edfd71e405acf49'],
    associatedLists: ['Ali Hamza', 'Ahmad Hamza', 'Ali Hamza II'],
  },
  {
    canonicalName: 'Humna Qayyum',
    firstName: 'Humna',
    aliases: ['humna', 'humna qayyum', 'humnaqayyum'],
    memberIds: ['6a3403651596887b9042cf0f'],
    associatedLists: ['Humna Qayyum', 'Humna'],
  },
  {
    canonicalName: 'Awais Yaseen',
    firstName: 'Awais',
    aliases: ['awais', 'awais yaseen', 'awais7475', 'awais7083', 'awais7083@prgmd.com'],
    memberIds: ['66d774eecf1ee957d3018997', '66b0d9435e4e6f4d406b2259'],
    associatedLists: ['Awais'],
  },
  {
    canonicalName: 'Malik (Ahsan Bilal)',
    firstName: 'Malik',
    aliases: ['malik', 'ahsan', 'ahsan bilal', 'ahsan_bilal'],
    memberIds: ['61ba5a57e5374a1e4f6e0b41'],
    associatedLists: ['Malik', 'Ahsan Bilal'],
  },
];

/**
 * Dynamically resolves a team member profile from a natural language query,
 * matching first name, full name, username, or alias.
 */
export function resolveTeamMember(
  question: string,
  knownMembers: { id?: string; fullName: string; username?: string }[] = [],
  knownLists: { id: string; name: string }[] = []
): TeamMemberProfile | null {
  const q = question.toLowerCase().trim();

  // 1. Check statically verified profiles first (handles username disparities like aahmad10287)
  for (const profile of KNOWN_TEAM_PROFILES) {
    // Check aliases with boundary check
    for (const alias of profile.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(q) || q.includes(alias)) {
        // Augment with any runtime known list matches
        const lists = new Set(profile.associatedLists);
        for (const l of knownLists) {
          if (profile.aliases.some((a) => l.name.toLowerCase().includes(a))) {
            lists.add(l.name);
          }
        }
        return {
          ...profile,
          associatedLists: Array.from(lists),
        };
      }
    }
  }

  // 2. Check dynamic members from live board
  for (const m of knownMembers) {
    const fn = (m.fullName || '').toLowerCase().trim();
    const un = (m.username || '').toLowerCase().trim();
    const parts = fn.split(/\s+/).filter((p) => p.length >= 3);

    const isMatch =
      (fn && (q.includes(fn) || new RegExp(`\\b${fn}\\b`, 'i').test(q))) ||
      (un && (q.includes(un) || new RegExp(`\\b${un}\\b`, 'i').test(q))) ||
      parts.some((part) => new RegExp(`\\b${part}\\b`, 'i').test(q));

    if (isMatch) {
      const associatedLists = knownLists
        .filter((l) => l.name.toLowerCase().includes(fn) || parts.some((p) => l.name.toLowerCase().includes(p)))
        .map((l) => l.name);

      return {
        canonicalName: m.fullName,
        firstName: parts[0] || m.fullName,
        aliases: [fn, un, ...parts].filter(Boolean),
        memberIds: m.id ? [m.id] : [],
        associatedLists,
      };
    }
  }

  return null;
}
