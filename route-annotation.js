(() => {
  const STORAGE_KEY = 'vocabularies:route-annotations:v1';
  const MAX_NOTE_LENGTH = 160;
  let editingRouteId = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) { return escapeHtml(value); }

  function readAnnotations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  function writeAnnotations(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function routes() { return window.VocabularyTrail?.getRoutes?.() ?? []; }
  function routeById(id) { return routes().find((route) => route.id === id) ?? null; }
  function routeIdFromCard(card) { return card.querySelector('[data-delete-route]')?.dataset.deleteRoute || ''; }
  function noteFor(data, routeId, index) { return String(data?.[routeId]?.[index] ?? '').trim(); }

  function renderReadView(route, data) {
    const notes = route.items.map((item, index) => ({ item, note: noteFor(data, route.id, index) })).filter((row) => row.note);
    if (!notes.length) return '<p class="route-annotation-empty">まだ注釈はありません。各語をどう読んだか、なぜ次へ進んだかを残せます。</p>';
    return '<div class="route-annotation-read">' + notes.map((row) =>
      '<div class="route-annotation-read-row"><span class="route-annotation-term">' + escapeHtml(row.item.label || row.item.id) + '</span><p>' + escapeHtml(row.note) + '</p></div>'
    ).join('') + '</div>';
  }

  function renderEditor(route, data) {
    return '<div class="route-annotation-editor">' +
      '<div class="route-annotation-editor-head"><div><strong>Route Annotation</strong><span>各語に短い思考メモを残す。空欄でも保存できます。</span></div><span>最大' + MAX_NOTE_LENGTH + '字 / 語</span></div>' +
      '<div class="route-annotation-fields">' + route.items.map((item, index) =>
        '<label class="route-annotation-field"><span><b>' + (index + 1) + '</b>' + escapeHtml(item.label || item.id) + '</span>' +
        '<textarea maxlength="' + MAX_NOTE_LENGTH + '" data-annotation-index="' + index + '" placeholder="例：ここで個人の負担から、環境の設計へ視点を移した。">' + escapeHtml(noteFor(data, route.id, index)) + '</textarea></label>'
      ).join('') + '</div>' +
      '<div class="route-annotation-actions"><button type="button" data-save-annotations="' + escapeAttr(route.id) + '">注釈を保存</button><button type="button" data-cancel-annotations>やめる</button></div>' +
    '</div>';
  }

  function enhanceCard(card) {
    if (card.dataset.annotationEnhanced === 'true') return;
    const id = routeIdFromCard(card);
    const route = routeById(id);
    if (!id || !route) return;

    card.dataset.annotationEnhanced = 'true';
    card.dataset.routeId = id;

    const head = card.querySelector('.concept-route-card-head');
    if (head) {
      const actions = document.createElement('div');
      actions.className = 'route-annotation-head-actions';
      const deleteButton = head.querySelector('[data-delete-route]');

      const essayLink = document.createElement('a');
      essayLink.href = './route-essay.html?route=' + encodeURIComponent(id);
      essayLink.className = 'route-essay-open';
      essayLink.textContent = '論考で読む';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.dataset.editAnnotations = id;
      editButton.textContent = '注釈';

      actions.appendChild(essayLink);
      actions.appendChild(editButton);
      if (deleteButton) actions.appendChild(deleteButton);
      head.appendChild(actions);
    }

    const section = document.createElement('section');
    section.className = 'route-annotation-section';
    section.dataset.annotationSection = id;
    card.appendChild(section);
    renderCardAnnotation(card);
  }

  function renderCardAnnotation(card) {
    const id = card.dataset.routeId || routeIdFromCard(card);
    const route = routeById(id);
    const section = card.querySelector('[data-annotation-section]');
    if (!route || !section) return;
    const data = readAnnotations();
    section.innerHTML = editingRouteId === id ? renderEditor(route, data) : renderReadView(route, data);
    card.classList.toggle('is-annotating', editingRouteId === id);
  }

  function enhanceAll() { document.querySelectorAll('.concept-route-card').forEach(enhanceCard); }
  function rerenderAll() { document.querySelectorAll('.concept-route-card[data-annotation-enhanced="true"]').forEach(renderCardAnnotation); }

  function saveAnnotations(routeId, section) {
    const route = routeById(routeId);
    if (!route) return;
    const data = readAnnotations();
    const notes = {};
    section.querySelectorAll('[data-annotation-index]').forEach((textarea) => {
      const index = Number(textarea.dataset.annotationIndex);
      const value = String(textarea.value || '').trim().slice(0, MAX_NOTE_LENGTH);
      if (value) notes[index] = value;
    });
    if (Object.keys(notes).length) data[routeId] = notes;
    else delete data[routeId];
    writeAnnotations(data);
    editingRouteId = null;
    rerenderAll();
  }

  document.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit-annotations]');
    if (edit) {
      editingRouteId = edit.dataset.editAnnotations;
      rerenderAll();
      requestAnimationFrame(() => document.querySelector('.concept-route-card.is-annotating textarea')?.focus());
      return;
    }
    const save = event.target.closest('[data-save-annotations]');
    if (save) {
      const section = save.closest('.route-annotation-section');
      if (section) saveAnnotations(save.dataset.saveAnnotations, section);
      return;
    }
    if (event.target.closest('[data-cancel-annotations]')) {
      editingRouteId = null;
      rerenderAll();
    }
  });

  const observer = new MutationObserver(() => queueMicrotask(enhanceAll));
  function init() {
    const routeList = document.querySelector('.concept-routes-list');
    if (routeList) observer.observe(routeList, { childList: true });
    enhanceAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
