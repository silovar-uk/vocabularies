import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const readJson = async (path) => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));

const errors = [];
const warnings = [];

const catalog = await readJson('data/catalog.json');
const clustersData = await readJson('data/clusters.json');
const governanceBase = await readJson('data/semantic-governance.json');
const semanticCatalog = await readJson('data/semantic-catalog.json');

const currentItems = new Map();
for (const path of catalog.datasets ?? []) {
  const data = await readJson(path);
  const rows = Array.isArray(data) ? data : Object.values(data ?? {});
  for (const item of rows) if (item?.id) currentItems.set(item.id, item);
}

const annotations = { ...(governanceBase.term_annotations ?? {}) };
for (const path of semanticCatalog.annotation_datasets ?? []) {
  const data = await readJson(path);
  for (const [id, annotation] of Object.entries(data.term_annotations ?? {})) {
    annotations[id] = { ...(annotations[id] ?? {}), ...annotation };
  }
}

const clusterIds = new Set((clustersData.clusters ?? []).map((cluster) => cluster.id));
const knownIds = new Set(currentItems.keys());

for (const [id, annotation] of Object.entries(annotations)) {
  if (!knownIds.has(id)) {
    errors.push(`semantic annotationが未知の語を参照しています: ${id}`);
    continue;
  }
  if (!String(annotation.axis ?? '').trim()) {
    errors.push(`${id}: observation axisが空です`);
  }
  if (annotation.cluster && !clusterIds.has(annotation.cluster)) {
    errors.push(`${id}: 未知のclusterです: ${annotation.cluster}`);
  }
  const nearest = Array.isArray(annotation.nearest_terms) ? [...new Set(annotation.nearest_terms)] : [];
  if (nearest.length !== (annotation.nearest_terms ?? []).length) {
    warnings.push(`${id}: nearest_termsに重複があります`);
  }
  for (const nearId of nearest) {
    if (nearId === id) errors.push(`${id}: nearest_termsに自分自身を指定できません`);
    if (!knownIds.has(nearId)) errors.push(`${id}: nearest_termsが未知の語です: ${nearId}`);
  }
}

for (const cluster of governanceBase.cooldown_clusters ?? []) {
  for (const id of cluster.terms ?? []) {
    if (!knownIds.has(id)) errors.push(`cooldown cluster ${cluster.id}: 未知の語です: ${id}`);
  }
}

for (const pair of governanceBase.high_risk_pairs ?? []) {
  if (!knownIds.has(pair.a)) errors.push(`high_risk_pairs: 未知の語です: ${pair.a}`);
  if (!knownIds.has(pair.b)) errors.push(`high_risk_pairs: 未知の語です: ${pair.b}`);
}

function gitShowJson(ref, path) {
  try {
    const raw = execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function validBaseSha(value) {
  return /^[0-9a-f]{40}$/i.test(value ?? '') && !/^0+$/.test(value);
}

const baseSha = String(process.env.SEMANTIC_BASE_SHA ?? '').trim();
let newIds = [];

if (validBaseSha(baseSha)) {
  const baseCatalog = gitShowJson(baseSha, 'data/catalog.json');
  if (baseCatalog) {
    const baseIds = new Set();
    for (const path of baseCatalog.datasets ?? []) {
      const data = gitShowJson(baseSha, path);
      const rows = Array.isArray(data) ? data : Object.values(data ?? {});
      for (const item of rows) if (item?.id) baseIds.add(item.id);
    }
    newIds = [...knownIds].filter((id) => !baseIds.has(id));

    const gate = semanticCatalog.addition_gate ?? {};
    if (gate.enabled && newIds.length) {
      const allowedDistances = new Set(gate.allowed_distances ?? ['A', 'B']);
      const required = gate.required_for_new_terms ?? ['axis', 'nearest_terms', 'distance', 'difference_from_nearest'];
      let bCount = 0;

      for (const id of newIds) {
        const annotation = annotations[id];
        if (!annotation) {
          errors.push(`${id}: 新規語にはsemantic annotationが必要です`);
          continue;
        }

        for (const field of required) {
          const value = annotation[field];
          const missing = Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
          if (missing) errors.push(`${id}: semantic gate必須項目がありません: ${field}`);
        }

        const distance = String(annotation.distance ?? '').trim();
        if (distance && !allowedDistances.has(distance)) {
          errors.push(`${id}: distance=${distance} は追加不可です。許可: ${[...allowedDistances].join(', ')}`);
        }
        if (distance === 'B') bCount += 1;

        const nearest = Array.isArray(annotation.nearest_terms) ? annotation.nearest_terms : [];
        if (gate.require_existing_nearest_term && !nearest.some((nearId) => baseIds.has(nearId))) {
          errors.push(`${id}: nearest_termsには追加前から存在する語を最低1語含めてください`);
        }

        if (gate.require_cluster_or_new_axis && !annotation.cluster && annotation.new_axis !== true) {
          errors.push(`${id}: clusterを指定するか new_axis=true を明示してください`);
        }
      }

      if (bCount > Number(gate.max_b_per_change ?? 1)) {
        errors.push(`B判定の新規語が多すぎます: ${bCount}語（上限 ${gate.max_b_per_change ?? 1}）`);
      }
    }
  } else {
    warnings.push(`base commit ${baseSha} のcatalogを読めないため、新規語差分ゲートはスキップしました`);
  }
}

const annotationCoverage = knownIds.size ? Math.round((Object.keys(annotations).filter((id) => knownIds.has(id)).length / knownIds.size) * 100) : 0;
console.log(`Semantic governance: ${knownIds.size} terms / ${Object.keys(annotations).length} annotations / coverage=${annotationCoverage}%`);
if (newIds.length) console.log(`New term gate: ${newIds.length} new term(s): ${newIds.join(', ')}`);

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  console.error('\nSemantic governance validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Semantic governance validation passed.');
