(() => {
  const selected = [];

  function routeId(card) {
    return card?.dataset.routeId || card?.querySelector('[data-delete-route]')?.dataset.deleteRoute || '';
  }

  function ensureBar() {
    let bar = document.querySelector('#routeCompareBar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'routeCompareBar';
    bar.className = 'route-compare-bar';
    bar.hidden = true;
    bar.innerHTML = '<div class="route-compare-bar-copy"><strong>Route Compare</strong><span class="route-compare-selection">2本選ぶと比較できます。</span></div>' +
      '<div class="route-compare-bar-actions"><button type="button" data-clear-route-compare>解除</button><a class="route-compare-go" aria-disabled="true">比較する →</a></div>';
    document.body.appendChild(bar);
    bar.querySelector('[data-clear-route-compare]').addEventListener('click', clear);
    return bar;
  }

  function sync() {
    const bar = ensureBar();
    const cards = [...document.querySelectorAll('.concept-route-card')];
    cards.forEach((card) => {
      const id = routeId(card);
      const button = card.querySelector('[data-compare-route]');
      const active = selected.includes(id);
      card.classList.toggle('is-compare-selected', active);
      if (button) {
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.textContent = active ? '比較中' : '比較';
      }
    });

    bar.hidden = selected.length === 0;
    const label = bar.querySelector('.route-compare-selection');
    const go = bar.querySelector('.route-compare-go');
    label.textContent = selected.length === 0 ? '2本選ぶと比較できます。' : selected.length === 1 ? 'あと1本選んでください。' : '2本のルートを比較します。';
    if (selected.length === 2) {
      go.href = './route-compare.html?a=' + encodeURIComponent(selected[0]) + '&b=' + encodeURIComponent(selected[1]);
      go.removeAttribute('aria-disabled');
    } else {
      go.removeAttribute('href');
      go.setAttribute('aria-disabled', 'true');
    }
  }

  function toggle(id) {
    if (!id) return;
    const index = selected.indexOf(id);
    if (index >= 0) selected.splice(index, 1);
    else {
      if (selected.length === 2) selected.shift();
      selected.push(id);
    }
    sync();
  }

  function clear() {
    selected.splice(0, selected.length);
    sync();
  }

  function enhanceCard(card) {
    if (card.dataset.compareEnhanced === 'true') return;
    const id = routeId(card);
    if (!id) return;
    card.dataset.compareEnhanced = 'true';
    const actions = card.querySelector('.route-annotation-head-actions') || card.querySelector('.concept-route-card-head');
    if (!actions) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.compareRoute = id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '比較';
    const deleteButton = actions.querySelector('[data-delete-route]');
    if (deleteButton) actions.insertBefore(button, deleteButton);
    else actions.appendChild(button);
  }

  function enhanceAll() {
    document.querySelectorAll('.concept-route-card').forEach(enhanceCard);
    sync();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-compare-route]');
    if (!button) return;
    toggle(button.dataset.compareRoute);
  });

  const observer = new MutationObserver(() => queueMicrotask(enhanceAll));
  function init() {
    ensureBar();
    const list = document.querySelector('.concept-routes-list');
    if (list) observer.observe(list, { childList: true });
    enhanceAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
