import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import '../relation-grammar.js';

const ROOT = process.cwd();
const grammar = globalThis.VocabularyRelationGrammar;
const errors = [];
const warnings = [];

async function readJson(path) {
  const text = await readFile(resolve(ROOT, path), 'utf8');
  return JSON.parse(text);
}

function addCount(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

if (!grammar) errors.push('relation-grammar.js: VocabularyRelationGrammar が初期化されませんでした');

const catalog = await readJson('data/catalog.json');
const relationPaths = Array.isArray(catalog.relation_datasets) ? catalog.relation_datasets : [];
const rawTypeCounts = new Map();
const canonicalKindCounts = new Map();
let edgeCount = 0;

if (grammar) {
  if (grammar.duplicateTypes.length) {
    errors.push(`relation-grammar.js: 複数kindに重複登録されたtypeがあります: ${grammar.duplicateTypes.join(', ')}`);
  }

  for (const [kind, definition] of Object.entries(grammar.kinds)) {
    if (!definition?.label || !definition?.symbol) errors.push(`relation-grammar.js: ${kind} の定義が不完全です`);
  }

  for (const [family, definition] of Object.entries(grammar.families ?? {})) {
    if (!definition?.label || !definition?.description) errors.push(`relation-grammar.js: ${family} のVerb Family定義が不完全です`);
  }

  for (const path of relationPaths) {
    const relations = await readJson(path);
    for (const [sourceId, edges] of Object.entries(relations)) {
      if (!Array.isArray(edges)) continue;
      for (const edge of edges) {
        edgeCount += 1;
        const rawType = String(edge?.type ?? '').trim();
        if (!rawType) continue;
        addCount(rawTypeCounts, rawType);
        const classified = grammar.classifyType(rawType);
        if (!classified) {
          errors.push(`${path}: ${sourceId} → ${edge?.id ?? '?'} の未知relation type: ${rawType}`);
          continue;
        }
        addCount(canonicalKindCounts, classified.kind);
      }
    }
  }

  const unusedKnownTypes = grammar.knownTypes.filter((type) => !rawTypeCounts.has(type));
  if (unusedKnownTypes.length) warnings.push(`未使用のgrammar type: ${unusedKnownTypes.join(', ')}`);
}

let essayVerbCount = 0;
const essayVerbCounts = new Map();
const essayKindCounts = new Map();
const fallbackVerbs = new Set();
const essayFamilyCounts = new Map();
const unclassifiedFamilyVerbs = new Set();

if (grammar) {
  const essayIndex = await readJson('data/essay-index.json');
  const paths = [...new Set(Object.values(essayIndex.essays ?? {})
    .map((entry) => entry?.path || entry?.bundle_path)
    .filter(Boolean))];

  for (const path of paths) {
    const data = await readJson(path);
    const essays = Object.values(data ?? {}).every((value) => value && typeof value === 'object' && !Array.isArray(value) && 'term_id' in value)
      ? Object.values(data)
      : [data];

    for (const essay of essays) {
      for (const relation of essay?.relations ?? []) {
        const verb = String(relation?.verb ?? '').trim();
        if (!verb) continue;
        essayVerbCount += 1;
        addCount(essayVerbCounts, verb);

        const classified = grammar.classifyVerb(verb);
        addCount(essayKindCounts, classified.kind);
        if (classified.kind === 'NEAR' && !classified.exact) fallbackVerbs.add(verb);

        const family = grammar.classifyVerbFamily?.(verb);
        if (family?.family) addCount(essayFamilyCounts, family.family);
        else unclassifiedFamilyVerbs.add(verb);
      }
    }
  }
}

const uniqueVerbCount = essayVerbCounts.size;
const classifiedUniqueVerbCount = uniqueVerbCount - unclassifiedFamilyVerbs.size;
const familyCoverage = uniqueVerbCount ? classifiedUniqueVerbCount / uniqueVerbCount : 1;

if (familyCoverage < 0.9) {
  errors.push(`Editorial Verb Family coverageが90%未満です: ${(familyCoverage * 100).toFixed(1)}% (${classifiedUniqueVerbCount}/${uniqueVerbCount})`);
}

console.log(`Relation grammar audit: ${edgeCount} typed edges / ${rawTypeCounts.size} human labels / ${Object.keys(grammar?.kinds ?? {}).length} canonical kinds`);
if (canonicalKindCounts.size) {
  console.log('Typed relation kinds: ' + [...canonicalKindCounts.entries()].map(([kind, count]) => `${kind}=${count}`).join(' / '));
}
console.log(`Concept Map verb audit: ${essayVerbCount} edges / ${uniqueVerbCount} editorial verbs`);
if (essayKindCounts.size) {
  console.log('Concept Map canonical kinds: ' + [...essayKindCounts.entries()].map(([kind, count]) => `${kind}=${count}`).join(' / '));
}
if (fallbackVerbs.size) {
  console.log(`Concept Map NEAR fallback: ${fallbackVerbs.size} verb types (${[...fallbackVerbs].slice(0, 12).join(' / ')}${fallbackVerbs.size > 12 ? ' / …' : ''})`);
}
if (essayFamilyCounts.size) {
  console.log('Verb families: ' + [...essayFamilyCounts.entries()].map(([family, count]) => `${family}=${count}`).join(' / '));
}
console.log(`Verb Family coverage: ${(familyCoverage * 100).toFixed(1)}% (${classifiedUniqueVerbCount}/${uniqueVerbCount} unique verbs)`);
if (unclassifiedFamilyVerbs.size) {
  console.log(`Unclassified Verb Families: ${unclassifiedFamilyVerbs.size} (${[...unclassifiedFamilyVerbs].slice(0, 30).join(' / ')}${unclassifiedFamilyVerbs.size > 30 ? ' / …' : ''})`);
}

if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length})`);
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error(`\nERRORS (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('\nOK: relation typeとEditorial Verb Familyは品質基準を満たしています。');
}
