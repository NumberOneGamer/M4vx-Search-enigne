export interface ParsedQuery {
  cleanQuery: string;
  exactPhrases: string[];
  siteFilter: string | null;
  fileTypeFilter: string | null;
  excludeTerms: string[];
  dateAfter: string | null;
  dateBefore: string | null;
  datePreset: 'today' | 'week' | 'month' | null;
}

const SUPPORTED_EXTS = ['pdf', 'docx', 'xlsx', 'pptx', 'txt'] as const;

const DATE_PRESETS: Record<string, string> = {
  today: 'today',
  week: 'week',
  month: 'month',
};

export function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    cleanQuery: '',
    exactPhrases: [],
    siteFilter: null,
    fileTypeFilter: null,
    excludeTerms: [],
    dateAfter: null,
    dateBefore: null,
    datePreset: null,
  };

  let input = raw.trim();
  if (!input) return result;

  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] === '"') {
      const end = input.indexOf('"', i + 1);
      if (end === -1) {
        tokens.push(input.slice(i + 1));
        break;
      }
      const phrase = input.slice(i + 1, end);
      if (phrase) result.exactPhrases.push(phrase);
      tokens.push(`"${phrase}"`);
      i = end + 1;
    } else if (input[i] === '-' && i + 1 < input.length && input[i + 1] !== ' ') {
      const start = i + 1;
      let end = start;
      while (end < input.length && input[end] !== ' ') end++;
      const term = input.slice(start, end);
      if (term) result.excludeTerms.push(term.toLowerCase());
      i = end;
    } else if (input[i] === ' ') {
      i++;
    } else {
      let start = i;
      while (i < input.length && input[i] !== ' ') i++;
      tokens.push(input.slice(start, i));
    }
  }

  const filteredTokens: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('"')) {
      filteredTokens.push(token);
      continue;
    }

    const siteMatch = token.match(/^site:([^\s]+)/i);
    if (siteMatch) {
      result.siteFilter = siteMatch[1].toLowerCase();
      continue;
    }

    const ftMatch = token.match(/^filetype:([^\s]+)/i);
    if (ftMatch) {
      const ext = ftMatch[1].toLowerCase();
      if ((SUPPORTED_EXTS as readonly string[]).includes(ext)) {
        result.fileTypeFilter = ext;
      }
      continue;
    }

    const afterMatch = token.match(/^after:(\d{4}-\d{2}-\d{2})/i);
    if (afterMatch) {
      result.dateAfter = afterMatch[1];
      continue;
    }

    const beforeMatch = token.match(/^before:(\d{4}-\d{2}-\d{2})/i);
    if (beforeMatch) {
      result.dateBefore = beforeMatch[1];
      continue;
    }

    const presetLower = token.toLowerCase();
    if (presetLower in DATE_PRESETS) {
      result.datePreset = presetLower as ParsedQuery['datePreset'];
      continue;
    }

    if (result.excludeTerms.includes(token.toLowerCase())) {
      continue;
    }

    filteredTokens.push(token);
  }

  result.cleanQuery = filteredTokens.join(' ').trim();
  return result;
}

export function buildDateCondition(preset: 'today' | 'week' | 'month' | null): { after: string | null; before: string | null } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'today': {
      return { after: today, before: today };
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { after: weekAgo.toISOString().slice(0, 10), before: today };
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { after: monthAgo.toISOString().slice(0, 10), before: today };
    }
    default:
      return { after: null, before: null };
  }
}
