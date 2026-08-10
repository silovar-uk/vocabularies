(() => {
  const page = document.querySelector("#termPage");
  if (!page) return;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const escapeAttr = escapeHtml;

  async function loadJson(path) {
    const clean = String(path).replace(/^\.\//, "");
    const urls = [
      "./" + clean + "?v=" + Date.now(),
      "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/" + clean,
    ];
    let lastError;
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Could not load " + clean);
  }

  async function loadEssay(entry, id) {
    if (entry.path) return await loadJson(entry.path);
    if (entry.bundle_path) {
      const bundle = await loadJson(entry.bundle_path);
      const essay = bundle?.[id];
      if (!essay) throw new Error("Essay not found in bundle: " + id);
      return essay;
    }
    throw new Error("Essay entry has no path: " + id);
  }

  function mergeItems(collections) {
    const map = new Map();
    collections.flat().forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return map;
  }

  function applyCatalog(item, catalog) {
    if (!item) return null;
    const defaults = catalog.defaults ?? {};
    const metadata = catalog.terms?.[item.id] ?? {};
    return { ...defaults, ...item, ...metadata };
  }

  function displayNames(item) {
    const ja = String(item?.ja ?? "").trim();
    const en = String(item?.term ?? "").trim();
    const englishFirst = item?.primary_language === "en" || !ja;
    return englishFirst ? { primary: en, secondary: ja } : { primary: ja, secondary: en };
  }

  function sourceLabel(source) {
    return source.title || source.url || "出典";
  }

  function renderParagraphs(body) {
    return (body ?? []).map((paragraph) => '<p>' + escapeHtml(paragraph) + '</p>').join("");
  }

  function termLink(id) { return "./term.html?id=" + encodeURIComponent(id); }
  function indexLink(id) { return "./#term=" + encodeURIComponent(id); }

  function renderDistinctions(essay, items, catalog) {
    const rows = essay.distinctions ?? [];
    if (!rows.length) return "";
    return '<section class="term-section"><p class="term-kicker">DISTINCTIONS</p><h2>似ているけど、違う</h2><div class="distinction-list">' +
      rows.map((row) => {
        const target = applyCatalog(items.get(row.term_id), catalog);
        const names = displayNames(target);
        const label = row.label || names.primary || row.term_id;
        return '<article class="distinction-card"><span class="distinction-name">' + escapeHtml(label) + '</span><p>' + escapeHtml(row.difference) + '</p></article>';
      }).join("") + '</div></section>';
  }

  function renderSections(essay) {
    const sections = essay.sections ?? [];
    if (!sections.length) return "";
    return '<section class="term-section"><p class="term-kicker">EXPANDED ARGUMENT</p><h2>この言葉を使って、もう少し考える</h2>' +
      sections.map((section) => '<article class="argument-block"><h3>' + escapeHtml(section.heading) + '</h3>' + renderParagraphs(section.body) + '</article>').join("") +
      '</section>';
  }

  function renderLenses(essay) {
    const lenses = essay.lenses ?? [];
    if (!lenses.length) return "";
    return '<section class="term-section"><p class="term-kicker">LENSES</p><h2>この語で見る</h2><div class="lens-list">' +
      lenses.map((lens) => '<article class="lens-card"><span class="lens-label">' + escapeHtml(lens.label) + '</span><p>' + escapeHtml(lens.before) + '</p><p class="lens-after">' + escapeHtml(lens.after) + '</p></article>').join("") +
      '</div></section>';
  }

  function renderQuestions(essay) {
    const questions = essay.open_questions ?? [];
    if (!questions.length) return "";
    return '<section class="term-section"><p class="term-kicker">OPEN QUESTIONS</p><h2>ここから、さらに考えられること</h2><ul class="question-list">' +
      questions.map((question) => '<li>' + escapeHtml(question) + '</li>').join("") + '</ul></section>';
  }

  function renderRelations(essay, items, catalog, essayIndex) {
    const relations = essay.relations ?? [];
    if (!relations.length) return "";
    return '<section class="term-section"><p class="term-kicker">CONCEPT NETWORK</p><h2>この言葉から渡る</h2><div class="relation-grid">' +
      relations.map((relation) => {
        const target = applyCatalog(items.get(relation.term_id), catalog);
        const names = displayNames(target);
        const hasEssay = essayIndex.essays?.[relation.term_id]?.status === "published";
        const href = hasEssay ? termLink(relation.term_id) : indexLink(relation.term_id);
        return '<a class="relation-card" href="' + escapeAttr(href) + '"><span class="relation-verb">' + escapeHtml(relation.verb || "関連する") + ' →</span><span class="relation-name">' + escapeHtml(names.primary || relation.term_id) + '</span></a>';
      }).join("") + '</div></section>';
  }

  function normalizeSource(source) {
    if (typeof source === "string") return { url: source };
    return source?.url ? source : null;
  }

  function renderSources(essay, item) {
    const merged = [...(essay.sources ?? []), ...(item.sources ?? [])]
      .map(normalizeSource)
      .filter(Boolean);
    const seen = new Set();
    const sources = merged.filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
    if (!sources.length) return "";
    return '<section class="term-section"><p class="term-kicker">SOURCES</p><h2>出典</h2><ul class="source-list">' +
      sources.map((source) => '<li><a href="' + escapeAttr(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(sourceLabel(source)) + '</a></li>').join("") +
      '</ul></section>';
  }

  function renderError(title, text) {
    page.innerHTML = '<section class="term-error"><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(text) + '</p><p><a href="./">語彙集へ戻る</a></p></section>';
  }

  async function init() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      renderError("言葉が指定されていません。", "語彙集から読みたい言葉を選んでください。");
      return;
    }

    try {
      const [catalog, essayIndex] = await Promise.all([loadJson("data/catalog.json"), loadJson("data/essay-index.json")]);
      const entry = essayIndex.essays?.[id];
      if (!entry || entry.status !== "published") {
        renderError("この言葉の論考は、まだありません。", "語の意味や関連語は語彙集のReaderで読めます。");
        return;
      }

      const datasets = catalog.datasets ?? ["data/vocabularies.json"];
      const [collections, essay] = await Promise.all([Promise.all(datasets.map(loadJson)), loadEssay(entry, id)]);
      const items = mergeItems(collections);
      const item = applyCatalog(items.get(id), catalog);
      if (!item) throw new Error("Term not found: " + id);

      const names = displayNames(item);
      const fieldLabels = catalog.field_labels ?? {};
      const meta = (item.fields ?? []).map((field) => fieldLabels[field] ?? field).join(" / ");
      document.title = names.primary + " — Vocabularies";

      page.innerHTML = '<article><header class="term-hero"><p class="term-meta">' + escapeHtml(meta || "VOCABULARIES") + '</p><h1 class="term-title">' + escapeHtml(names.primary) + '</h1>' +
        (names.secondary ? '<p class="term-title-en">' + escapeHtml(names.secondary) + '</p>' : '') +
        '<p class="term-question">' + escapeHtml(essay.question) + '</p>' +
        (essay.thesis ? '<p class="term-thesis">' + escapeHtml(essay.thesis) + '</p>' : '') +
        '</header><section class="term-section term-definition"><p class="term-kicker">30秒で掴む</p><p>' + escapeHtml(item.description) + '</p></section>' +
        renderDistinctions(essay, items, catalog) + renderSections(essay) + renderLenses(essay) + renderQuestions(essay) + renderRelations(essay, items, catalog, essayIndex) + renderSources(essay, item) + '</article>';
    } catch (error) {
      console.error(error);
      renderError("読み込みに失敗しました。", "ページを再読み込みするか、語彙集へ戻ってください。");
    }
  }

  init();
})();
