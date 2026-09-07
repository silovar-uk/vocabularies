(() => {
  const stats = document.querySelector('#auditStats');
  const clusters = document.querySelector('#cooldownClusters');
  const pairs = document.querySelector('#riskPairs');
  const axes = document.querySelector('#recentAxes');
  const principles = document.querySelector('#principles');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function load() {
    const response = await fetch('./data/semantic-governance.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function statusLabel(status) {
    return status === 'cooldown' ? 'クールダウン' : '要監視';
  }

  function render(data) {
    const cooldown = (data.cooldown_clusters ?? []).filter((item) => item.status === 'cooldown');
    const watch = (data.cooldown_clusters ?? []).filter((item) => item.status === 'watch');
    stats.innerHTML = `
      <div><strong>${cooldown.length}</strong><span>クールダウン中</span></div>
      <div><strong>${watch.length}</strong><span>要監視クラスタ</span></div>
      <div><strong>${(data.high_risk_pairs ?? []).length}</strong><span>近接ペア</span></div>
    `;

    clusters.innerHTML = (data.cooldown_clusters ?? []).map((cluster) => `
      <article class="cluster-card" data-status="${escapeHtml(cluster.status)}">
        <div class="cluster-topline">
          <span class="status-pill">${statusLabel(cluster.status)}</span>
          <span class="term-count">${(cluster.terms ?? []).length}語</span>
        </div>
        <h3>${escapeHtml(cluster.label)}</h3>
        <p>${escapeHtml(cluster.reason)}</p>
        <div class="term-cloud">${(cluster.terms ?? []).map((term) => `<code>${escapeHtml(term)}</code>`).join('')}</div>
      </article>
    `).join('');

    pairs.innerHTML = (data.high_risk_pairs ?? []).map((pair) => `
      <article class="pair-row">
        <div class="pair-names"><code>${escapeHtml(pair.a)}</code><span>↔</span><code>${escapeHtml(pair.b)}</code></div>
        <p>${escapeHtml(pair.note)}</p>
      </article>
    `).join('');

    axes.innerHTML = (data.recent_axes ?? []).map((item) => `
      <article class="axis-row">
        <code>${escapeHtml(item.term)}</code>
        <p>${escapeHtml(item.axis)}</p>
      </article>
    `).join('');

    principles.textContent = (data.principles ?? []).join(' ／ ');
  }

  load().then(render).catch((error) => {
    console.error(error);
    stats.textContent = '監査データを読み込めませんでした。';
  });
})();
