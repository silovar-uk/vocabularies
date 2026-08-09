const state = {
  items: [],
  query: "",
  feeling: null,
  field: null,
};

const FIELD_LABELS = {
  Meta: "メタ",
  Learning: "学習",
  Perception: "知覚",
  Emotion: "感情",
  Design: "デザイン",
  UI: "UI",
  Web: "Web",
  UX: "UX",
  "Information Architecture": "情報設計",
  Cognition: "認知",
  "Graphic Design": "グラフィックデザイン",
  Art: "美術",
  Photography: "写真",
  Linguistics: "言語学",
  Phonetics: "音声学",
  Psychology: "心理学",
  Games: "ゲーム",
  Speech: "音声",
  Writing: "文章",
  Music: "音楽",
  Communication: "コミュニケーション",
  "Academic Writing": "学術文章",
  Rhetoric: "修辞学",
  Language: "言語",
  Sound: "音響",
};

const builtInItems = [
  {
    id: "differentiation",
    term: "Differentiation",
    ja: "分化 / 差異化",
    fields: ["Meta", "Learning", "Perception", "Emotion"],
    one_liner: "同じに見えていたものの中に、違いが見えてくる。",
    description: "ひとまとまりに捉えていた経験や知覚を、より細かな違いとして区別できるようになること。この語彙集では、厳密な単一分野の専門語というより、学習全体を貫くメタ概念として使う。",
    why_selected: "この1週間の振り返りを一語でまとめたとき、いちばん近かった言葉。『使いづらい』がVisual HierarchyやInformation Scentに、『なんか嫌』がより細かな感情に分かれていく。その変化自体に名前を付けるために選んだ。",
    feelings: ["違うのは分かる", "うまく説明できない", "解像度を上げたい", "見分けたい"],
    before: "前と違うのは分かるけど、何が違うのか説明できない。",
    after: "分化が進んで、以前は同じに見えていた差を別々の概念として捉えられるようになった。",
    related: ["emotional-granularity", "categorical-perception", "visual-hierarchy"],
    opposites: [],
    sources: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC8355493/"],
    status: "seed",
  },
];

const searchInput = document.querySelector("#searchInput");
const feelingChips = document.querySelector("#feelingChips");
const fieldFilters = document.querySelector("#fieldFilters");
const vocabularyGrid = document.querySelector("#vocabularyGrid");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const clearFilters = document.querySelector("#clearFilters");
const randomButton = document.querySelector("#randomButton");

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("ja");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    return fieldLabel(a).localeCompare(fieldLabel(b), "ja");
  });
}

function mergeItems(primary, extras) {
  const map = new Map();
  [...primary, ...extras].forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function buildSearchText(item) {
  return normalize([
    item.ja,
    item.term,
    item.one_liner,
    item.description,
    item.why_selected,
    ...(item.fields ?? []),
    ...(item.fields ?? []).map(fieldLabel),
    ...(item.feelings ?? []),
  ].join(" "));
}

function filteredItems() {
  const query = normalize(state.query);
  return state.items.filter((item) => {
    const matchesQuery = !query || buildSearchText(item).includes(query);
    const matchesFeeling = !state.feeling || (item.feelings ?? []).includes(state.feeling);
    const matchesField = !state.field || (item.fields ?? []).includes(state.field);
    return matchesQuery && matchesFeeling && matchesField;
  });
}

function renderFeelingChips() {
  const feelings = [...new Set(state.items.flatMap((item) => item.feelings ?? []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));

  feelingChips.innerHTML = feelings
    .map((feeling) => {
      const activeClass = state.feeling === feeling ? " is-active" : "";
      const pressed = state.feeling === feeling ? "true" : "false";
      return '<button class="chip' + activeClass + '" type="button" data-feeling="' +
        escapeAttribute(feeling) + '" aria-pressed="' + pressed + '">' +
        escapeHtml(feeling) + '</button>';
    })
    .join("");
}

function renderFieldFilters() {
  const fields = uniqueSorted(state.items.flatMap((item) => item.fields ?? []));
  fieldFilters.innerHTML = fields
    .map((field) => {
      const activeClass = state.field === field ? " is-active" : "";
      const pressed = state.field === field ? "true" : "false";
      return '<button class="field-button' + activeClass + '" type="button" data-field="' +
        escapeAttribute(field) + '" aria-pressed="' + pressed + '">' +
        escapeHtml(fieldLabel(field)) + '</button>';
    })
    .join("");
}

function renderCard(item) {
  const fields = (item.fields ?? [])
    .map((field) => '<span class="mini-tag">' + escapeHtml(fieldLabel(field)) + '</span>')
    .join("");

  const feelings = (item.feelings ?? [])
    .slice(0, 3)
    .map((feeling) => '<span class="mini-tag mini-tag-feeling">' + escapeHtml(feeling) + '</span>')
    .join("");

  const sources = (item.sources ?? [])
    .map((source, index) => '<li><a href="' + escapeAttribute(source) + '" target="_blank" rel="noopener noreferrer">出典 ' + (index + 1) + '</a></li>')
    .join("");

  const selectionContext = item.why_selected
    ? '<section class="selection-context" aria-label="この言葉を選んだ背景">' +
      '<p class="detail-kicker">選定背景</p>' +
      '<h4>この言葉を選んだ背景</h4>' +
      '<p>' + escapeHtml(item.why_selected) + '</p>' +
      '</section>'
    : "";

  const sourceList = sources ? '<ul class="source-list">' + sources + '</ul>' : "";

  return '<article class="vocab-card" id="' + escapeAttribute(item.id) + '">' +
    '<details>' +
      '<summary>' +
        '<div class="card-topline">' +
          '<div>' +
            '<h3 class="card-term">' + escapeHtml(item.ja || item.term) + '</h3>' +
            '<p class="card-en">' + escapeHtml(item.term) + '</p>' +
          '</div>' +
          '<span class="expand-mark" aria-hidden="true">＋</span>' +
        '</div>' +
        '<p class="one-liner">' + escapeHtml(item.one_liner) + '</p>' +
        '<div class="mini-tags">' + fields + feelings + '</div>' +
      '</summary>' +
      '<div class="card-detail">' +
        '<p class="description">' + escapeHtml(item.description) + '</p>' +
        selectionContext +
        '<div class="example-box">' +
          '<span class="example-label">もとの言い方</span>' +
          '<p>' + escapeHtml(item.before) + '</p>' +
          '<div class="after">' +
            '<span class="example-label">言い換えると</span>' +
            '<p>' + escapeHtml(item.after) + '</p>' +
          '</div>' +
        '</div>' +
        sourceList +
      '</div>' +
    '</details>' +
  '</article>';
}

function renderResults() {
  const items = filteredItems();
  resultCount.textContent = items.length + "語";
  emptyState.hidden = items.length !== 0;
  vocabularyGrid.innerHTML = items.map(renderCard).join("");
}

function render() {
  renderFeelingChips();
  renderFieldFilters();
  renderResults();
}

function resetFilters() {
  state.query = "";
  state.feeling = null;
  state.field = null;
  searchInput.value = "";
  render();
}

function openRandomItem() {
  const current = filteredItems();
  const items = current.length ? current : state.items;
  if (!items.length) return;

  const item = items[Math.floor(Math.random() * items.length)];
  const card = document.getElementById(item.id);
  if (!card) {
    resetFilters();
    requestAnimationFrame(openRandomItem);
    return;
  }

  const details = card.querySelector("details");
  if (details) details.open = true;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderResults();
});

feelingChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-feeling]");
  if (!button) return;
  const feeling = button.dataset.feeling;
  state.feeling = state.feeling === feeling ? null : feeling;
  render();
});

fieldFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-field]");
  if (!button) return;
  const field = button.dataset.field;
  state.field = state.field === field ? null : field;
  render();
});

clearFilters.addEventListener("click", resetFilters);
randomButton.addEventListener("click", openRandomItem);

async function loadVocabularyData() {
  const urls = [
    "./data/vocabularies.json?v=" + Date.now(),
    "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/data/vocabularies.json",
  ];

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Vocabulary data is not an array");
      return data;
    } catch (error) {
      lastError = error;
      console.warn("Vocabulary load failed:", url, error);
    }
  }

  throw lastError ?? new Error("Vocabulary data could not be loaded");
}

async function init() {
  state.items = builtInItems;
  render();

  try {
    const loaded = await loadVocabularyData();
    state.items = mergeItems(loaded, builtInItems);
    render();
  } catch (error) {
    console.error(error);
    resultCount.textContent = state.items.length + "語（データ取得失敗）";
    vocabularyGrid.insertAdjacentHTML(
      "beforeend",
      '<div class="load-warning"><strong>語彙データの取得に失敗しました。</strong><br>この画面を再読み込みしてください。</div>'
    );
  }
}

init();
