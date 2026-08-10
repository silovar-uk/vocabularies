(() => {
  const readerContent = document.querySelector("#readerContent");
  const vocabularyGrid = document.querySelector("#vocabularyGrid");
  const thoughtQuestions = document.querySelector("#thoughtQuestions");
  const shuffleQuestions = document.querySelector("#shuffleQuestions");
  if (typeof loadJson !== "function") return;

  let essayIndex = { essays: {} };
  let essayMap = {};
  let ready = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function essayEntry(id) {
    const entry = essayIndex.essays?.[id];
    return entry?.status === "published" ? entry : null;
  }

  function itemFor(id) {
    return state?.items?.find((candidate) => candidate.id === id) ?? null;
  }

  function nameFor(id) {
    const item = itemFor(id);
    return item ? displayNames(item).primary : id;
  }

  async function loadAllEssays() {
    const entries = Object.entries(essayIndex.essays ?? {})
      .filter(([, entry]) => entry?.status === "published");
    const paths = [...new Set(entries.map(([, entry]) => entry.path || entry.bundle_path).filter(Boolean))];
    const loaded = await Promise.all(paths.map(async (path) => [path, await loadJson(path)]));
    const byPath = new Map(loaded);
    const map = {};

    for (const [id, entry] of entries) {
      const data = byPath.get(entry.path || entry.bundle_path);
      if (!data) continue;
      const essay = entry.path ? data : data[id];
      if (essay?.question) map[id] = essay;
    }
    return map;
  }

  function sampleQuestions(count = 3) {
    const ids = Object.keys(essayMap);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, count);
  }

  function renderQuestionPortal() {
    if (!thoughtQuestions || !ready) return;
    const ids = sampleQuestions(3);
    if (!ids.length) {
      thoughtQuestions.innerHTML = '<p class="thought-loading">問いを読み込めませんでした。</p>';
      return;
    }

    thoughtQuestions.innerHTML = ids.map((id) => {
      const essay = essayMap[id];
      return '<a class="thought-question-card" href="./term.html?id=' + encodeURIComponent(id) + '">' +
        '<span class="thought-question-term">' + escapeHtml(nameFor(id)) + '</span>' +
        '<strong>' + escapeHtml(essay.question) + '</strong>' +
        '<span class="thought-question-action">この言葉で考える <span aria-hidden="true">→</span></span>' +
      '</a>';
    }).join("");
  }

  function enhanceCards() {
    if (!vocabularyGrid || !ready) return;
    vocabularyGrid.querySelectorAll('.vocab-card[data-open-term]:not([data-essay-enhanced])').forEach((card) => {
      const id = card.dataset.openTerm;
      if (!id || !essayEntry(id)) return;

      const label = card.getAttribute("aria-label") || (nameFor(id) + "を読む");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card-reader-button";
      button.dataset.openTerm = id;
      button.setAttribute("aria-label", label);

      while (card.firstChild) button.appendChild(card.firstChild);

      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.removeAttribute("aria-label");
      card.removeAttribute("data-open-term");
      card.dataset.essayEnhanced = "true";
      card.appendChild(button);

      const link = document.createElement("a");
      link.className = "card-essay-action";
      link.href = "./term.html?id=" + encodeURIComponent(id);
      link.innerHTML = '<span>この言葉で考える</span><span aria-hidden="true">→</span>';
      card.appendChild(link);
    });
  }

  function syncEssayLink() {
    if (!readerContent || !ready) return;

    const id = state?.activeItemId;
    const existing = readerContent.querySelector("[data-concept-essay-link]");
    if (!id || !essayEntry(id) || !readerContent.children.length) {
      if (existing) existing.remove();
      return;
    }
    if (existing?.dataset.termId === id) return;
    if (existing) existing.remove();

    const name = nameFor(id);
    const section = document.createElement("section");
    section.className = "reader-section reader-concept-essay";
    section.setAttribute("data-concept-essay-link", "");
    section.dataset.termId = id;
    section.innerHTML =
      '<p class="reader-kicker">この言葉で考える</p>' +
      '<a class="concept-essay-link" href="./term.html?id=' + encodeURIComponent(id) + '">' +
        '<span class="concept-essay-copy">' +
          '<strong>' + escapeHtml(name) + 'から、議論を広げる</strong>' +
          '<span>定義の先へ。この言葉を使って、仕事・生活・設計を考える。</span>' +
        '</span>' +
        '<span class="concept-essay-arrow" aria-hidden="true">→</span>' +
      '</a>';

    const relationSection = readerContent.querySelector(".reader-relations");
    if (relationSection) readerContent.insertBefore(section, relationSection);
    else readerContent.appendChild(section);
  }

  if (readerContent) {
    const readerObserver = new MutationObserver(() => queueMicrotask(syncEssayLink));
    readerObserver.observe(readerContent, { childList: true, subtree: false });
  }

  if (vocabularyGrid) {
    const gridObserver = new MutationObserver(() => queueMicrotask(enhanceCards));
    gridObserver.observe(vocabularyGrid, { childList: true });
  }

  shuffleQuestions?.addEventListener("click", renderQuestionPortal);

  loadJson("data/essay-index.json")
    .then(async (data) => {
      if (data && !Array.isArray(data) && typeof data === "object") essayIndex = data;
      essayMap = await loadAllEssays();
    })
    .catch((error) => console.error("Essay data could not be loaded:", error))
    .finally(() => {
      ready = true;
      syncEssayLink();
      enhanceCards();
      renderQuestionPortal();
      window.setTimeout(renderQuestionPortal, 500);
    });
})();
