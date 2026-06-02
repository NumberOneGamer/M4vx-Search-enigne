const SCRIPT_RANGES: [number, number, string][] = [
  [0x4E00, 0x9FFF, 'zh'], [0x3400, 0x4DBF, 'zh'],
  [0x3040, 0x309F, 'ja'], [0x30A0, 0x30FF, 'ja'],
  [0xAC00, 0xD7AF, 'ko'],
  [0x0400, 0x04FF, 'ru'], [0x0500, 0x052F, 'ru'],
  [0x0600, 0x06FF, 'ar'], [0x0750, 0x077F, 'ar'],
  [0x0590, 0x05FF, 'he'],
  [0x0370, 0x03FF, 'el'],
  [0x0980, 0x09FF, 'bn'],
  [0x0900, 0x097F, 'hi'],
  [0x0E00, 0x0E7F, 'th'],
  [0x10A0, 0x10FF, 'ka'],
  [0x0400, 0x04FF, 'bg'],
];

const STOP_WORDS: Record<string, string[]> = {
  en: ['the','and','is','are','was','were','have','has','had','been','will','would','could','should','may','might','shall','can','not','this','that','with','for','from','but','all','some','any','about','into','than','also','its','these','those','very','just'],
  de: ['der','die','das','den','dem','des','ein','eine','einen','einem','eines','ist','sind','war','wird','werden','wurde','hat','haben','nicht','sich','auch','auf','mit','bei','nach','von','aus','durch','fur','uber','und','oder','aber','noch','schon','sehr'],
  fr: ['le','la','les','un','une','des','du','de','dans','est','sont','a','ont','ete','peut','fait','pas','plus','avec','sur','pour','par','cette','ces','nous','vous','ils','elles','aussi','tres'],
  es: ['el','la','los','las','un','una','es','son','estan','esta','fue','ha','han','hay','que','del','con','para','por','como','mas','pero','sus','entre','tambien','muy','este','esta'],
  it: ['il','la','le','gli','un','una','sono','ha','hanno','era','non','che','del','della','con','per','piu','anche','nel','sul','tra','fra','dove','come','delle','degli'],
  pt: ['o','a','os','as','um','uma','sao','nao','seu','sua','com','para','por','mais','mas','entre','tambem','muito','este','esta','como','sobre','sem','foi','era'],
  nl: ['de','het','een','zijn','niet','dat','dit','met','voor','van','op','in','uit','door','ook','nog','wel','maar','hij','zij','heeft','wordt','naar','dan','als'],
  sv: ['och','det','som','en','ar','har','att','med','pa','for','av','till','den','ett','om','men','upp','ut','kan','alla','vara','blir','nagot'],
  pl: ['i','w','na','z','do','sie','nie','jest','ma','maja','jak','moze','byc','przez','dla','od','po','tym','tego','tylko','ale','bardzo','kiedy','gdzie'],
  tr: ['ve','bir','ile','bu','icin','olarak','olan','kadar','daha','sonra','sonra','cok','arasi','kendini','yani','ancak','oyle','ayrica'],
  no: ['og','det','som','en','er','har','at','med','pa','for','av','til','den','ett','om','men','opp','ut','kan','alle','vaere','bli','noe'],
  da: ['og','det','som','en','er','har','at','med','pa','for','af','til','den','et','om','men','op','ud','kan','alle','vaere','blevet'],
  fi: ['ja','on','ei','se','ovat','oli','hän','voi','mutta','myös','kun','jos','tai','saa','jossa','joten','niin','vain','että'],
  ro: ['si','de','pe','un','o','este','sunt','a','au','fost','mai','dar','pentru','prin','din','cu','la','iar','foarte','cand'],
  cs: ['a','v','na','se','ze','do','je','jsou','má','mají','jak','může','být','pro','od','po','tom','jen','ale','velmi','kdy','kde'],
};

export function detectLanguage(text: string | null): string {
  if (!text || text.length < 10) return 'en';
  const sample = text.slice(0, 3000);
  const charCodes = [...sample].map(c => c.charCodeAt(0));

  const scriptScores: Record<string, number> = {};
  for (const code of charCodes) {
    for (const [start, end, lang] of SCRIPT_RANGES) {
      if (code >= start && code <= end) {
        scriptScores[lang] = (scriptScores[lang] || 0) + 1;
        break;
      }
    }
  }

  if (Object.keys(scriptScores).length > 0) {
    const total = charCodes.length;
    const threshold = 0.1;
    for (const [lang, count] of Object.entries(scriptScores)) {
      if (count / total > threshold) return lang;
    }
  }

  const words = sample.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1);
  const wordCount = words.length;
  if (wordCount < 3) return 'en';

  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, stops] of Object.entries(STOP_WORDS)) {
    let score = 0;
    for (const word of words) {
      if (stops.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

export const LANGUAGES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', sv: 'Swedish', pl: 'Polish', tr: 'Turkish',
  no: 'Norwegian', da: 'Danish', fi: 'Finnish', ro: 'Romanian', cs: 'Czech',
  ru: 'Russian', ar: 'Arabic', he: 'Hebrew', el: 'Greek', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', bn: 'Bengali', hi: 'Hindi', th: 'Thai',
  ka: 'Georgian', bg: 'Bulgarian',
};
