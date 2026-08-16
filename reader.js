(() => {
  state.activeItemId = state.activeItemId ?? null;

  const readerPanel = document.querySelector("#readerPanel");
  const readerContent = document.querySelector("#readerContent");
  const readerClose = document.querySelector("#readerClose");
  const readerBackdrop = document.querySelector("#readerBackdrop");

  if (!readerPanel || !readerContent || !readerClose || !readerBackdrop) return;

  let lastReaderTrigger = null;
  let relationMap = {};

  function itemById(id) { return state.items.find((item) => item.id === id) ?? null; }
  function recordTrail(id) { const item = itemById(id); if (!item || !window.VocabularyTrail) return; window.VocabularyTrail.record(id, displayNames(item).primary); }
  function typedRelations(item) { const typed = relationMap[item.id]; if (Array.isArray(typed) && typed.length) return typed; return (item.related ?? []).map((id) => ({ id, type: "関連", note: "" })); }
  function relatedPreview(item) { return typedRelations(item).map((relation) => itemById(relation.id)).filter(Boolean).slice(0, 3).map((relatedItem) => displayNames(relatedItem).primary); }
  function sourceLabel(source, index) { try { const hostname = new URL(source).hostname.replace(/^www\./, ""); return hostname || "出典 " + (index + 1); } catch { return "出典 " + (index + 1); } }

  function buildChatGptPrompt(item, names) {
    const sections = [
      `以下は語彙集「Vocabularies」にある「${names.primary}」についての説明です。`,
      names.secondary ? `別表記・英語名: ${names.secondary}` : "",
      item.one_liner ? `要点: ${item.one_liner}` : "",
      item.description ? `説明: ${item.description}` : "",
      item.usage_note ? `用法メモ: ${item.usage_note}` : "",
      item.why_selected ? `なぜこの言葉か: ${item.why_selected}` : "",
      item.before || item.after ? `言い換え例: ${item.before || ""} → ${item.after || ""}` : "",
      "この説明を前提に、この概念についてさらに深掘りしてください。専門的な背景、成立の経緯、近い概念との違い、具体例、実生活・仕事・デザイン・文章などでどう使えるかを、日本語でわかりやすく説明してください。必要であれば、この説明の不正確な点や注意点も指摘してください。"
    ].filter(Boolean);
    return sections.join("\n\n");
  }

  function chatGptHref(item, names) {
    return "https://chatgpt.com/?prompt=" + encodeURIComponent(buildChatGptPrompt(item, names));
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function ensureCopyButtonStyles() {
    if (document.querySelector("#readerCopyButtonStyles")) return;
    const style = document.createElement("style");
    style.id = "readerCopyButtonStyles";
    style.textContent = `
      .reader-copy-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 9px;
        justify-content: flex-start;
        margin: 0 0 18px;
      }
      .reader-copy-button,
      .reader-chatgpt-link {
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: var(--radius-pill);
        font: inherit;
        font-size: var(--text-sm);
        font-weight: 650;
        cursor: pointer;
        transition: background var(--motion-fast) ease, border-color var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) var(--motion-ease);
      }
      .reader-copy-button {
        background: rgba(255, 255, 255, 0.52);
        color: var(--ink);
      }
      .reader-chatgpt-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        border-color: rgba(47, 93, 80, 0.32);
        background: var(--accent-soft);
        color: var(--accent);
        text-decoration: none;
      }
      .reader-copy-button:hover,
      .reader-copy-button:focus-visible,
      .reader-chatgpt-link:hover,
      .reader-chatgpt-link:focus-visible {
        border-color: rgba(47, 93, 80, 0.5);
        background: rgba(47, 93, 80, 0.13);
      }
      .reader-copy-button:active,
      .reader-chatgpt-link:active {
        transform: translateY(1px);
      }
      .reader-copy-button.is-copied {
        border-color: rgba(47, 93, 80, 0.4);
        background: var(--accent-soft);
        color: var(--accent);
      }
      @media (max-width: 560px) {
        .reader-copy-row {
          display: grid;
          grid-template-columns: auto 1fr;
        }
        .reader-chatgpt-link {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  ensureCopyButtonStyles();

  renderCard = function readerCard(item) {
    const names = displayNames(item);
    const primaryClass = names.primaryLanguage === "en" ? " card-term-en" : "";
    const fields = (item.fields ?? []).slice(0, 4).map((field) => '<span class="mini-tag">' + escapeHtml(fieldLabel(field)) + '</span>').join("");
    const related = relatedPreview(item);
    const relatedLine = related.length ? '<p class="card-related"><span>周辺</span>' + escapeHtml(related.join(" ・ ")) + '</p>' : "";
    const activeClass = state.activeItemId === item.id ? " is-reader-active" : "";
    const secondaryName = names.secondary ? '<p class="card-en">' + escapeHtml(names.secondary) + '</p>' : "";
    return '<article class="vocab-card' + activeClass + '" id="' + escapeAttribute(item.id) + '" role="button" tabindex="0" data-open-term="' + escapeAttribute(item.id) + '" aria-label="' + escapeAttribute(names.primary) + 'を読む"><div class="card-topline"><div><h3 class="card-term' + primaryClass + '">' + escapeHtml(names.primary) + '</h3>' + secondaryName + '</div><span class="read-mark" aria-hidden="true">↗</span></div><p class="one-liner">' + escapeHtml(item.one_liner) + '</p><div class="mini-tags">' + fields + '</div>' + relatedLine + '</article>';
  };

  function renderRelatedItems(item) {
    const relations = typedRelations(item).map((relation) => ({ ...relation, item: itemById(relation.id) })).filter((relation) => relation.item);
    if (!relations.length) return "";
    return '<section class="reader-section reader-relations"><div class="relation-heading"><p class="reader-kicker">この言葉のまわり</p><span class="relation-count">' + relations.length + 'の関係</span></div><div class="relation-list">' + relations.map((relation) => { const names = displayNames(relation.item); return '<button class="relation-link" type="button" data-reader-term="' + escapeAttribute(relation.item.id) + '"><span class="relation-copy"><span class="relation-type">' + escapeHtml(relation.type || "関連") + '</span><span class="relation-name">' + escapeHtml(names.primary) + '</span>' + (relation.note ? '<span class="relation-note">' + escapeHtml(relation.note) + '</span>' : '') + '</span><span class="relation-arrow" aria-hidden="true">→</span></button>'; }).join("") + '</div></section>';
  }

  function renderReader() {
    const item = itemById(state.activeItemId);
    if (!item) { readerContent.innerHTML = ""; readerPanel.setAttribute("aria-hidden", "true"); document.body.classList.remove("reader-open"); return; }
    const names = displayNames(item), status = formalStatusLabel(item);
    const fields = [...(item.fields ?? []).map((field) => '<span class="reader-field">' + escapeHtml(fieldLabel(field)) + '</span>'), ...(item.formal_status && item.formal_status !== "established_term" && status ? ['<span class="reader-field reader-status">' + escapeHtml(status) + '</span>'] : [])].join("");
    const feelings = (item.feelings ?? []).map((feeling) => '<span class="reader-feeling">' + escapeHtml(feeling) + '</span>').join("");
    const sources = (item.sources ?? []).map((source, index) => '<li><a href="' + escapeAttribute(source) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(sourceLabel(source, index)) + '</a></li>').join("");
    const randomControls = window.VocabularyRandomStudy ? '<section class="reader-section reader-random"><button class="reader-random-next" type="button" data-reader-random-next>次の一語 →</button><p class="reader-random-hint">Enter / Spaceでも次へ</p></section>' : '';
    const chatHref = chatGptHref(item, names);

    readerContent.innerHTML = '<header class="reader-head"><div class="reader-copy-row"><button class="reader-copy-button" type="button" data-copy-vocabulary="' + escapeAttribute(names.primary) + '" aria-label="' + escapeAttribute(names.primary) + 'をコピー">この語彙をコピー</button><a class="reader-chatgpt-link" href="' + escapeAttribute(chatHref) + '" target="_blank" rel="noopener noreferrer" aria-label="ChatGPTで' + escapeAttribute(names.primary) + 'を深掘りする">ChatGPTで深掘り ↗</a></div><div class="reader-fields">' + fields + '</div><h2 class="reader-title">' + escapeHtml(names.primary) + '</h2>' + (names.secondary ? '<p class="reader-subtitle">' + escapeHtml(names.secondary) + '</p>' : '') + '<p class="reader-lead">' + escapeHtml(item.one_liner) + '</p></header><section class="reader-section reader-definition"><p>' + escapeHtml(item.description) + '</p></section>' + (item.usage_note ? '<section class="reader-section reader-usage-note"><p class="reader-kicker">用法メモ</p><p>' + escapeHtml(item.usage_note) + '</p></section>' : '') + (item.why_selected ? '<section class="reader-section reader-selection"><p class="reader-kicker">なぜ、この言葉か</p><p>' + escapeHtml(item.why_selected) + '</p></section>' : '') + '<section class="reader-section reader-example"><div class="reader-example-row"><span class="reader-kicker">もとの言い方</span><p>' + escapeHtml(item.before) + '</p></div><div class="reader-example-row is-after"><span class="reader-kicker">言い換えると</span><p>' + escapeHtml(item.after) + '</p></div></section>' + renderRelatedItems(item) + (feelings ? '<section class="reader-section reader-feelings"><p class="reader-kicker">感覚の手掛かり</p><div class="reader-feeling-list">' + feelings + '</div></section>' : '') + (sources ? '<section class="reader-section reader-sources"><p class="reader-kicker">出典</p><ul>' + sources + '</ul></section>' : '') + randomControls;
    readerPanel.setAttribute("aria-hidden", "false"); document.body.classList.add("reader-open");
  }

  const originalRender = render;
  render = function readerAwareRender() { originalRender(); renderReader(); syncReaderFromLocation(); };
  function hashFor(id) { return id ? "#term=" + encodeURIComponent(id) : ""; }
  function setHash(id, mode = "push") { const url = new URL(window.location.href); url.hash = hashFor(id); history[mode === "replace" ? "replaceState" : "pushState"](null, "", url); }
  function openReader(id, options = {}) { if (!itemById(id)) return; state.activeItemId = id; recordTrail(id); if (options.trigger) lastReaderTrigger = options.trigger; renderResults(); renderReader(); readerPanel.scrollTop = 0; if (options.updateHistory !== false) setHash(id, options.historyMode ?? "push"); requestAnimationFrame(() => readerClose.focus({ preventScroll: true })); }
  function closeReader(options = {}) { if (!state.activeItemId) return; state.activeItemId = null; renderResults(); renderReader(); if (options.updateHistory !== false) setHash(null, options.historyMode ?? "push"); if (options.restoreFocus !== false && lastReaderTrigger?.isConnected) lastReaderTrigger.focus({ preventScroll: true }); }
  function requestedTerm() { const match = window.location.hash.match(/^#term=(.+)$/); return match ? decodeURIComponent(match[1]) : null; }
  function syncReaderFromLocation() { const id = requestedTerm(); if (!id) { if (state.activeItemId) closeReader({ updateHistory: false, restoreFocus: false }); return; } if (!itemById(id) || state.activeItemId === id) return; state.activeItemId = id; recordTrail(id); renderResults(); renderReader(); }
  function mergeRelationMaps(maps) { const merged = {}; for (const map of maps) for (const [sourceId, edges] of Object.entries(map ?? {})) { if (!Array.isArray(edges)) continue; const byTarget = new Map((merged[sourceId] ?? []).map((edge) => [edge.id, edge])); for (const edge of edges) if (edge?.id) byTarget.set(edge.id, edge); merged[sourceId] = [...byTarget.values()]; } return merged; }
  async function loadRelations() { const paths = state.catalog.relation_datasets?.length ? state.catalog.relation_datasets : ["data/relations.json"]; try { const maps = await Promise.all(paths.map(async (path) => { const data = await loadJson(path); if (!data || Array.isArray(data) || typeof data !== "object") throw new Error(path + " is not an object"); return data; })); relationMap = mergeRelationMaps(maps); renderResults(); renderReader(); } catch (error) { console.error("Relation data could not be loaded:", error); } }

  vocabularyGrid.addEventListener("click", (event) => { const card = event.target.closest("[data-open-term]"); if (!card) return; openReader(card.dataset.openTerm, { trigger: card }); });
  vocabularyGrid.addEventListener("keydown", (event) => { const card = event.target.closest("[data-open-term]"); if (!card || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); openReader(card.dataset.openTerm, { trigger: card }); });
  readerContent.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-vocabulary]");
    if (copyButton) {
      try {
        await copyText(copyButton.dataset.copyVocabulary || "");
        copyButton.textContent = "コピーしました";
        copyButton.classList.add("is-copied");
        window.setTimeout(() => {
          if (!copyButton.isConnected) return;
          copyButton.textContent = "この語彙をコピー";
          copyButton.classList.remove("is-copied");
        }, 1400);
      } catch (error) {
        console.error("Vocabulary copy failed:", error);
      }
      return;
    }
    const next = event.target.closest("[data-reader-random-next]");
    if (next && window.VocabularyRandomStudy) { const item = window.VocabularyRandomStudy.next({ openReader: true }); if (item) openReader(item.id, { trigger: next, historyMode: "replace" }); return; }
    const button = event.target.closest("[data-reader-term]"); if (!button) return; openReader(button.dataset.readerTerm, { trigger: button });
  });
  readerClose.addEventListener("click", () => closeReader()); readerBackdrop.addEventListener("click", () => closeReader());
  randomButton?.addEventListener("click", (event) => { event.stopImmediatePropagation(); if (window.VocabularyRandomStudy) { const item = window.VocabularyRandomStudy.next(); if (item) openReader(item.id, { trigger: randomButton }); return; } const current = filteredItems(), items = current.length ? current : state.items; if (!items.length) return; const item = items[Math.floor(Math.random() * items.length)]; openReader(item.id, { trigger: randomButton }); }, true);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeItemId) { closeReader(); return; }
    if (!state.activeItemId || !window.VocabularyRandomStudy) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === "Enter" || event.key === " ") { if (event.target instanceof HTMLElement && event.target.closest('button, a')) return; event.preventDefault(); const item = window.VocabularyRandomStudy.next({ openReader: true }); if (item) openReader(item.id, { historyMode: "replace" }); }
  });
  window.addEventListener("popstate", syncReaderFromLocation);
  renderResults(); syncReaderFromLocation(); loadRelations();
})();