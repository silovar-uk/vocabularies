import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const STAGES = ["captured", "researching", "qualified", "related", "ready", "adopted", "rejected"];
const GRADES = ["A", "B", "C"];
const FORMAL_STATUSES = ["established_term", "design_principle", "heuristic", "editorial_principle", "project_meta"];

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function hasText(value) {
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

const path = resolve(ROOT, "data/intake.json");
let intake;

try {
  intake = JSON.parse(await readFile(path, "utf8"));
} catch (cause) {
  console.error(`ERROR: data/intake.json を読み込めません: ${cause.message}`);
  process.exit(1);
}

if (!Number.isInteger(intake.schema_version)) error("schema_version は整数で指定してください");
if (!Array.isArray(intake.workflow)) error("workflow は配列で指定してください");
if (!Array.isArray(intake.candidates)) error("candidates は配列で指定してください");

const ids = new Set();

for (const [index, candidate] of (intake.candidates ?? []).entries()) {
  const at = `candidates[${index}]`;

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    error(`${at}: オブジェクトである必要があります`);
    continue;
  }

  if (!hasText(candidate.id)) error(`${at}: id がありません`);
  else if (ids.has(candidate.id)) error(`${at}: id が重複しています: ${candidate.id}`);
  else ids.add(candidate.id);

  if (!hasText(candidate.term)) error(`${at}: term がありません`);
  if (!hasText(candidate.trigger)) error(`${at}: trigger がありません`);
  if (!STAGES.includes(candidate.stage)) error(`${at}: stage が不正です: ${candidate.stage}`);

  if (candidate.grade && !GRADES.includes(candidate.grade)) error(`${at}: grade が不正です: ${candidate.grade}`);
  if (candidate.primary_language && !["ja", "en"].includes(candidate.primary_language)) {
    error(`${at}: primary_language が不正です: ${candidate.primary_language}`);
  }
  if (candidate.formal_status && !FORMAL_STATUSES.includes(candidate.formal_status)) {
    error(`${at}: formal_status が不正です: ${candidate.formal_status}`);
  }

  for (const key of ["fields", "aliases", "feelings", "sources", "relations"]) {
    if (candidate[key] != null && !Array.isArray(candidate[key])) error(`${at}: ${key} は配列で指定してください`);
  }

  for (const source of candidate.sources ?? []) {
    if (!isHttpUrl(source)) error(`${at}: 不正なsource URL: ${source}`);
  }

  for (const [relationIndex, relation] of (candidate.relations ?? []).entries()) {
    if (!relation || typeof relation !== "object" || !hasText(relation.id)) {
      error(`${at}.relations[${relationIndex}]: id がありません`);
      continue;
    }
    if (!hasText(relation.type)) warn(`${at}.relations[${relationIndex}]: type がありません`);
    if (!hasText(relation.note)) warn(`${at}.relations[${relationIndex}]: note がありません`);
  }

  const stageIndex = STAGES.indexOf(candidate.stage);
  if (stageIndex >= STAGES.indexOf("researching") && (candidate.sources ?? []).length === 0) {
    error(`${at}: researching以降はsourcesが1件以上必要です`);
  }
  if (stageIndex >= STAGES.indexOf("qualified")) {
    if (!GRADES.includes(candidate.grade)) error(`${at}: qualified以降はA/B/C判定が必要です`);
    if (!FORMAL_STATUSES.includes(candidate.formal_status)) error(`${at}: qualified以降はformal_statusが必要です`);
    if (!["ja", "en"].includes(candidate.primary_language)) error(`${at}: qualified以降はprimary_languageが必要です`);
    if (!hasText(candidate.one_liner)) error(`${at}: qualified以降はone_linerが必要です`);
    if (!hasText(candidate.description)) error(`${at}: qualified以降はdescriptionが必要です`);
  }
  if (stageIndex >= STAGES.indexOf("related") && (candidate.relations ?? []).length === 0) {
    error(`${at}: related以降はrelationsが1件以上必要です`);
  }
  if (stageIndex >= STAGES.indexOf("ready")) {
    if (!hasText(candidate.proposed_id)) error(`${at}: ready以降はproposed_idが必要です`);
    if (!Array.isArray(candidate.fields) || candidate.fields.length === 0) error(`${at}: ready以降はfieldsが必要です`);
    for (const key of ["why_selected", "before", "after"]) {
      if (!hasText(candidate[key])) error(`${at}: ready以降は${key}が必要です`);
    }
  }

  if (candidate.stage === "rejected" && !hasText(candidate.decision_note)) {
    warn(`${at}: rejectedにはdecision_noteを残すと再調査を避けやすくなります`);
  }
}

console.log(`Editorial intake validation: ${(intake.candidates ?? []).length}候補`);

if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length})`);
  for (const message of warnings) console.log(`- ${message}`);
}

if (errors.length) {
  console.error(`\nERRORS (${errors.length})`);
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`\nOK: 編集キューの構造上のエラーはありません${warnings.length ? `（警告 ${warnings.length}件）` : ""}。`);
}
