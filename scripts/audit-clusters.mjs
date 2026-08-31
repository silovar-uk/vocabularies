import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const readJson = async (path) => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
const catalog = await readJson('data/catalog.json');
const essayIndex = await readJson('data/essay-index.json');
const clusterData = await readJson('data/clusters.json');

const items = new Map();
for (const path of catalog.datasets ?? []) {
  const data = await readJson(path);
  const rows = Array.isArray(data) ? data : Object.values(data ?? {});
  for (const item of rows) if (item?.id) items.set(item.id, item);
}

const edgeWeights = new Map();
const addEdge = (a, b, weight) => {
  if (!a || !b || a === b || !items.has(a) || !items.has(b)) return;
  const [x, y] = [a, b].sort();
  const key = `${x}|${y}`;
  edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + weight);
};

let typedEdgeCount = 0;
for (const path of catalog.relation_datasets ?? []) {
  const relations = await readJson(path);
  for (const [source, edges] of Object.entries(relations ?? {})) {
    for (const edge of edges ?? []) {
      typedEdgeCount += 1;
      addEdge(source, edge?.id, 2);
    }
  }
}

const essayEntries = Object.entries(essayIndex.essays ?? {}).filter(([, entry]) => entry?.status === 'published');
const essayPaths = [...new Set(essayEntries.map(([, entry]) => entry.path || entry.bundle_path).filter(Boolean))];
const essayByPath = new Map(await Promise.all(essayPaths.map(async (path) => [path, await readJson(path)])));
let editorialEdgeCount = 0;
for (const [sourceId, entry] of essayEntries) {
  const source = essayByPath.get(entry.path || entry.bundle_path);
  const essay = entry.path ? source : source?.[sourceId];
  for (const relation of essay?.relations ?? []) {
    editorialEdgeCount += 1;
    addEdge(sourceId, relation?.term_id, 1);
  }
}

const adjacency = new Map([...items.keys()].map((id) => [id, new Map()]));
for (const [key, weight] of edgeWeights) {
  const [a, b] = key.split('|');
  adjacency.get(a)?.set(b, weight);
  adjacency.get(b)?.set(a, weight);
}

const degree = (id) => adjacency.get(id)?.size ?? 0;
const weightedDegree = (id) => [...(adjacency.get(id)?.values() ?? [])].reduce((sum, n) => sum + n, 0);
const label = (id) => items.get(id)?.ja || items.get(id)?.term || id;

function connectedComponents() {
  const seen = new Set();
  const components = [];
  for (const id of items.keys()) {
    if (seen.has(id) || degree(id) === 0) continue;
    const stack = [id];
    const component = [];
    seen.add(id);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      for (const next of adjacency.get(current)?.keys() ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    components.push(component);
  }
  return components.sort((a, b) => b.length - a.length);
}

function clusterMetrics(members) {
  const set = new Set(members);
  let internal = 0;
  let external = 0;
  const internalDegree = new Map(members.map((id) => [id, 0]));
  for (const id of members) {
    for (const [other] of adjacency.get(id) ?? []) {
      if (set.has(other)) {
        internal += 0.5;
        internalDegree.set(id, (internalDegree.get(id) ?? 0) + 1);
      } else {
        external += 1;
      }
    }
  }
  const possible = members.length * (members.length - 1) / 2;
  return {
    internal,
    external,
    density: possible ? internal / possible : 0,
    isolated: [...internalDegree.entries()].filter(([, count]) => count === 0).map(([id]) => id),
  };
}

function candidateFor(seed) {
  const neighbors = [...(adjacency.get(seed)?.entries() ?? [])]
    .sort((a, b) => b[1] - a[1] || degree(b[0]) - degree(a[0]) || a[0].localeCompare(b[0]))
    .map(([id]) => id);
  const members = [seed, ...neighbors.slice(0, 7)];
  if (members.length < 3) return null;
  const metrics = clusterMetrics(members);
  const fields = new Set(members.flatMap((id) => items.get(id)?.fields ?? []));
  return { seed, members, ...metrics, fields: fields.size };
}

const candidates = [...items.keys()]
  .filter((id) => degree(id) >= 2)
  .map(candidateFor)
  .filter(Boolean)
  .sort((a, b) => (b.density - a.density) || (b.internal - a.internal) || (degree(b.seed) - degree(a.seed)))
  .slice(0, 20);

const topNodes = [...items.keys()]
  .filter((id) => degree(id) > 0)
  .sort((a, b) => weightedDegree(b) - weightedDegree(a) || degree(b) - degree(a))
  .slice(0, 20);

const components = connectedComponents();
const isolates = [...items.keys()].filter((id) => degree(id) === 0);

console.log(`Cluster graph inventory: ${items.size} concepts / ${edgeWeights.size} unique undirected edges / ${typedEdgeCount} typed edges / ${editorialEdgeCount} editorial edges`);
console.log(`Connected components: ${components.length}; largest=${components[0]?.length ?? 0}; isolates=${isolates.length}`);
console.log('\nHigh-degree concepts:');
for (const id of topNodes) {
  console.log(`- ${id} (${label(id)}): degree=${degree(id)} weighted=${weightedDegree(id)}`);
}
console.log('\nCandidate ego-clusters (discovery only; not editorial truth):');
for (const candidate of candidates) {
  console.log(`- seed=${candidate.seed} (${label(candidate.seed)}) density=${candidate.density.toFixed(2)} internal=${candidate.internal} external=${candidate.external} field_diversity=${candidate.fields}`);
  console.log('  members=' + candidate.members.map((id) => `${id}:${label(id)}`).join(' / '));
}

const errors = [];
const warnings = [];
const clusters = Array.isArray(clusterData.clusters) ? clusterData.clusters : [];
const clusterIds = new Set();
const clusterLabels = new Set();
const clusterQuestions = new Set();
console.log('\nCurated cluster validation:');
for (const cluster of clusters) {
  const id = String(cluster?.id ?? '').trim();
  const clusterLabel = String(cluster?.label ?? '').trim();
  const question = String(cluster?.question ?? '').trim();
  const members = Array.isArray(cluster?.members) ? [...new Set(cluster.members)] : [];
  if (!id || clusterIds.has(id)) errors.push(`cluster idが空または重複しています: ${id || '(empty)'}`);
  clusterIds.add(id);
  if (!clusterLabel || clusterLabels.has(clusterLabel)) errors.push(`${id}: labelが空または重複しています`);
  clusterLabels.add(clusterLabel);
  if (!question || clusterQuestions.has(question)) errors.push(`${id}: questionが空または重複しています`);
  clusterQuestions.add(question);
  if (members.length < 3 || members.length > 8) errors.push(`${id}: membersは3〜8語にしてください (${members.length})`);
  for (const member of members) if (!items.has(member)) errors.push(`${id}: 未知のmemberです: ${member}`);
  if (!members.includes(cluster.entry)) errors.push(`${id}: entryはmembers内に必要です: ${cluster.entry}`);
  if (!members.includes(cluster.anchor)) errors.push(`${id}: anchorはmembers内に必要です: ${cluster.anchor}`);
  for (const boundary of cluster.boundaries ?? []) {
    if (!members.includes(boundary)) errors.push(`${id}: boundaryはmembers内に必要です: ${boundary}`);
  }
  const metrics = clusterMetrics(members.filter((member) => items.has(member)));
  if (metrics.isolated.length) errors.push(`${id}: Cluster内で孤立したmemberがあります: ${metrics.isolated.join(', ')}`);
  if (metrics.density < 0.25) warnings.push(`${id}: relation densityが低めです: ${metrics.density.toFixed(2)}`);
  console.log(`- ${id}: members=${members.length} density=${metrics.density.toFixed(2)} internal=${metrics.internal} external=${metrics.external} entry=${cluster.entry} anchor=${cluster.anchor}`);
}

const memberships = new Map();
for (const cluster of clusters) {
  for (const member of cluster.members ?? []) {
    if (!memberships.has(member)) memberships.set(member, []);
    memberships.get(member).push(cluster.id);
  }
}
const overlaps = [...memberships.entries()].filter(([, ids]) => ids.length > 1);
console.log(`Cluster coverage: ${memberships.size}/${items.size} concepts; overlapping concepts=${overlaps.length}`);
if (overlaps.length) console.log('Overlaps: ' + overlaps.map(([id, ids]) => `${id}→${ids.join('+')}`).join(' / '));

if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length})`);
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error(`\nERRORS (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('\nOK: Concept Cluster定義は構造上の品質基準を満たしています。');
}
