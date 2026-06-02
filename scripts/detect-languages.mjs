import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const SCRIPT_RANGES = [
  [0x4E00, 0x9FFF, 'zh'], [0x3400, 0x4DBF, 'zh'],
  [0x3040, 0x309F, 'ja'], [0x30A0, 0x30FF, 'ja'],
  [0xAC00, 0xD7AF, 'ko'],
  [0x0400, 0x04FF, 'ru'], [0x0500, 0x052F, 'ru'],
  [0x0600, 0x06FF, 'ar'],
  [0x0590, 0x05FF, 'he'],
  [0x0370, 0x03FF, 'el'],
];

const STOP_WORDS = {
  en: ['the','and','is','are','was','were','have','has','had','been','will','would','could','should','may','might','shall','can','not','this','that','with','for','from','but','all','some','any','about','into','than','also','its','these','those','very','just'],
  de: ['der','die','das','den','dem','des','ein','eine','einen','einem','eines','ist','sind','war','wird','werden','wurde','hat','haben','nicht','sich','auch','auf','mit','bei','nach','von','aus','durch','fur','uber','und','oder','aber','noch','schon','sehr'],
  fr: ['le','la','les','un','une','des','du','de','dans','est','sont','a','ont','ete','peut','fait','pas','plus','avec','sur','pour','par','cette','ces','nous','vous','ils','elles','aussi','tres'],
  es: ['el','la','los','las','un','una','es','son','estan','esta','fue','ha','han','hay','que','del','con','para','por','como','mas','pero','sus','entre','tambien','muy','este','esta'],
  it: ['il','la','le','gli','un','una','sono','ha','hanno','era','non','che','del','della','con','per','piu','anche','nel','sul','tra','fra','dove','come','delle','degli'],
  pt: ['o','a','os','as','um','uma','sao','nao','seu','sua','com','para','por','mais','mas','entre','tambem','muito','este','esta','como','sobre','sem','foi','era'],
  nl: ['de','het','een','zijn','niet','dat','dit','met','voor','van','op','in','uit','door','ook','nog','wel','maar','hij','zij','heeft','wordt','naar','dan','als'],
  sv: ['och','det','som','en','ar','har','att','med','pa','for','av','till','den','ett','om','men','upp','ut','kan','alla','vara','blir','nagot'],
  pl: ['i','w','na','z','do','sie','nie','jest','ma','maja','jak','moze','byc','przez','dla','od','po','tym','tego','tylko','ale','bardzo','kiedy','gdzie'],
  tr: ['ve','bir','ile','bu','icin','olarak','olan','kadar','daha','sonra','cok','arasi','kendini','yani','ancak','oyle','ayrica'],
  no: ['og','det','som','en','er','har','at','med','pa','for','av','til','den','ett','om','men','opp','ut','kan','alle','vaere','bli','noe'],
  da: ['og','det','som','en','er','har','at','med','pa','for','af','til','den','et','om','men','op','ud','kan','alle','vaere','blevet'],
};

function detectLanguage(text) {
  if (!text || text.length < 10) return 'en';
  const sample = text.slice(0, 3000);
  const codes = [...sample].map(c => c.charCodeAt(0));

  const scriptScores = {};
  for (const code of codes) {
    for (const [start, end, lang] of SCRIPT_RANGES) {
      if (code >= start && code <= end) {
        scriptScores[lang] = (scriptScores[lang] || 0) + 1;
        break;
      }
    }
  }

  if (Object.keys(scriptScores).length > 0) {
    const total = codes.length;
    for (const [lang, count] of Object.entries(scriptScores)) {
      if (count / total > 0.1) return lang;
    }
  }

  const words = sample.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1);
  if (words.length < 3) return 'en';

  let best = 'en', bestScore = 0;
  for (const [lang, stops] of Object.entries(STOP_WORDS)) {
    let score = 0;
    for (const w of words) { if (stops.includes(w)) score++; }
    if (score > bestScore) { bestScore = score; best = lang; }
  }
  return best;
}

async function main() {
  const BATCH = 100;

  console.log('Adding language column...');
  try { await sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS language varchar(10)`; console.log('  Column added'); }
  catch (e) { console.log('  Column exists'); }

  const count = await sql`SELECT COUNT(*) as cnt FROM pages WHERE language IS NULL`;
  const total = count[0].cnt;
  console.log(`  ${total} pages to backfill`);

  for (let offset = 0; offset < total; offset += BATCH) {
    const rows = await sql`SELECT id, COALESCE(title, '') || ' ' || COALESCE(content, '') as text FROM pages WHERE language IS NULL ORDER BY id LIMIT ${BATCH} OFFSET ${offset}`;
    const updates = rows.map(r => {
      const lang = detectLanguage(r.text);
      return { id: r.id, lang };
    });

    for (const u of updates) {
      await sql`UPDATE pages SET language = ${u.lang} WHERE id = ${u.id}`;
    }
    process.stdout.write(`\r  ${Math.round(Math.min(offset + BATCH, total) / total * 100)}% (${Math.min(offset + BATCH, total)}/${total})`);
  }

  console.log('\n  Done backfilling');

  const counts = await sql`SELECT language, COUNT(*) as cnt FROM pages GROUP BY language ORDER BY cnt DESC`;
  console.log('\nLanguage distribution:');
  for (const { language, cnt } of counts) {
    console.log(`  ${language || 'null'}: ${cnt}`);
  }
}

main().catch(e => console.error(e));
