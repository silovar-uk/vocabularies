import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function readJson(path) {
  try {
    const text = await readFile(resolve(ROOT, path), "utf8");
    return JSON.parse(text);
  } catch (cause) {
    error(`${path}: JSONを読み込めません (${cause.message})`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateSourceList(sources, at, { required = true } = {}) {
  if (sources == null && !required) return;
  if (!Array.isArray(sources) || (required && sources.length === 0)) {
    error(`${at}: sources ${required ? "がありません" : "は配列で指定してください"}`);
    return;
  }
  for (const source of sources) {
    if (!isNonEmptyString(source) || !isHttpUrl(source)) error(`${at}: 不正な source URL: ${String(source)}`);
  }
}

const catalog = await readJson("data/catalog.json");

if (!catalog) {
  process.exitCode = 1;
} else {
  if (!Number.isInteger(catalog.schema_version)) error("catalog.json: schema_version は整数で指定してください");
  if (!Array.isArray(catalog.datasets) || catalog.datasets.length === 0) error("catalog.json: datasets が空です");
  if (!Array.isArray(catalog.relation_datasets) || catalog.relation_datasets.length === 0) error("catalog.json: relation_datasets が空です");
  if (!catalog.defaults || typeof catalog.defaults !== "object") error("catalog.json: defaults がありません");
  if (!catalog.formal_status_labels || typeof catalog.formal_status_labels !== "object") error("catalog.json: formal_status_labels がありません");
  if (!catalog.field_labels || typeof catalog.field_labels !== "object") error("catalog.json: field_labels がありません");
  if (!Array.isArray(catalog.taxonomy)) error("catalog.json: taxonomy は配列で指定してください");
  if (!catalog.terms || typeof catalog.terms !== "object") error("catalog.json: terms がありません");
  if (!Array.isArray(catalog.search_contrasts)) error("catalog.json: search_contrasts は配列で指定してください");
  if (catalog.quality_audit != null && typeof catalog.quality_audit !== "object") error("catalog.json: quality_audit はオブジェクトで指定してください");

  const datasetPaths = Array.isArray(catalog.datasets) ? catalog.datasets : [];
  const duplicateDatasets = datasetPaths.filter((path, index) => datasetPaths.indexOf(path) !== index);
  for (const path of new Set(duplicateDatasets)) error(`catalog.json: datasets に重複があります: ${path}`);

  const relationPaths = Array.isArray(catalog.relation_datasets) ? catalog.relation_datasets : [];
  const duplicateRelationDatasets = relationPaths.filter((path, index) => relationPaths.indexOf(path) !== index);
  for (const path of new Set(duplicateRelationDatasets)) error(`catalog.json: relation_datasets に重複があります: ${path}`);

  try {
    const entries = await readdir(resolve(ROOT, "data"), { withFileTypes: true });
    const vocabularyFiles = entries
      .filter((entry) => entry.isFile() && (entry.name === "vocabularies.json" || entry.name === "meta-vocabularies.json" || /^research-.*\.json$/.test(entry.name)))
      .map((entry) => `data/${entry.name}`)
      .sort();
    const relationFiles = entries
      .filter((entry) => entry.isFile() && /^relations(?:-.*)?\.json$/.test(entry.name))
      .map((entry) => `data/${entry.name}`)
      .sort();

    for (const path of vocabularyFiles) {
      if (!datasetPaths.includes(path)) error(`catalog.json: 未登録の語彙datasetがあります: ${path}`);
    }
    for (const path of relationFiles) {
      if (!relationPaths.includes(path)) error(`catalog.json: 未登録のrelation datasetがあります: ${path}`);
    }
  } catch (cause) {
    error(`data/: dataset登録状況を確認できません (${cause.message})`);
  }

  const datasets = [];
  for (const path of datasetPaths) {
    const data = await readJson(path);
    if (data && !Array.isArray(data)) {
      error(`${path}: 語彙データは配列である必要があります`);
      continue;
    }
    if (Array.isArray(data)) datasets.push({ path, items: data });
  }

  const relationDatasets = [];
  for (const path of relationPaths) {
    const data = await readJson(path);
    if (data && (typeof data !== "object" || Array.isArray(data))) {
      error(`${path}: 関係データはオブジェクトである必要があります`);
      continue;
    }
    if (data && typeof data === "object" && !Array.isArray(data)) relationDatasets.push({ path, relations: data });
  }

  const allItems = [];
  const byId = new Map();
  const usedFields = new Set();
  const aliasOwners = new Map();

  for (const { path, items } of datasets) {
    items.forEach((item, index) => {
      const at = `${path}[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        error(`${at}: 語彙項目はオブジェクトである必要があります`);
        return;
      }

      const id = item.id;
      if (!isNonEmptyString(id)) {
        error(`${at}: id がありません`);
        return;
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) error(`${at}: id は kebab-case にしてください: ${id}`);
      if (byId.has(id)) error(`${at}: id が重複しています: ${id} (${byId.get(id).__source})`);

      const merged = {
        ...(catalog.defaults ?? {}),
        ...item,
        ...(catalog.terms?.[id] ?? {}),
      };
      merged.aliases = [...new Set([
        ...(catalog.defaults?.aliases ?? []),
        ...(item.aliases ?? []),
        ...(catalog.terms?.[id]?.aliases ?? []),
      ].filter(Boolean))];
      merged.__source = path;

      byId.set(id, merged);
      allItems.push(merged);

      if (!isNonEmptyString(item.term) && !isNonEmptyString(item.ja)) error(`${at} (${id}): term または ja のどちらかが必要です`);
      for (const key of ["one_liner", "description", "why_selected", "before", "after", "status"]) {
        if (!isNonEmptyString(item[key])) error(`${at} (${id}): ${key} がありません`);
      }

      if (!Array.isArray(item.fields) || item.fields.length === 0) {
        error(`${at} (${id}): fields が空です`);
      } else {
        for (const field of item.fields) {
          if (!isNonEmptyString(field)) error(`${at} (${id}): fields に空の値があります`);
          else usedFields.add(field);
        }
      }

      if (!Array.isArray(item.feelings)) error(`${at} (${id}): feelings は配列で指定してください`);
      if (item.related != null && !Array.isArray(item.related)) error(`${at} (${id}): related は配列で指定してください`);
      if (item.opposites != null && !Array.isArray(item.opposites)) error(`${at} (${id}): opposites は配列で指定してください`);

      validateSourceList(item.sources, `${at} (${id})`);
      validateSourceList(merged.sources, `${at} (${id}) effective`);

      if (!["ja", "en"].includes(merged.primary_language)) error(`${at} (${id}): primary_language が不正です: ${merged.primary_language}`);
      if (merged.primary_language === "ja" && !isNonEmptyString(merged.ja)) error(`${at} (${id}): primary_language=ja ですが有効な ja がありません`);
      if (merged.primary_language === "en" && !isNonEmptyString(merged.term)) error(`${at} (${id}): primary_language=en ですが有効な term がありません`);
      if (!Object.hasOwn(catalog.formal_status_labels ?? {}, merged.formal_status)) error(`${at} (${id}): formal_status が未定義です: ${merged.formal_status}`);

      if (!Array.isArray(merged.aliases)) {
        error(`${at} (${id}): aliases は配列で指定してください`);
      } else {
        for (const alias of merged.aliases) {
          if (!isNonEmptyString(alias)) {
            error(`${at} (${id}): aliases に空の値があります`);
            continue;
          }
          const key = alias.normalize("NFKC").toLocaleLowerCase("ja");
          if (!aliasOwners.has(key)) aliasOwners.set(key, new Set());
          aliasOwners.get(key).add(id);
        }
      }

      if (["heuristic", "editorial_principle", "project_meta"].includes(merged.formal_status) && !isNonEmptyString(merged.usage_note)) {
        warn(`${id}: formal_status=${merged.formal_status} なので usage_note があると位置づけがより明確です`);
      }
    });
  }

  const ids = new Set(byId.keys());
  const fieldLabels = catalog.field_labels ?? {};
  const taxonomy = Array.isArray(catalog.taxonomy) ? catalog.taxonomy : [];

  const taxonomyMembership = new Map();
  for (const group of taxonomy) {
    if (!isNonEmptyString(group?.id)) error("catalog.json: taxonomy group に id がありません");
    if (!isNonEmptyString(group?.label)) error(`catalog.json: taxonomy group ${group?.id ?? "?"} に label がありません`);
    if (!Array.isArray(group?.fields)) {
      error(`catalog.json: taxonomy group ${group?.id ?? "?"} の fields が配列ではありません`);
      continue;
    }
    for (const field of group.fields) {
      if (!taxonomyMembership.has(field)) taxonomyMembership.set(field, []);
      taxonomyMembership.get(field).push(group.id);
    }
  }

  for (const field of usedFields) {
    if (!Object.hasOwn(fieldLabels, field)) error(`catalog.json: 使用中の分野 ${field} に field_labels がありません`);
    const groups = taxonomyMembership.get(field) ?? [];
    if (groups.length === 0) error(`catalog.json: 使用中の分野 ${field} が taxonomy に属していません`);
    if (groups.length > 1) warn(`catalog.json: 分野 ${field} が複数taxonomyに属しています: ${groups.join(", ")}`);
  }

  for (const [id, metadata] of Object.entries(catalog.terms ?? {})) {
    const at = `catalog.json: terms.${id}`;
    if (!ids.has(id)) error(`${at} は存在しない語彙IDを参照しています`);
    if (metadata?.primary_language != null && !["ja", "en"].includes(metadata.primary_language)) error(`${at}.primary_language が不正です`);
    if (metadata?.formal_status != null && !Object.hasOwn(catalog.formal_status_labels ?? {}, metadata.formal_status)) error(`${at}.formal_status が未定義です: ${metadata.formal_status}`);
    if (metadata?.aliases != null && !Array.isArray(metadata.aliases)) error(`${at}.aliases は配列で指定してください`);
    if (metadata?.sources != null) validateSourceList(metadata.sources, at, { required: false });
    for (const key of ["term", "ja", "one_liner", "description", "usage_note"]) {
      if (metadata?.[key] != null && !isNonEmptyString(metadata[key])) error(`${at}.${key} は空でない文字列にしてください`);
    }
  }

  for (const item of allItems) {
    for (const related of item.related ?? []) {
      if (!ids.has(related)) error(`${item.id}: related が存在しない語彙IDを参照しています: ${related}`);
      if (related === item.id) warn(`${item.id}: related が自分自身を参照しています`);
    }
    for (const opposite of item.opposites ?? []) {
      if (!ids.has(opposite)) error(`${item.id}: opposites が存在しない語彙IDを参照しています: ${opposite}`);
    }
  }

  const seenTypedEdges = new Set();
  let relationCount = 0;
  for (const { path, relations } of relationDatasets) {
    for (const [sourceId, edges] of Object.entries(relations)) {
      if (!ids.has(sourceId)) error(`${path}: 存在しない起点ID: ${sourceId}`);
      if (!Array.isArray(edges)) {
        error(`${path}: ${sourceId} の関係は配列である必要があります`);
        continue;
      }
      const seenTargets = new Set();
      for (const [index, edge] of edges.entries()) {
        relationCount += 1;
        if (!edge || typeof edge !== "object") {
          error(`${path}: ${sourceId}[${index}] がオブジェクトではありません`);
          continue;
        }
        if (!ids.has(edge.id)) error(`${path}: ${sourceId} → ${edge.id} は存在しない語彙IDです`);
        if (!isNonEmptyString(edge.type)) error(`${path}: ${sourceId} → ${edge.id} に type がありません`);
        if (!isNonEmptyString(edge.note)) warn(`${path}: ${sourceId} → ${edge.id} に note がありません`);
        if (seenTargets.has(edge.id)) warn(`${path}: ${sourceId} → ${edge.id} が同一ファイル内で重複しています`);
        seenTargets.add(edge.id);

        const globalKey = `${sourceId}→${edge.id}`;
        if (seenTypedEdges.has(globalKey)) warn(`${path}: ${globalKey} は別のrelation datasetにも定義されています。後の定義がUIで優先されます`);
        seenTypedEdges.add(globalKey);
      }
    }
  }

  for (const [index, contrast] of (catalog.search_contrasts ?? []).entries()) {
    if (!Array.isArray(contrast?.ids) || contrast.ids.length < 2) error(`catalog.json: search_contrasts[${index}].ids は2件以上必要です`);
    for (const id of contrast?.ids ?? []) {
      if (!ids.has(id)) error(`catalog.json: search_contrasts[${index}] が存在しない語彙IDを参照しています: ${id}`);
    }
    if (!isNonEmptyString(contrast?.title)) error(`catalog.json: search_contrasts[${index}].title がありません`);
    if (!isNonEmptyString(contrast?.note)) error(`catalog.json: search_contrasts[${index}].note がありません`);
  }

  for (const [alias, owners] of aliasOwners) {
    if (owners.size > 1) warn(`alias「${alias}」が複数語に割り当てられています: ${[...owners].join(", ")}`);
  }

  console.log(`Vocabularies validation: ${allItems.length}語 / ${relationCount}関係 / ${relationDatasets.length} relation datasets`);
}

if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length})`);
  for (const message of warnings) console.log(`- ${message}`);
}

if (errors.length) {
  console.error(`\nERRORS (${errors.length})`);
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`\nOK: 構造上のエラーはありません${warnings.length ? `（警告 ${warnings.length}件）` : ""}。`);
}
