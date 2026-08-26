(() => {
  const searchAssist = document.querySelector("#searchAssist");
  if (!searchAssist) return;

  const searchValueCache = new WeakMap();

  function foldKana(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase("ja")
      .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
      .replace(/\s+/g, " ")
      .trim();
  }

  function valuesFor(item) {
    const cached = searchValueCache.get(item);
    if (cached) return cached;

    const names = displayNames(item);
    const groupLabels = (item.fields ?? [])
      .map(fieldGroup)
      .filter(Boolean)
      .map((group) => group.label);

    const values = {
      primary: foldKana(names.primary),
      secondary: foldKana(names.secondary),
      ja: foldKana(item.ja),
      term: foldKana(item.term),
      aliases: (item.aliases ?? []).map(foldKana),
      fields: [
        ...(item.fields ?? []),
        ...(item.fields ?? []).map(fieldLabel),
        ...groupLabels,
      ].map(foldKana),
      feelings: (item.feelings ?? []).map(foldKana),
      status: foldKana(formalStatusLabel(item)),
      oneLiner: foldKana(item.one_liner),
      description: foldKana(item.description),
      why: foldKana(item.why_selected),
      usage: foldKana(item.usage_note),
    };

    searchValueCache.set(item, values);
    return values;
  }

  function scoreToken(item, token) {
    const values = valuesFor(item);

    if (values.primary === token) return { score: 1000, reason: "語名" };
    if (values.secondary === token || values.ja === token || values.term === token) return { score: 950, reason: "別名" };
    if (values.aliases.includes(token)) return { score: 920, reason: "別の呼び方" };

    if (values.primary.startsWith(token)) return { score: 850, reason: "語名" };
    if ([values.secondary, values.ja, values.term].some((value) => value.startsWith(token))) return { score: 800, reason: "語名" };
    if (values.aliases.some((value) => value.startsWith(token))) return { score: 770, reason: "別の呼び方" };

    if (values.primary.includes(token)) return { score: 700, reason: "語名" };
    if ([values.secondary, values.ja, values.term].some((value) => value.includes(token))) return { score: 650, reason: "語名" };
    if (values.aliases.some((value) => value.includes(token))) return { score: 620, reason: "別の呼び方" };

    if (values.fields.some((value) => value.includes(token))) return { score: 500, reason: "分野" };
    if (values.feelings.some((value) => value.includes(token))) return { score: 450, reason: "感覚" };
    if (values.status.includes(token)) return { score: 400, reason: "種別" };
    if (values.oneLiner.includes(token)) return { score: 350, reason: "一文説明" };
    if (values.description.includes(token)) return { score: 250, reason: "定義" };
    if (values.why.includes(token) || values.usage.includes(token)) return { score: 200, reason: "背景" };

    return { score: 0, reason: "" };
  }

  function matchInfo(item, query) {
    const tokens = foldKana(query).split(" ").filter(Boolean);
    if (!tokens.length) return { score: 1, reason: "" };

    let total = 0;
    let strongest = { score: 0, reason: "" };
    for (const token of tokens) {
      const result = scoreToken(item, token);
      if (!result.score) return { score: 0, reason: "" };
      total += result.score;
      if (result.score > strongest.score) strongest = result;
    }

    return { score: total, reason: strongest.reason };
  }

  function rankedItems() {
    const query = state.query;
    const candidates = state.items.filter((item) => {
      const matchesFeeling = !state.feeling || (item.feelings ?? []).includes(state.feeling);
      const matchesField = !state.field || (item.fields ?? []).includes(state.field);
      return matchesFeeling && matchesField;
    });

    if (!foldKana(query)) return candidates;

    return candidates
      .map((item, index) => ({ item, index, match: matchInfo(item, query) }))
      .filter((entry) => entry.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score || a.index - b.index)
      .map((entry) => entry.item);
  }

  filteredItems = rankedItems;

  function candidateMarkup(item) {
    const names = displayNames(item);
    const match = matchInfo(item, state.query);
    return '<button class="search-candidate" type="button" data-search-term="' + escapeAttribute(item.id) + '">' +
      '<span class="search-candidate-copy">' +
        '<strong>' + escapeHtml(names.primary) + '</strong>' +
        (names.secondary ? '<span class="search-candidate-secondary">' + escapeHtml(names.secondary) + '</span>' : '') +
      '</span>' +
      '<span class="search-candidate-meta">' + escapeHtml(match.reason || formalStatusLabel(item) || "候補") + '</span>' +
    '</button>';
  }

  function contrastMarkup(items) {
    const ids = new Set(items.map((item) => item.id));
    const contrasts = state.catalog.search_contrasts ?? [];
    const group = contrasts.find((candidate) => (candidate.ids ?? []).filter((id) => ids.has(id)).length >= 2);
    if (!group) return "";

    const visibleTerms = (group.ids ?? [])
      .map((id) => state.items.find((item) => item.id === id))
      .filter(Boolean)
      .filter((item) => ids.has(item.id))
      .slice(0, 3)
      .map((item) => {
        const names = displayNames(item);
        return '<button type="button" data-search-term="' + escapeAttribute(item.id) + '">' + escapeHtml(names.primary) + '</button>';
      })
      .join('<span aria-hidden="true">／</span>');

    return '<div class="search-contrast">' +
      '<p class="search-contrast-title">' + escapeHtml(group.title) + '</p>' +
      '<p>' + escapeHtml(group.note) + '</p>' +
      '<div class="search-contrast-terms">' + visibleTerms + '</div>' +
    '</div>';
  }

  function renderSearchAssist(items) {
    const query = foldKana(state.query);
    if (!query) {
      searchAssist.hidden = true;
      searchAssist.innerHTML = "";
      return;
    }

    const top = items.slice(0, 4);
    if (!top.length) {
      searchAssist.hidden = false;
      searchAssist.innerHTML = '<p class="search-assist-empty">近い語はまだ見つかりません。感覚や分野の言い方でも検索できます。</p>';
      return;
    }

    searchAssist.hidden = false;
    searchAssist.innerHTML =
      '<div class="search-assist-head"><span>近い語</span><span>' + items.length + '語</span></div>' +
      '<div class="search-candidates">' + top.map(candidateMarkup).join("") + '</div>' +
      contrastMarkup(items);
  }

  renderResults = function rankedRenderResults() {
    const items = filteredItems();
    resultCount.textContent = items.length + "語";
    emptyState.hidden = items.length !== 0;
    vocabularyGrid.innerHTML = items.map(renderCard).join("");
    renderSearchAssist(items);
  };

  searchAssist.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-term]");
    if (!button) return;
    const card = document.getElementById(button.dataset.searchTerm);
    if (card) card.click();
  });

  renderResults();
})();