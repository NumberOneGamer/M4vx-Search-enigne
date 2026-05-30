const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'by', 'with', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it',
  'its', 'it\'s', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he',
  'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'about', 'above', 'after',
  'again', 'against', 'below', 'between', 'during', 'before', 'behind',
  'here', 'there', 'into', 'through', 'under', 'up', 'down', 'out',
  'off', 'over', 'then', 'once', 'because', 'until', 'while', 'if',
  'else', 'since', 'like', 'also', 'get', 'got', 'one', 'two', 'any',
]);

const STEMMER_OVERRIDES: Record<string, string> = {
  running: 'run',
  runs: 'run',
  ran: 'run',
  swimming: 'swim',
  swimmingly: 'swim',
  bigger: 'big',
  biggest: 'big',
  better: 'good',
  best: 'good',
  worse: 'bad',
  worst: 'bad',
  lying: 'lie',
  lyingly: 'lie',
  began: 'begin',
  begun: 'begin',
  beginning: 'begin',
  broke: 'break',
  broken: 'break',
  breaking: 'break',
  brought: 'bring',
  bringing: 'bring',
  buying: 'buy',
  bought: 'buy',
  catching: 'catch',
  caught: 'catch',
  chosen: 'choose',
  chose: 'choose',
  choosing: 'choose',
  coming: 'come',
  came: 'come',
  doing: 'do',
  done: 'do',
  did: 'do',
  drawing: 'draw',
  drew: 'draw',
  drawn: 'draw',
  drinking: 'drink',
  drank: 'drink',
  drunk: 'drink',
  driving: 'drive',
  drove: 'drive',
  driven: 'drive',
  eating: 'eat',
  ate: 'eat',
  eaten: 'eat',
  falling: 'fall',
  fell: 'fall',
  fallen: 'fall',
  feeling: 'feel',
  felt: 'feel',
  fighting: 'fight',
  fought: 'fight',
  finding: 'find',
  found: 'find',
  flying: 'fly',
  flew: 'fly',
  flown: 'fly',
  forgetting: 'forget',
  forgot: 'forget',
  forgotten: 'forget',
  giving: 'give',
  gave: 'give',
  given: 'give',
  going: 'go',
  went: 'go',
  gone: 'go',
  growing: 'grow',
  grew: 'grow',
  grown: 'grow',
  hanging: 'hang',
  hung: 'hang',
  having: 'have',
  had: 'have',
  hearing: 'hear',
  heard: 'hear',
  hiding: 'hide',
  hid: 'hide',
  hidden: 'hide',
  holding: 'hold',
  held: 'hold',
  keeping: 'keep',
  kept: 'keep',
  knowing: 'know',
  knew: 'know',
  known: 'know',
  leading: 'lead',
  led: 'lead',
  leaving: 'leave',
  left: 'leave',
  lending: 'lend',
  lent: 'lend',
  lighting: 'light',
  lit: 'light',
  losing: 'lose',
  lost: 'lose',
  making: 'make',
  made: 'make',
  meaning: 'mean',
  meant: 'mean',
  meeting: 'meet',
  met: 'meet',
  paying: 'pay',
  paid: 'pay',
  putting: 'put',
  put: 'put',
  reading: 'read',
  read: 'read',
  riding: 'ride',
  rode: 'ride',
  ridden: 'ride',
  ringing: 'ring',
  rang: 'ring',
  rung: 'ring',
  rising: 'rise',
  rose: 'rise',
  risen: 'rise',
  run: 'run',
  saying: 'say',
  said: 'say',
  seeing: 'see',
  saw: 'see',
  seen: 'see',
  seeking: 'seek',
  sought: 'seek',
  selling: 'sell',
  sold: 'sell',
  sending: 'send',
  sent: 'send',
  setting: 'set',
  set: 'set',
  shaking: 'shake',
  shook: 'shake',
  shaken: 'shake',
  shining: 'shine',
  shone: 'shine',
  shooting: 'shoot',
  shot: 'shoot',
  showing: 'show',
  showed: 'show',
  shown: 'show',
  shutting: 'shut',
  shut: 'shut',
  singing: 'sing',
  sang: 'sing',
  sung: 'sing',
  sinking: 'sink',
  sank: 'sink',
  sunk: 'sink',
  sitting: 'sit',
  sat: 'sit',
  sleeping: 'sleep',
  slept: 'sleep',
  speaking: 'speak',
  spoke: 'speak',
  spoken: 'speak',
  spending: 'spend',
  spent: 'spend',
  standing: 'stand',
  stood: 'stand',
  stealing: 'steal',
  stole: 'steal',
  stolen: 'steal',
  sticking: 'stick',
  stuck: 'stick',
  striking: 'strike',
  struck: 'strike',
  swam: 'swim',
  swum: 'swim',
  taking: 'take',
  took: 'take',
  taken: 'take',
  teaching: 'teach',
  taught: 'teach',
  tearing: 'tear',
  tore: 'tear',
  torn: 'tear',
  telling: 'tell',
  told: 'tell',
  thinking: 'think',
  thought: 'think',
  throwing: 'throw',
  threw: 'throw',
  thrown: 'throw',
  understanding: 'understand',
  understood: 'understand',
  waking: 'wake',
  woke: 'wake',
  woken: 'wake',
  wearing: 'wear',
  wore: 'wear',
  worn: 'wear',
  winning: 'win',
  won: 'win',
  writing: 'write',
  wrote: 'write',
  written: 'write',
};

function simpleStemmer(word: string): string {
  if (STEMMER_OVERRIDES[word]) return STEMMER_OVERRIDES[word];

  let stem = word.toLowerCase();

  if (stem.length <= 3) return stem;

  if (stem.endsWith('ization') || stem.endsWith('isation')) {
    stem = stem.slice(0, -5) + 'ize';
  } else if (stem.endsWith('ically') || stem.endsWith('ically')) {
    stem = stem.slice(0, -5);
  } else if (stem.endsWith('ative')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('ness')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('ment')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('able')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('ible')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('tion') || stem.endsWith('sion')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ship')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('hood')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('less')) {
    stem = stem.slice(0, -4);
  } else if (stem.endsWith('ful')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ous')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ive')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ize') || stem.endsWith('ise')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ly')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('ing')) {
    stem = stem.slice(0, -3);
  } else if (stem.endsWith('ed')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('es')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('s') && !stem.endsWith('ss')) {
    stem = stem.slice(0, -1);
  }

  return stem;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function stem(token: string): string {
  return simpleStemmer(token);
}

export function tokenizeAndStem(text: string): string[] {
  return tokenize(text).map(stem);
}

export function extractKeywords(text: string, maxKeywords = 50): Map<string, number> {
  const tokens = tokenizeAndStem(text);
  const frequency = new Map<string, number>();

  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  const sorted = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords);

  return new Map(sorted);
}

export function calculateTfIdf(
  termFrequency: number,
  documentFrequency: number,
  totalDocuments: number
): number {
  if (documentFrequency === 0) return 0;
  const tf = 1 + Math.log10(termFrequency);
  const idf = Math.log10(totalDocuments / documentFrequency);
  return tf * idf;
}

export function tokenizeQuery(query: string): { tokens: string[]; operators: string[] } {
  const tokens: string[] = [];
  const operators: string[] = [];

  const parts = query.match(/(?:AND|OR|NOT)|"[^"]+"|'[^']+'|\S+/g) || [];

  for (const part of parts) {
    if (part === 'AND' || part === 'OR' || part === 'NOT') {
      operators.push(part);
    } else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      tokens.push(part.slice(1, -1));
    } else {
      tokens.push(part);
    }
  }

  return { tokens, operators };
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function fuzzyMatch(token: string, word: string, maxDistance = 2): boolean {
  if (Math.abs(token.length - word.length) > maxDistance) return false;
  return levenshteinDistance(token, word) <= maxDistance;
}
