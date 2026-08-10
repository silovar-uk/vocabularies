(() => {
  const searchAssist = document.querySelector("#searchAssist");
  if (!searchAssist) return;

  const SEARCH_ALIASES = {
    signifier: ["シグニファイヤー", "しぐにふぁいあ", "操作の手掛かり", "操作の手がかり"],
    signifiant: ["シグニフィアン", "しぐにふぃあん", "記号表現"],
    signified: ["シニフィエ", "記号内容"],
    "conservation-of-complexity": ["テスラー", "テスラーの法則", "複雑性保存則"],
    "essential-accidental-complexity": ["本質的複雑性", "偶発的複雑性", "essential complexity", "accidental complexity"],
    "intrinsic-extraneous-load": ["内在的認知負荷", "外在的認知負荷"],
    "recognition-over-recall": ["再認", "想起", "想起より再認"],
    "information-scent": ["情報の匂い", "情報のにおい"],
  };

  const CONTRAST_GROUPS = [
    {
      ids: ["signifier", "signifiant"],
      title: "名前は似ていますが、別の概念です。",
      note: "シグニファイアはUXで行為を発見させる手掛かり。シニフィアンは記号論で、意味を担う表現側を指します。",
    },
    {
      ids: ["conservation-of-complexity", "essential-accidental-complexity", "cognitive-load"],
      title: "同じ「複雑さ」でも、見ている場所が違います。",
      note: "テスラーは負担先、Brooksは複雑さの由来、認知負荷は人の作業記憶を見ます。",
    },
    {
      ids: ["signifier", "affordance"],
      title: "よく混同される二つです。",
      note: "アフォーダンスは行為の可能性。シグニファイアは、その可能性を発見させる知覚可能な手掛かりです。",
    },
    {
      ids: ["visual-hierarchy", "salience"],
      title: "設計と、実際の目立ち方を分けて考えられます。",
      note: "視覚的階層は情報の優先順位を設計し、顕著性は実際にどれだけ注意を引くかを見ます。",
    },
  ];

  function foldKana(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase("ja")
      .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
      .replace(/\s+/g, " ")
      .trim();
  }

  function valuesFor(item) {
    const names = displayNames(item);
    return {
      primary: foldKana(names.primary),
      secondary: foldKana(names.secondary),
      ja: foldKana(item.ja),
      term: foldKana(item.term),
      aliases: (SEARCH_ALIASES[item.id] ?? []).map(foldKana),
      fields: [...(item.fields ?? []), ...(item.fields ?? []).map(fieldLabel)].map(foldKana),
      feelings: (item.feelings ?? []).map(foldKana),
      oneLiner: foldKana(item.one_liner),
      description: foldKana(item.description),
      why: foldKana(item.why_selected),
    };
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
    if (values.oneLiner.includes(token)) return { score: 350, reason: "一文説明" };
    if (values.description.includes(token)) return { score: 250, reason: "定義" };
    if (values.why.includes(token)) return { score: 200, reason: "選定背景" };

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
    const field = (item.fields ?? [])[0];
    return '<button class="search-candidate" type="button" data-search-term="' + escapeAttribute(item.id) + '">' +
      '<span class="search-candidate-copy">' +
        '<strong>' + escapeHtml(names.primary) + '</strong>' +
        (names.secondary ? '<span class="search-candidate-secondary">' + escapeHtml(names.secondary) + '</span>' : '') +
      '</span>' +
      '<span class="search-candidate-meta">' + escapeHtml(match.reason || (field ? fieldLabel(field) : "候補")) + '</span>' +
    '</button>';
  }

  function contrastMarkup(items) {
    const ids = new Set(items.map((item) => item.id));
    const group = CONTRAST_GROUPS.find((candidate) => candidate.ids.filter((id) => ids.has(id)).length >= 2);
    if (!group) return "";

    const visibleTerms = group.ids
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