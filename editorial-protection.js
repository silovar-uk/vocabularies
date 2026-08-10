(() => {
  const STORAGE_KEY = "vocabularies.editorial-intake.v1";
  const DRAFTS_KEY = "vocabularies.editorial-drafts.v1";
  const BACKUPS_KEY = "vocabularies.editorial-backups.v1";
  const TRASH_KEY = "vocabularies.editorial-trash.v1";
  const NEW_DRAFT_KEY = "__new__";
  const MAX_BACKUPS = 12;
  const MAX_TRASH = 50;

  const form = document.querySelector("#intakeForm");
  const toolbar = document.querySelector(".editorial-toolbar");
  const statusLine = document.querySelector("#intakeStatus");
  const advanced = document.querySelector("#advancedFields");
  if (!form || !toolbar) return;

  const originalSetItem = Storage.prototype.setItem;
  let draftTimer = null;
  let storageHealthy = true;
  let suppressDraft = false;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      storageHealthy = false;
      return fallback;
    }
  }

  function directWrite(key, value) {
    try {
      originalSetItem.call(localStorage, key, JSON.stringify(value));
      storageHealthy = true;
      return true;
    } catch (error) {
      storageHealthy = false;
      console.error("Editorial protection storage failed:", error);
      return false;
    }
  }

  function queueFromRaw(raw) {
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed?.candidates) ? parsed.candidates : [];
    } catch {
      return [];
    }
  }

  function queueSignature(candidates) {
    return JSON.stringify(candidates ?? []);
  }

  function saveBackup(candidates, reason) {
    const backups = readStorage(BACKUPS_KEY, []);
    const signature = queueSignature(candidates);
    if (backups[0]?.signature === signature) return;

    backups.unshift({
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      reason,
      signature,
      candidates: clone(candidates)
    });
    directWrite(BACKUPS_KEY, backups.slice(0, MAX_BACKUPS));
  }

  function saveDeleted(oldQueue, nextQueue) {
    const nextIds = new Set(nextQueue.map((item) => item.id));
    const removed = oldQueue.filter((item) => item?.id && !nextIds.has(item.id));
    if (!removed.length) return;

    const trash = readStorage(TRASH_KEY, []);
    for (const candidate of removed) {
      const duplicate = trash.some((entry) =>
        entry.candidate?.id === candidate.id &&
        String(entry.candidate?.updated_at ?? "") === String(candidate.updated_at ?? "")
      );
      if (duplicate) continue;
      trash.unshift({
        trash_id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        deleted_at: new Date().toISOString(),
        candidate: clone(candidate)
      });
    }
    directWrite(TRASH_KEY, trash.slice(0, MAX_TRASH));
  }

  Storage.prototype.setItem = function protectedSetItem(key, value) {
    if (this === localStorage && key === STORAGE_KEY) {
      const previousRaw = localStorage.getItem(STORAGE_KEY);
      if (previousRaw !== value) {
        const oldQueue = queueFromRaw(previousRaw);
        const nextQueue = queueFromRaw(value);
        if (previousRaw !== null) saveBackup(oldQueue, "変更前");
        saveDeleted(oldQueue, nextQueue);
      }
    }
    const result = originalSetItem.call(this, key, value);
    if (this === localStorage && [STORAGE_KEY, BACKUPS_KEY, TRASH_KEY].includes(key)) {
      queueMicrotask(renderProtection);
    }
    return result;
  };

  function field(id) {
    return document.querySelector(`#${id}`);
  }

  const fieldIds = [
    "candidateId", "candidateTerm", "candidateTrigger", "candidateWhyNow", "candidateJa", "candidateEn",
    "candidateProposedId", "candidateStage", "candidateGrade", "candidatePrimaryLanguage",
    "candidateFormalStatus", "candidateFields", "candidateAliases", "candidateFeelings",
    "candidateOneLiner", "candidateDescription", "candidateUsageNote", "candidateWhySelected",
    "candidateBefore", "candidateAfter", "candidateSources", "candidateRelations", "candidateDecisionNote"
  ];

  function draftKey() {
    return field("candidateId")?.value || NEW_DRAFT_KEY;
  }

  function currentDraft() {
    const values = {};
    for (const id of fieldIds) values[id] = field(id)?.value ?? "";
    return {
      key: draftKey(),
      saved_at: new Date().toISOString(),
      advanced_open: Boolean(advanced?.open),
      values
    };
  }

  function meaningfulDraft(draft) {
    if (!draft?.values) return false;
    return Object.entries(draft.values).some(([id, value]) => {
      if (["candidateId", "candidateStage", "candidatePrimaryLanguage", "candidateFormalStatus"].includes(id)) return false;
      return String(value ?? "").trim().length > 0;
    });
  }

  function saveDraft() {
    if (suppressDraft) return true;
    const draft = currentDraft();
    const drafts = readStorage(DRAFTS_KEY, {});
    if (meaningfulDraft(draft)) drafts[draft.key] = draft;
    else delete drafts[draft.key];
    const saved = directWrite(DRAFTS_KEY, drafts);
    renderProtection();
    return saved;
  }

  function clearDraft(key) {
    const drafts = readStorage(DRAFTS_KEY, {});
    if (!drafts[key]) return;
    delete drafts[key];
    directWrite(DRAFTS_KEY, drafts);
    renderProtection();
  }

  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 450);
  }

  function applyDraft(draft) {
    if (!draft?.values) return;
    suppressDraft = true;
    for (const [id, value] of Object.entries(draft.values)) {
      const input = field(id);
      if (input) input.value = value ?? "";
    }
    if (advanced) advanced.open = Boolean(draft.advanced_open);
    suppressDraft = false;
  }

  function candidateUpdatedAt(id) {
    if (!id) return "";
    const local = readStorage(STORAGE_KEY, { candidates: [] });
    return local?.candidates?.find((item) => item.id === id)?.updated_at ?? "";
  }

  function formHasMeaningfulContent() {
    return meaningfulDraft(currentDraft());
  }

  function restoreDraftForCurrent({ announce = true, force = false } = {}) {
    if (!force && formHasMeaningfulContent()) return false;
    const key = draftKey();
    const drafts = readStorage(DRAFTS_KEY, {});
    const draft = drafts[key];
    if (!meaningfulDraft(draft)) return false;

    const savedAt = candidateUpdatedAt(key);
    if (key !== NEW_DRAFT_KEY && savedAt && draft.saved_at <= savedAt) {
      clearDraft(key);
      return false;
    }

    applyDraft(draft);
    if (announce && statusLine) statusLine.textContent = key === NEW_DRAFT_KEY
      ? "入力途中の下書きを復元しました。"
      : "保存前の編集を復元しました。";
    return true;
  }

  function dateLabel(value) {
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return String(value ?? "");
    }
  }

  function ensurePanel() {
    let panel = document.querySelector("#protectionPanel");
    if (panel) return panel;
    panel = document.createElement("details");
    panel.id = "protectionPanel";
    panel.className = "editorial-protection";
    panel.innerHTML = `
      <summary>
        <span>稿保護</span>
        <span id="protectionSummary">下書き自動保存</span>
      </summary>
      <div class="editorial-protection-body">
        <section>
          <div class="editorial-protection-head">
            <div><h3>世代バックアップ</h3><p>キュー変更前の状態を最大${MAX_BACKUPS}世代保存します。</p></div>
          </div>
          <div id="backupList" class="editorial-protection-list"></div>
        </section>
        <section>
          <div class="editorial-protection-head">
            <div><h3>削除済み</h3><p>削除した候補は完全削除せず、ここから戻せます。</p></div>
          </div>
          <div id="trashList" class="editorial-protection-list"></div>
        </section>
      </div>`;
    toolbar.insertAdjacentElement("afterend", panel);
    return panel;
  }

  function renderProtection() {
    ensurePanel();
    const drafts = readStorage(DRAFTS_KEY, {});
    const backups = readStorage(BACKUPS_KEY, []);
    const trash = readStorage(TRASH_KEY, []);
    const summary = document.querySelector("#protectionSummary");
    const backupList = document.querySelector("#backupList");
    const trashList = document.querySelector("#trashList");
    if (!summary || !backupList || !trashList) return;

    const draftCount = Object.values(drafts).filter(meaningfulDraft).length;
    summary.textContent = storageHealthy
      ? `下書き${draftCount}件 · 履歴${backups.length}世代`
      : "保存エラー";

    backupList.innerHTML = backups.length
      ? backups.map((backup) => `
        <div class="editorial-protection-item" data-backup="${escapeHtml(backup.id)}">
          <span><strong>${escapeHtml(dateLabel(backup.created_at))}</strong><small>${escapeHtml(backup.reason || "変更前")} · ${backup.candidates?.length ?? 0}件</small></span>
          <button type="button" data-protect-action="restore-backup">復元</button>
        </div>`).join("")
      : '<p class="editorial-protection-empty">まだ履歴はありません。</p>';

    trashList.innerHTML = trash.length
      ? trash.map((entry) => `
        <div class="editorial-protection-item" data-trash="${escapeHtml(entry.trash_id)}">
          <span><strong>${escapeHtml(entry.candidate?.term || "名称未設定")}</strong><small>${escapeHtml(dateLabel(entry.deleted_at))}</small></span>
          <button type="button" data-protect-action="restore-trash">戻す</button>
        </div>`).join("")
      : '<p class="editorial-protection-empty">削除済み候補はありません。</p>';
  }

  function replaceQueue(nextCandidates) {
    const value = {
      schema_version: 1,
      updated_at: new Date().toISOString(),
      candidates: nextCandidates
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    location.reload();
  }

  document.addEventListener("click", (event) => {
    const edit = event.target.closest('[data-action="edit"]');
    const reset = event.target.closest("#resetCandidate");
    if (edit || reset) saveDraft();
  }, true);

  document.addEventListener("click", (event) => {
    const edit = event.target.closest('[data-action="edit"]');
    if (edit) {
      setTimeout(() => restoreDraftForCurrent({ force: true }), 0);
      return;
    }

    const reset = event.target.closest("#resetCandidate");
    if (reset) {
      setTimeout(() => restoreDraftForCurrent({ force: true }), 0);
      return;
    }

    const action = event.target.closest("[data-protect-action]");
    if (!action) return;

    if (action.dataset.protectAction === "restore-backup") {
      const row = action.closest("[data-backup]");
      const backup = readStorage(BACKUPS_KEY, []).find((item) => item.id === row?.dataset.backup);
      if (!backup) return;
      if (!confirm(`${dateLabel(backup.created_at)} のキューへ戻しますか？\n現在の状態も自動で履歴に残ります。`)) return;
      replaceQueue(clone(backup.candidates ?? []));
      return;
    }

    if (action.dataset.protectAction === "restore-trash") {
      const row = action.closest("[data-trash]");
      const trash = readStorage(TRASH_KEY, []);
      const entry = trash.find((item) => item.trash_id === row?.dataset.trash);
      if (!entry?.candidate) return;

      const current = queueFromRaw(localStorage.getItem(STORAGE_KEY));
      const index = current.findIndex((item) => item.id === entry.candidate.id);
      if (index >= 0 && !confirm("同じ候補IDが現在のキューにあります。削除済みの内容で置き換えますか？")) return;
      const restored = { ...clone(entry.candidate), updated_at: new Date().toISOString() };
      if (index >= 0) current[index] = restored;
      else current.unshift(restored);
      directWrite(TRASH_KEY, trash.filter((item) => item.trash_id !== entry.trash_id));
      replaceQueue(current);
    }
  });

  form.addEventListener("input", scheduleDraft);
  form.addEventListener("change", scheduleDraft);
  advanced?.addEventListener("toggle", scheduleDraft);

  form.addEventListener("submit", () => {
    const submittedKey = draftKey();
    setTimeout(() => clearDraft(submittedKey), 0);
  }, true);

  window.addEventListener("beforeunload", (event) => {
    clearTimeout(draftTimer);
    const saved = saveDraft();
    if (!saved && meaningfulDraft(currentDraft())) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  window.addEventListener("storage", (event) => {
    if ([STORAGE_KEY, DRAFTS_KEY, BACKUPS_KEY, TRASH_KEY].includes(event.key)) renderProtection();
  });

  ensurePanel();
  renderProtection();

  let initialRestoreDone = false;
  const tryInitialRestore = () => {
    if (initialRestoreDone) return;
    if (restoreDraftForCurrent()) initialRestoreDone = true;
  };
  const queue = document.querySelector("#intakeQueue");
  if (queue) {
    const observer = new MutationObserver(() => {
      if (initialRestoreDone) return observer.disconnect();
      setTimeout(() => {
        tryInitialRestore();
        observer.disconnect();
      }, 0);
    });
    observer.observe(queue, { childList: true });
    setTimeout(() => { tryInitialRestore(); observer.disconnect(); }, 900);
  } else {
    setTimeout(tryInitialRestore, 500);
  }

  if (statusLine) statusLine.textContent = "入力中は自動保存。キュー変更前は最大12世代、削除候補はごみ箱に保護します。";
})();
