(() => {
  const readerContent = document.querySelector("#readerContent");
  const dailyButton = document.querySelector("#randomButton");
  if (!readerContent || !dailyButton) return;

  let relationMap = {};
  let walkSalt = 0;

  dailyButton.textContent = "今日の一語";
  dailyButton.setAttribute("aria-label", "今日の一語を読む");

  function itemById(id) {
    return state.items.find((item) => item.id === id) ?? null;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function tokyoDateKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return values.year + "-" + values.month + "-" + values.day;
  }

  function dailyItem() {
    const items = [...state.items]
      .filter((item) => item?.id && item.one_liner)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!items.length) return null;
    return items[hashString(tokyoDateKey()) % items.length];
  }

  function relationEntries(id) {
    const typed = relationMap[id];
    if (Array.isArray(typed) && typed.length) {
      return typed.filter((relation) => itemById(relation.id));
    }
    const item = itemById(id);
    return (item?.related ?? [])
      .filter((relatedId) => itemById(relatedId))
      .map((relatedId) => ({ id: relatedId, type: "関連", note: "" }));
  }

  function fieldOverlap(a, b) {
    const fields = new Set(a?.fields ?? []);
    return (b?.fields ?? []).filter((field) => fields.has(field)).length;
  }

  function openTerm(id, trigger) {
    const bridge = document.createElement("button");
    bridge.type = "button";
    bridge.hidden = true;
    bridge.dataset.readerTerm = id;
    readerContent.appendChild(bridge);
    bridge.click();
    bridge.remove();
    if (trigger instanceof HTMLElement) trigger.blur();
  }

  function surprisingNeighbor(startId) {
    const start = itemById(startId);
    if (!start) return null;
    const direct = relationEntries(startId);
    const directIds = new Set(direct.map((relation) => relation.id));
    const candidates = [];

    direct.forEach((firstRelation) => {
      relationEntries(firstRelation.id).forEach((secondRelation) => {
        if (secondRelation.id === startId || directIds.has(secondRelation.id)) return;
        const item = itemById(secondRelation.id);
        if (!item) return;
        candidates.push({
          item,
          via: itemById(firstRelation.id),
          overlap: fieldOverlap(start, item),
          relationType: secondRelation.type || "関連",
        });
      });
    });

    const unique = [...new Map(candidates.map((candidate) => [candidate.item.id, candidate])).values()]
      .sort((a, b) => a.overlap - b.overlap || a.item.id.localeCompare(b.item.id));

    if (unique.length) {
      const pool = unique.slice(0, Math.min(4, unique.length));
      return pool[hashString(startId + tokyoDateKey()) % pool.length];
    }

    const fallback = direct
      .map((relation) => ({
        item: itemById(relation.id),
        via: null,
        overlap: fieldOverlap(start, itemById(relation.id)),
        relationType: relation.type || "関連",
      }))
      .filter((candidate) => candidate.item)
      .sort((a, b) => a.overlap - b.overlap);

    return fallback[0] ?? null;
  }

  function chooseNext(currentId, startId, visited, step) {
    const current = itemById(currentId);
    const start = itemById(startId);
    let candidates = relationEntries(currentId)
      .filter((relation) => !visited.has(relation.id))
      .map((relation) => ({ relation, item: itemById(relation.id) }))
      .filter((candidate) => candidate.item)
      .map((candidate) => ({
        ...candidate,
        overlapCurrent: fieldOverlap(current, candidate.item),
        overlapStart: fieldOverlap(start, candidate.item),
      }));

    if (!candidates.length) {
      candidates = state.items
        .filter((item) => item?.id && !visited.has(item.id))
        .map((item) => ({
          relation: { id: item.id, type: "跳躍", note: "関係網の外へ少し跳ぶ。" },
          item,
          overlapCurrent: fieldOverlap(current, item),
          overlapStart: fieldOverlap(start, item),
        }));
    }

    candidates.sort((a, b) =>
      a.overlapStart - b.overlapStart ||
      a.overlapCurrent - b.overlapCurrent ||
      a.item.id.localeCompare(b.item.id)
    );

    if (!candidates.length) return null;
    const pool = candidates.slice(0, Math.min(3, candidates.length));
    const seed = hashString(startId + ":" + tokyoDateKey() + ":" + walkSalt + ":" + step + ":" + currentId);
    return pool[seed % pool.length];
  }

  function buildWalk(startId) {
    const steps = [];
    const visited = new Set([startId]);
    let currentId = startId;

    for (let step = 1; step <= 3; step += 1) {
      const next = chooseNext(currentId, startId, visited, step);
      if (!next) break;
      steps.push({
        from: currentId,
        to: next.item.id,
        type: next.relation.type || "関連",
      });
      visited.add(next.item.id);
      currentId = next.item.id;
    }

    return steps;
  }

  function pathMarkup(startId, steps) {
    const start = itemById(startId);
    if (!start) return "";
    const startName = displayNames(start).primary;
    const items = [
      '<li class="discovery-path-origin"><span class="discovery-step">起点</span><strong>' + escapeHtml(startName) + '</strong></li>',
    ];

    steps.forEach((step, index) => {
      const item = itemById(step.to);
      if (!item) return;
      const names = displayNames(item);
      const field = item.fields?.[0] ? fieldLabel(item.fields[0]) : "";
      items.push(
        '<li>' +
          '<span class="discovery-path-relation">' + escapeHtml(step.type) + '</span>' +
          '<button type="button" data-reader-term="' + escapeAttribute(item.id) + '">' +
            '<span class="discovery-step">' + (index + 1) + '歩</span>' +
            '<strong>' + escapeHtml(names.primary) + '</strong>' +
            (field ? '<span class="discovery-path-field">' + escapeHtml(field) + '</span>' : '') +
          '</button>' +
        '</li>'
      );
    });

    return items.join("");
  }

  function renderReaderDiscovery() {
    const activeId = state.activeItemId;
    if (!activeId || !readerContent.children.length) return;

    const existing = readerContent.querySelector('.reader-discovery[data-for-id="' + CSS.escape(activeId) + '"]');
    if (existing) return;
    readerContent.querySelector(".reader-discovery")?.remove();

    const surprise = surprisingNeighbor(activeId);
    const walk = buildWalk(activeId);
    if (!surprise && !walk.length) return;

    const section = document.createElement("section");
    section.className = "reader-section reader-discovery";
    section.dataset.forId = activeId;

    let surpriseMarkup = "";
    if (surprise?.item) {
      const names = displayNames(surprise.item);
      const viaName = surprise.via ? displayNames(surprise.via).primary : "";
      const route = viaName
        ? "「" + viaName + "」を経由して2歩先"
        : "今の語から少し離れた関係";
      surpriseMarkup =
        '<button class="discovery-surprise" type="button" data-reader-term="' + escapeAttribute(surprise.item.id) + '">' +
          '<span class="discovery-label">意外な隣接語</span>' +
          '<strong>' + escapeHtml(names.primary) + '</strong>' +
          '<span class="discovery-route">' + escapeHtml(route) + '</span>' +
          '<p>' + escapeHtml(surprise.item.one_liner) + '</p>' +
          '<span class="discovery-arrow" aria-hidden="true">→</span>' +
        '</button>';
    }

    section.innerHTML =
      '<p class="reader-kicker">少し遠くへ</p>' +
      surpriseMarkup +
      '<div class="discovery-walk">' +
        '<div class="discovery-walk-head">' +
          '<span>3歩だけ寄り道</span>' +
          '<button type="button" data-discovery-refresh>別の道</button>' +
        '</div>' +
        '<ol class="discovery-path">' + pathMarkup(activeId, walk) + '</ol>' +
      '</div>';

    const relations = readerContent.querySelector(".reader-relations");
    const feelings = readerContent.querySelector(".reader-feelings");
    if (relations) relations.insertAdjacentElement("afterend", section);
    else if (feelings) feelings.insertAdjacentElement("beforebegin", section);
    else readerContent.appendChild(section);
  }

  function refreshWalk() {
    const section = readerContent.querySelector(".reader-discovery");
    if (!section || !state.activeItemId) return;
    walkSalt += 1;
    const path = section.querySelector(".discovery-path");
    if (path) path.innerHTML = pathMarkup(state.activeItemId, buildWalk(state.activeItemId));
  }

  readerContent.addEventListener("click", (event) => {
    const refresh = event.target.closest("[data-discovery-refresh]");
    if (!refresh) return;
    event.preventDefault();
    refreshWalk();
  });

  window.addEventListener("click", (event) => {
    const button = event.target.closest("#randomButton");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = dailyItem();
    if (item) openTerm(item.id, button);
  }, true);

  const observer = new MutationObserver(() => renderReaderDiscovery());
  observer.observe(readerContent, { childList: true });

  async function loadRelations() {
    const urls = [
      "./data/relations.json?v=" + Date.now(),
      "https://raw.githubusercontent.com/silovar-uk/vocabularies/main/data/relations.json",
    ];
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!data || Array.isArray(data) || typeof data !== "object") throw new Error("Invalid relation data");
        relationMap = data;
        renderReaderDiscovery();
        return;
      } catch (error) {
        console.warn("Discovery relation load failed:", url, error);
      }
    }
  }

  loadRelations();
})();
