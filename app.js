const state = {
  items: [],
  query: "",
  feeling: null,
  field: null,
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
    after: "Differentiationが進んで、以前は同じに見えていた差を別々の概念として捉えられるようになった。",
    related: ["emotional-granularity", "categorical-perception", "visual-hierarchy"],
    opposites: [],
    sources: ["https://pmc.ncbi.nlm.nih.gov/articles/PMC8355493/"],
    status: "seed"
  }
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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

function mergeItems(primary, extras) {
  const map = new Map();
  [...primary, ...extras].forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function buildSearchText(item) {
  return normalize([
    item.term,
    item.ja,
    item.one_liner,
    item.description,
    item.why_selected,
    ...(item.fields ?? []),
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
  const feelings = uniqueSorted(state.items.flatMap((item) => item.feelings ?? []));
  feelingChips.innerHTML = feelings.map((feeling) => {
    const active = state.feeling === feeling;
    return `<button class="chip${active ? " is-active" : "}" type="button" data-feeling="${escapeHtml(feeling)}" aria-pressed="${active}">${escapeHtml(feeling)}</button>`;
  }).join("");
}

function renderFieldFilters() {
  const fields = uniqueSorted(state.items.flatMap((item) => item.fields ?? []));
  fieldFilters.innerHTML = fields.map((field) => {
    const active = state.field === field;
    return `<button class="field-button${active ? " is-active" : "}" type="button" data-field="${escapeHtml(field)}" aria-pressed="${active}">${escapeHtml(field)}</button>`;
  }).join("");
}

function renderResults() {
  const items = filteredItems();
  resultCount.textContent = `${items.length}語`;
  emptyState.hidden = items.length !== 0;
  vocabularyGrid.innerHTML = items.map(renderCard).join("");
}

function renderCard(item) {
  const fields = (item.fields ?? []).map((field) => `<span class="mini-tag">${escapeHtml(field)}</span>`).join("");
  const feelings = (item.feelings ?? []).slice(0, 4).map((feeling) => `<span class="mini-tag">${escapeHtml(feeling)}</span>`).join("");
  const sources = (item.sources ?? []).map((source, index) => `<li><a href="${escapeAttribute(source)}" target="_blank" rel="noopener noreferrer">Source ${index + 1}</a></li>`).join("");

  const selectionContext = item.why_selected ? `
    <section class="selection-context" aria-label="この言葉を選んだ背景">
      <p class="detail-kicker">Why this word</p>
      <h4>この言葉を選んだ背景</h4>
      <p>${escapeHtml(item.why_selected)}</p>
    </section>` : "";

  return `
    <article class="vocab-card" id="${escapeAttribute(item.id)}">
      <details>
        <summary>
          <div class="card-topline">
            <div>
              <h3 class="card-term">${escapeHtml(item.term)}</h3>
              <p class="card-ja">${escapeHtml(item.ja)}</p>
            </div>
            <span class="expand-mark" aria-hidden="true">＋</span>
          </div>
          <p class="one-liner">${escapeHtml(item.one_liner)}</p>
          <div class="mini-tags">${fields}${feelings}</div>
        </summary>
        <div class="card-detail">
          <p class="description">${escapeHtml(item.description)}</p>
          ${selectionContext}
          <div class="example-box">
            <span class="example-label">Before</span>
            <p>${escapeHtml(item.before)}</p>
            <div class="after">
              <span class="example-label">After</span>
              <p>${escapeHtml(item.after)}</p>
            </div>
          </div>
          ${sources ? `<ul class="source-list">${sources}</ul>` : ""}
        </div>
      </details>
    </article>`;
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
  const items = filteredItems().length ? filteredItems() : state.items;
  if (!items.length) return;
  const item = items[Math.floor(Math.random() * items.length)];
  const card = document.getElementById(item.id);
  if (!card) {
    resetFilters();
    requestAnimationFrame(openRandomItem);
    return;
  }
  const details = card.querySelector("details");
  details.open = true;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

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
    `./data/vocabularies.json?v=${Date.now()}`,
    "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/data/vocabularies.json"
  ];

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Vocabulary data is not an array");
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`Vocabulary load failed: ${url}`, error);
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
    resultCount.textContent = `${state.items.length}語（データ取得失敗）`;
    vocabularyGrid.insertAdjacentHTML("beforeend", `<div class="load-warning"><strong>語彙データの取得に失敗しました。</strong><br>この画面を再読み込みしてください。取得元を二重化したため、通常は再読み込みで復旧します。</div>`);
  }
}

init();
