import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages'

export const TOOL_DEFINITIONS: BetaToolUnion[] = [
  {
    type: 'web_search_20250305',
    name: 'web_search',
  },
  {
    name: 'search_users',
    description:
      'Search the user profile database. Use this to find candidates by skills, role, location, company, or name. Pass `limit` to control exactly how many results to return.',
    input_schema: {
      type: 'object' as const,
      properties: {
        skills: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by skills (e.g. ["React", "TypeScript"]). Any single match is enough to include the result.',
        },
        role: {
          type: 'string',
          description:
            'Filter by job role (e.g. "Frontend Engineer", "Product Manager"). Partial, case-insensitive match.',
        },
        location: {
          type: 'string',
          description:
            'Filter by city or country (e.g. "Berlin", "Germany", "USA"). Partial, case-insensitive match.',
        },
        name: {
          type: 'string',
          description: 'Filter by person name. Partial, case-insensitive match.',
        },
        company: {
          type: 'string',
          description:
            'Filter by company name appearing in their work experience. Partial, case-insensitive match.',
        },
        limit: {
          type: 'integer',
          description:
            'Maximum number of profiles to return. Use this whenever the user specifies a count (e.g. "find 2 developers" → limit: 2). Defaults to 10.',
        },
      },
    },
  },
  {
    name: 'filter_candidates',
    description:
      'Show only a specific subset of the profiles currently displayed in the UI. Use this whenever the user asks to narrow down, keep only some, or remove profiles from the current view. The current profile IDs are listed in [Profiles shown in UI: ...] in the conversation. Do NOT use search_users just to filter existing results — use this tool instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description:
            'IDs of the profiles to keep, in the order you want them shown (e.g. ["usr_008", "usr_020"]).',
        },
      },
      required: ['ids'],
    },
  },
  {
    name: 'get_user',
    description:
      'Retrieve a single user profile by their ID (e.g. "usr_001"). Returns the full profile including CV, skills, work experience, and education.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The user ID, e.g. "usr_042"',
        },
      },
      required: ['id'],
    },
  },
]

export const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web\u2026',
  search_users: 'Searching user profiles\u2026',
  filter_candidates: 'Filtering profiles\u2026',
  get_user: 'Looking up profile\u2026',
}
