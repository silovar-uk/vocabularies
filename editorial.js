(() => {
  const STORAGE_KEY = "vocabularies.editorial-intake.v1";
  const STAGES = ["captured", "researching", "qualified", "related", "ready", "adopted", "rejected"];
  const STAGE_LABELS = {
    captured: "候補",
    researching: "調査",
    qualified: "判定",
    related: "関係",
    ready: "採用準備",
    adopted: "採用済み",
    rejected: "見送り",
  };
  const GRADES = ["", "A", "B", "C"];

  const form = document.querySelector("#intakeForm");
  const queue = document.querySelector("#intakeQueue");
  const emptyState = document.querySelector("#intakeEmpty");
  const statusLine = document.querySelector("#intakeStatus");
  const formTitle = document.querySelector("#formTitle");
  const advanced = document.querySelector("#advancedFields");
  const saveButton = document.querySelector("#saveCandidate");
  const resetButton = document.querySelector("#resetCandidate");
  const promptButton = document.querySelector("#copyResearchPrompt");
  const exportButton = document.querySelector("#exportIntake");
  const importInput = document.querySelector("#importIntake");
  const filterSelect = document.querySelector("#stageFilter");

  const fields = {
    id: document.querySelector("#candidateId"),
    term: document.querySelector("#candidateTerm"),
    trigger: document.querySelector("#candidateTrigger"),
    whyNow: document.querySelector("#candidateWhyNow"),
    ja: document.querySelector("#candidateJa"),
    en: document.querySelector("#candidateEn"),
    proposedId: document.querySelector("#candidateProposedId"),
    stage: document.querySelector("#candidateStage"),
    grade: document.querySelector("#candidateGrade"),
    primaryLanguage: document.querySelector("#candidatePrimaryLanguage"),
    formalStatus: document.querySelector("#candidateFormalStatus"),
    fields: document.querySelector("#candidateFields"),
    aliases: document.querySelector("#candidateAliases"),
    feelings: document.querySelector("#candidateFeelings"),
    oneLiner: document.querySelector("#candidateOneLiner"),
    description: document.querySelector("#candidateDescription"),
    usageNote: document.querySelector("#candidateUsageNote"),
    whySelected: document.querySelector("#candidateWhySelected"),
    before: document.querySelector("#candidateBefore"),
    after: document.querySelector("#candidateAfter"),
    sources: document.querySelector("#candidateSources"),
    relations: document.querySelector("#candidateRelations"),
    decisionNote: document.querySelector("#candidateDecisionNote"),
  };

  let canonical = { schema_version: 1, candidates: [] };
  let candidates = [];

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function normalizeLines(value) {
    return String(value ?? "")
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function normalizeList(value) {
    return String(value ?? "")
      .split(/[,\n、]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function newCandidateId() {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).replaceAll("-", "");
    const random = Math.random().toString(36).slice(2, 7);
    return `candidate-${date}-${random}`;
  }

  function slugify(value) {
    const normalized = String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized;
  }

  function parseRelations(value) {
    return normalizeLines(value).map((line) => {
      const [id = "", type = "", ...noteParts] = line.split("|").map((part) => part.trim());
      return { id, type, note: noteParts.join(" | ") };
    }).filter((relation) => relation.id);
  }

  function serializeRelations(relations) {
    return (relations ?? [])
      .map((relation) => [relation.id, relation.type, relation.note].filter(Boolean).join(" | "))
      .join("\n");
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return Array.isArray(parsed?.candidates) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schema_version: 1,
      updated_at: new Date().toISOString(),
      candidates,
    }));
  }

  function mergedQueue(base, local) {
    const map = new Map();
    for (const item of base?.candidates ?? []) map.set(item.id, item);
    for (const item of local?.candidates ?? []) map.set(item.id, item);
    return [...map.values()].sort((a, b) => {
      return String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
    });
  }

  function candidateFromForm() {
    const existing = candidates.find((item) => item.id === fields.id.value);
    const id = fields.id.value || newCandidateId();
    const now = new Date().toISOString();
    const en = fields.en.value.trim();
    const proposedId = fields.proposedId.value.trim() || slugify(en);

    return {
      id,
      term: fields.term.value.trim(),
      trigger: fields.trigger.value.trim(),
      why_now: fields.whyNow.value.trim(),
      ja: fields.ja.value.trim(),
      en,
      proposed_id: proposedId,
      stage: fields.stage.value,
      grade: fields.grade.value,
      primary_language: fields.primaryLanguage.value,
      formal_status: fields.formalStatus.value,
      fields: unique(normalizeList(fields.fields.value)),
      aliases: unique(normalizeList(fields.aliases.value)),
      feelings: unique(normalizeList(fields.feelings.value)),
      one_liner: fields.oneLiner.value.trim(),
      description: fields.description.value.trim(),
      usage_note: fields.usageNote.value.trim(),
      why_selected: fields.whySelected.value.trim(),
      before: fields.before.value.trim(),
      after: fields.after.value.trim(),
      sources: unique(normalizeLines(fields.sources.value)),
      relations: parseRelations(fields.relations.value),
      decision_note: fields.decisionNote.value.trim(),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
  }

  function gate(candidate, stage = candidate.stage) {
    const checks = {
      captured: [
        ["候補語", Boolean(candidate.term)],
        ["きっかけ", Boolean(candidate.trigger)],
      ],
      researching: [
        ["出典が1件以上", (candidate.sources ?? []).length > 0],
      ],
      qualified: [
        ["A/B/C判定", GRADES.includes(candidate.grade) && Boolean(candidate.grade)],
        ["formal status", Boolean(candidate.formal_status)],
        ["主表記言語", ["ja", "en"].includes(candidate.primary_language)],
        ["一文説明", Boolean(candidate.one_liner)],
        ["定義", Boolean(candidate.description)],
      ],
      related: [
        ["関係が1件以上", (candidate.relations ?? []).length > 0],
      ],
      ready: [
        ["採用ID", Boolean(candidate.proposed_id)],
        ["分野が1件以上", (candidate.fields ?? []).length > 0],
        ["選定背景", Boolean(candidate.why_selected)],
        ["Before", Boolean(candidate.before)],
        ["After", Boolean(candidate.after)],
        ["出典が1件以上", (candidate.sources ?? []).length > 0],
      ],
    };

    const stageIndex = STAGES.indexOf(stage);
    const requiredStages = ["captured", "researching", "qualified", "related", "ready"]
      .filter((name) => STAGES.indexOf(name) <= stageIndex);

    return requiredStages.flatMap((name) => checks[name] ?? []);
  }

  function readiness(candidate) {
    const checks = gate(candidate, "ready");
    const passed = checks.filter(([, ok]) => ok).length;
    return { checks, passed, total: checks.length, ready: passed === checks.length };
  }

  function canAdvance(candidate) {
    if (["adopted", "rejected"].includes(candidate.stage)) return false;
    const currentIndex = STAGES.indexOf(candidate.stage);
    const nextStage = STAGES[currentIndex + 1];
    if (!nextStage) return false;
    const checks = gate(candidate, nextStage);
    return checks.every(([, ok]) => ok);
  }

  function nextStage(candidate) {
    const index = STAGES.indexOf(candidate.stage);
    return STAGES[Math.min(index + 1, STAGES.indexOf("ready"))];
  }

  function researchPrompt(candidate) {
    const knownSources = (candidate.sources ?? []).length
      ? `\n現時点の出典候補:\n${candidate.sources.map((url) => `- ${url}`).join("\n")}`
      : "";

    return `Vocabulariesの収録候補「${candidate.term}」を調査してください。

この語彙集の目的:
「うまく言えない差」に、あとから精密な言葉を追いつかせる。網羅ではなく、知ったあとに見え方が変わる語を選ぶ。

候補を拾ったきっかけ:
${candidate.trigger || "未記入"}

なぜ今気になっているか:
${candidate.why_now || "未記入"}

仮の日本語名: ${candidate.ja || "未定"}
仮の英語名: ${candidate.en || "未定"}
想定分野: ${(candidate.fields ?? []).join(" / ") || "未定"}
近接語候補: ${(candidate.relations ?? []).map((item) => item.id).join(" / ") || "未定"}${knownSources}

調査ルール:
- 一次資料、標準、査読研究、大学・専門機関を優先する
- 単に語の存在を確認するだけでなく、定義・適用範囲・周辺語との差を確認する
- 日本語主表記が自然か、英語主表記が自然かを判断する
- established_term / design_principle / heuristic / editorial_principle / project_meta のどれに当たるか判断する
- 正式用法から比喩的・編集的に拡張する場合は、その境界を明記する
- 既存Vocabularies語との重複・近接関係を確認する
- 最後に A / B / C で判定する
  A = 現在の位置づけのまま強く扱える
  B = 注記つきで扱う
  C = 編集原理・プロジェクト内概念として意図的に扱う
- 採用可能なら one_liner / description / why_selected / before / after / aliases / feelings / sources / typed relations を提案する
`;
  }

  function adoptionBundle(candidate) {
    const id = candidate.proposed_id || slugify(candidate.en) || candidate.id;
    const datasetItem = {
      id,
      term: candidate.en,
      ja: candidate.ja,
      fields: candidate.fields ?? [],
      one_liner: candidate.one_liner,
      description: candidate.description,
      why_selected: candidate.why_selected,
      feelings: candidate.feelings ?? [],
      before: candidate.before,
      after: candidate.after,
      related: (candidate.relations ?? []).map((relation) => relation.id),
      opposites: [],
      sources: candidate.sources ?? [],
      status: "researched",
    };

    const catalogMetadata = {
      primary_language: candidate.primary_language || "ja",
      formal_status: candidate.formal_status || "established_term",
      aliases: candidate.aliases ?? [],
      ...(candidate.usage_note ? { usage_note: candidate.usage_note } : {}),
    };

    return {
      candidate_id: candidate.id,
      grade: candidate.grade,
      dataset_item: datasetItem,
      catalog_metadata: { [id]: catalogMetadata },
      relations: {
        [id]: (candidate.relations ?? []).map((relation) => ({
          id: relation.id,
          type: relation.type || "関連",
          note: relation.note || "",
        })),
      },
    };
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showStatus(message);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showStatus(message);
    }
  }

  function showStatus(message) {
    statusLine.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => {
      statusLine.textContent = "この編集キューは、このブラウザ内に保存されます。";
    }, 2800);
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setForm(candidate) {
    const item = candidate || {
      id: "",
      term: "",
      trigger: "",
      why_now: "",
      ja: "",
      en: "",
      proposed_id: "",
      stage: "captured",
      grade: "",
      primary_language: "ja",
      formal_status: "established_term",
      fields: [],
      aliases: [],
      feelings: [],
      one_liner: "",
      description: "",
      usage_note: "",
      why_selected: "",
      before: "",
      after: "",
      sources: [],
      relations: [],
      decision_note: "",
    };

    fields.id.value = item.id || "";
    fields.term.value = item.term || "";
    fields.trigger.value = item.trigger || "";
    fields.whyNow.value = item.why_now || "";
    fields.ja.value = item.ja || "";
    fields.en.value = item.en || "";
    fields.proposedId.value = item.proposed_id || "";
    fields.stage.value = item.stage || "captured";
    fields.grade.value = item.grade || "";
    fields.primaryLanguage.value = item.primary_language || "ja";
    fields.formalStatus.value = item.formal_status || "established_term";
    fields.fields.value = (item.fields ?? []).join(", ");
    fields.aliases.value = (item.aliases ?? []).join(", ");
    fields.feelings.value = (item.feelings ?? []).join(", ");
    fields.oneLiner.value = item.one_liner || "";
    fields.description.value = item.description || "";
    fields.usageNote.value = item.usage_note || "";
    fields.whySelected.value = item.why_selected || "";
    fields.before.value = item.before || "";
    fields.after.value = item.after || "";
    fields.sources.value = (item.sources ?? []).join("\n");
    fields.relations.value = serializeRelations(item.relations);
    fields.decisionNote.value = item.decision_note || "";

    const editing = Boolean(item.id);
    formTitle.textContent = editing ? "候補を編集" : "候補を拾う";
    saveButton.textContent = editing ? "更新する" : "候補に追加";
    resetButton.hidden = !editing;
    if (editing || item.stage !== "captured") advanced.open = true;
  }

  function renderStage(candidate) {
    const current = STAGES.indexOf(candidate.stage);
    const visibleStages = STAGES.slice(0, 5);
    return `<div class="intake-stage-track" aria-label="編集工程">
      ${visibleStages.map((stage, index) => {
        const cls = index < current ? " is-done" : index === current ? " is-current" : "";
        return `<span class="intake-stage${cls}">${escapeHtml(STAGE_LABELS[stage])}</span>`;
      }).join("")}
    </div>`;
  }

  function renderCard(candidate) {
    const { passed, total, ready } = readiness(candidate);
    const label = candidate.ja || candidate.en || candidate.term;
    const sub = [candidate.en && candidate.en !== label ? candidate.en : "", candidate.grade ? `Grade ${candidate.grade}` : ""]
      .filter(Boolean)
      .join(" · ");
    const advance = canAdvance(candidate);
    const terminal = ["adopted", "rejected"].includes(candidate.stage);

    return `<article class="intake-card" data-candidate="${escapeHtml(candidate.id)}">
      <div class="intake-card-head">
        <div>
          <p class="intake-stage-label">${escapeHtml(STAGE_LABELS[candidate.stage] || candidate.stage)}</p>
          <h3>${escapeHtml(label)}</h3>
          ${sub ? `<p class="intake-card-sub">${escapeHtml(sub)}</p>` : ""}
        </div>
        <span class="intake-readiness${ready ? " is-ready" : ""}">${passed}/${total}</span>
      </div>
      <p class="intake-trigger">${escapeHtml(candidate.trigger)}</p>
      ${renderStage(candidate)}
      <div class="intake-card-actions">
        <button type="button" data-action="edit">編集</button>
        <button type="button" data-action="prompt">調査プロンプト</button>
        <button type="button" data-action="bundle"${ready ? "" : " disabled"}>採用JSON</button>
        ${!terminal ? `<button type="button" data-action="advance"${advance ? "" : " disabled"}>次の工程へ</button>` : ""}
        <button type="button" data-action="delete" class="is-danger">削除</button>
      </div>
    </article>`;
  }

  function renderQueue() {
    const filter = filterSelect.value;
    const visible = candidates.filter((item) => filter === "all" || item.stage === filter);
    queue.innerHTML = visible.map(renderCard).join("");
    emptyState.hidden = visible.length > 0;
    document.querySelector("#queueCount").textContent = `${visible.length}件`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const candidate = candidateFromForm();
    if (!candidate.term || !candidate.trigger) {
      showStatus("候補語と「何を言えなかったか」を入れてください。");
      return;
    }

    const index = candidates.findIndex((item) => item.id === candidate.id);
    if (index >= 0) candidates[index] = candidate;
    else candidates.unshift(candidate);

    saveLocal();
    renderQueue();
    setForm(null);
    advanced.open = false;
    showStatus(index >= 0 ? "候補を更新しました。" : "候補を保存しました。");
  });

  resetButton.addEventListener("click", () => {
    setForm(null);
    advanced.open = false;
  });

  promptButton.addEventListener("click", () => {
    const candidate = candidateFromForm();
    copyText(researchPrompt(candidate), "調査プロンプトをコピーしました。");
  });

  queue.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    const card = event.target.closest("[data-candidate]");
    if (!action || !card) return;
    const candidate = candidates.find((item) => item.id === card.dataset.candidate);
    if (!candidate) return;

    if (action.dataset.action === "edit") {
      setForm(candidate);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action.dataset.action === "prompt") {
      copyText(researchPrompt(candidate), "調査プロンプトをコピーしました。");
      return;
    }

    if (action.dataset.action === "bundle") {
      const result = readiness(candidate);
      if (!result.ready) {
        showStatus("採用JSONを作るには、採用準備の必須項目を埋めてください。");
        return;
      }
      copyText(JSON.stringify(adoptionBundle(candidate), null, 2), "採用JSONをコピーしました。");
      return;
    }

    if (action.dataset.action === "advance") {
      if (!canAdvance(candidate)) {
        const stage = nextStage(candidate);
        const missing = gate(candidate, stage).filter(([, ok]) => !ok).map(([label]) => label);
        showStatus(`次へ進むには: ${missing.join(" / ")}`);
        return;
      }
      candidate.stage = nextStage(candidate);
      candidate.updated_at = new Date().toISOString();
      saveLocal();
      renderQueue();
      showStatus(`「${STAGE_LABELS[candidate.stage]}」へ進めました。`);
      return;
    }

    if (action.dataset.action === "delete") {
      if (!confirm(`「${candidate.term}」を編集キューから削除しますか？`)) return;
      candidates = candidates.filter((item) => item.id !== candidate.id);
      saveLocal();
      renderQueue();
      showStatus("候補を削除しました。");
    }
  });

  exportButton.addEventListener("click", () => {
    downloadJson("vocabularies-intake.json", {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      candidates,
    });
    showStatus("編集キューをJSONで出力しました。");
  });

  importInput.addEventListener("change", async () => {
    const [file] = importInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed?.candidates)) throw new Error("candidates がありません");
      candidates = mergedQueue({ candidates }, parsed);
      saveLocal();
      renderQueue();
      showStatus("JSONを取り込みました。");
    } catch (error) {
      showStatus(`取り込めませんでした: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });

  filterSelect.addEventListener("change", renderQueue);

  fields.en.addEventListener("input", () => {
    if (!fields.proposedId.value.trim()) fields.proposedId.value = slugify(fields.en.value);
  });

  async function init() {
    try {
      const response = await fetch("./data/intake.json", { cache: "no-store" });
      if (response.ok) {
        const parsed = await response.json();
        if (Array.isArray(parsed?.candidates)) canonical = parsed;
      }
    } catch (error) {
      console.warn("Canonical intake queue could not be loaded:", error);
    }

    candidates = mergedQueue(canonical, loadLocal());
    setForm(null);
    renderQueue();
  }

  init();
})();
