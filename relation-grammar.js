(() => {
  const KIND_DEFINITIONS = Object.freeze({
    SIGNAL: Object.freeze({ label: '兆候', symbol: '!', directed: false }),
    CONTRAST: Object.freeze({ label: '区別', symbol: '↔', directed: false }),
    STRUCTURE: Object.freeze({ label: '構成', symbol: '+', directed: false }),
    ACTION: Object.freeze({ label: '作用・手段', symbol: '→', directed: true }),
    INFLUENCE: Object.freeze({ label: '影響', symbol: '→', directed: true }),
    SUPPORT: Object.freeze({ label: '支援', symbol: '→', directed: true }),
    NEAR: Object.freeze({ label: '近接', symbol: '≈', directed: false }),
  });

  // Human labels stay expressive in relation datasets. This table is the
  // machine-readable semantic layer shared by the Library, Concept Map and CI.
  const TYPE_GROUPS = Object.freeze({
    SIGNAL: Object.freeze([
      '兆候', '兆候／負債', 'きっかけ', '入口',
    ]),
    CONTRAST: Object.freeze([
      '対概念', '混同注意', '対照', '区別', '機能／態度', '局所／全体',
      '緊張関係', '区切り／細分化', '比較', '観察対象が違う',
      '設計／結果', '部分／全体', '結果／設計', '素材／配置', '選択／配置',
      'トップダウン／目立ち', '期待／カテゴリー化', '目立ち／トップダウン',
      '事前／事後', '手掛かり／予告', '事後／事前', '理論／手掛かり',
      '設計上の緊張', 'トレードオフ',
    ]),
    STRUCTURE: Object.freeze([
      '構成', '成立原理', '構成要素', '分析軸', '使用の層', '構造レベル',
      '調整軸', '内訳', '構成原理', '構成概念', '評価軸',
    ]),
    ACTION: Object.freeze([
      '適用対象', '応用', '実現手段', '低減手段', '設計手段', '負担調整',
      '編集原理', '提示設計', '強調', '改善手段', '対応', '最初の一手',
      '改善',
    ]),
    INFLUENCE: Object.freeze([
      '文脈依存', '実行側', '実行の淵', '評価の淵', '処理負担',
      '除去の効果', '探索コスト', '品質への影響', '影響先', '問題化',
    ]),
    SUPPORT: Object.freeze([
      '補完', '探索支援', '支える要素', '予測支援', '予測材料', '探索条件',
      '安全網', '支える手段',
    ]),
    NEAR: Object.freeze([
      '理解の鍵', 'メタ接続', '近接概念', '近接原則', '横断',
      '学習との接点', '類似構図', '具体例', '近似構図', '類似区分',
      '近接状態', '適用文脈',
    ]),
  });

  // Essay relations intentionally use editorial verbs rather than typed labels.
  // These hints let Concept Map consume the same canonical grammar without
  // rewriting every essay relation or making UI code own ontology decisions.
  const VERB_HINTS = Object.freeze([
    Object.freeze({ kind: 'SIGNAL', terms: Object.freeze(['兆候', '気づ', '入口', '見つけ']) }),
    Object.freeze({ kind: 'CONTRAST', terms: Object.freeze(['比べ', '分け', '区別', '対照', '違い', '緊張', '両立']) }),
    Object.freeze({ kind: 'STRUCTURE', terms: Object.freeze(['構成', '内訳', '全体', '組む', '層']) }),
    Object.freeze({ kind: 'SUPPORT', terms: Object.freeze(['支える', '守る', '助ける', '安全']) }),
    Object.freeze({ kind: 'INFLUENCE', terms: Object.freeze(['影響', '負担', '高める', '弱める', '増やす', '縮める']) }),
    Object.freeze({ kind: 'ACTION', terms: Object.freeze(['改善', '整える', '減らす', '調整', '使う', 'つなぐ', '渡る', '広げる', '作る', '測る']) }),
  ]);

  const typeToKind = new Map();
  const duplicateTypes = new Set();
  for (const [kind, types] of Object.entries(TYPE_GROUPS)) {
    for (const type of types) {
      if (typeToKind.has(type) && typeToKind.get(type) !== kind) duplicateTypes.add(type);
      typeToKind.set(type, kind);
    }
  }

  function kindDefinition(kind) {
    return KIND_DEFINITIONS[kind] ?? KIND_DEFINITIONS.NEAR;
  }

  function classifyType(type) {
    const raw = String(type ?? '').trim();
    const kind = typeToKind.get(raw) ?? null;
    if (!kind) return null;
    return Object.freeze({ kind, ...kindDefinition(kind), raw, exact: true });
  }

  function classifyVerb(verb) {
    const raw = String(verb ?? '').trim();
    const exact = classifyType(raw);
    if (exact) return exact;
    for (const rule of VERB_HINTS) {
      if (rule.terms.some((term) => raw.includes(term))) {
        return Object.freeze({ kind: rule.kind, ...kindDefinition(rule.kind), raw, exact: false });
      }
    }
    return Object.freeze({ kind: 'NEAR', ...KIND_DEFINITIONS.NEAR, raw, exact: false });
  }

  function notation(kind, options = {}) {
    const definition = kindDefinition(kind);
    if (!definition.directed) return definition.symbol;
    if (options.reciprocal) return '↔';
    return options.direction === 'incoming' ? '←' : '→';
  }

  globalThis.VocabularyRelationGrammar = Object.freeze({
    version: 1,
    kinds: KIND_DEFINITIONS,
    typeGroups: TYPE_GROUPS,
    verbHints: VERB_HINTS,
    duplicateTypes: Object.freeze([...duplicateTypes]),
    knownTypes: Object.freeze([...typeToKind.keys()]),
    classifyType,
    classifyVerb,
    notation,
    kindDefinition,
  });
})();
