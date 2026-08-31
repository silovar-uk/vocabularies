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

  const VERB_HINTS = Object.freeze([
    Object.freeze({ kind: 'SIGNAL', terms: Object.freeze(['兆候', '気づ', '入口', '見つけ']) }),
    Object.freeze({ kind: 'CONTRAST', terms: Object.freeze(['比べ', '分け', '区別', '対照', '違い', '緊張', '両立']) }),
    Object.freeze({ kind: 'STRUCTURE', terms: Object.freeze(['構成', '内訳', '全体', '組む', '層']) }),
    Object.freeze({ kind: 'SUPPORT', terms: Object.freeze(['支える', '守る', '助ける', '安全']) }),
    Object.freeze({ kind: 'INFLUENCE', terms: Object.freeze(['影響', '負担', '高める', '弱める', '増やす', '縮める']) }),
    Object.freeze({ kind: 'ACTION', terms: Object.freeze(['改善', '整える', '減らす', '調整', '使う', 'つなぐ', '渡る', '広げる', '作る', '測る']) }),
  ]);

  const FAMILY_DEFINITIONS = Object.freeze({
    DISTINGUISHING: Object.freeze({ label: '比べる', description: '差・対立・両立を見る' }),
    SUPPORTING: Object.freeze({ label: '支える', description: '別の概念を補助・保護する' }),
    EXPANDING: Object.freeze({ label: '広げる', description: '視野や適用範囲を先へ広げる' }),
    CONNECTING: Object.freeze({ label: 'つなぐ', description: '別領域・別概念を橋渡しする' }),
    REDUCING: Object.freeze({ label: '減らす', description: '負担・幅・距離を小さくする' }),
    TRANSFERRING: Object.freeze({ label: '移す', description: '負担・注意・処理を別の場所へ渡す' }),
    TRACING: Object.freeze({ label: 'たどる', description: '原因・結果・差・行き先を観察する' }),
    BUILDING: Object.freeze({ label: '組み立てる', description: '構造・理解・状態を形成する' }),
    APPLYING: Object.freeze({ label: '使う', description: '概念を設計・判断・改善へ適用する' }),
    FRAMING: Object.freeze({ label: '見方を変える', description: '問い・文脈・焦点を組み替えて捉える' }),
  });

  const FAMILY_HINTS = Object.freeze([
    Object.freeze({ family: 'DISTINGUISHING', terms: Object.freeze(['比べ', '比較', '分け', '区別', '対照', '違い', '緊張', '両立', '混同']) }),
    Object.freeze({ family: 'SUPPORTING', terms: Object.freeze(['支える', '支援', '守る', '助け', '補う', '安全', '下支え', '示す']) }),
    Object.freeze({ family: 'REDUCING', terms: Object.freeze(['減ら', '縮め', '抑え', '絞', '狭め', '手放', '空け', '速く', '軽く', '小さく']) }),
    Object.freeze({ family: 'TRANSFERRING', terms: Object.freeze(['預け', '移す', '移る', '外へ', '外部化', '分散', '引き取', '渡す', '委ね', '置き換']) }),
    Object.freeze({ family: 'CONNECTING', terms: Object.freeze(['つなぐ', 'つなが', '接続', '結ぶ', '橋渡', '連携', '渡る', '横断', '関連づけ']) }),
    Object.freeze({ family: 'EXPANDING', terms: Object.freeze(['広げ', '全体へ', '展開', '発展', '深め', '先へ', '拡張', '周辺へ', '進む', '増や', '戻る']) }),
    Object.freeze({ family: 'BUILDING', terms: Object.freeze(['作る', '置く', '載せ', '組む', '構成', '形成', '統合', '加える', '更新', '積み上げ', '組み立て', '分解', '構造化']) }),
    Object.freeze({ family: 'APPLYING', terms: Object.freeze(['使う', '活か', '改善', '調整', '実装', '実現', '設計', '適用', '選ぶ', '決める', '固定', '制約', '整える', '合わせ', '扱う', '自動化']) }),
    Object.freeze({ family: 'FRAMING', terms: Object.freeze(['捉え', '位置づけ', '見方', '文脈', '焦点', '切り分け', '問い', '読み替', '考える', '具体化']) }),
    Object.freeze({ family: 'TRACING', terms: Object.freeze(['見る', '追う', 'たど', '測る', '見つけ', '気づ', '行き先', '読む', '観察', '検証', '知る', '把握', '発見', '確認', '学ぶ', '予測']) }),
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

  function familyDefinition(family) {
    return FAMILY_DEFINITIONS[family] ?? null;
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

  function classifyVerbFamily(verb) {
    const raw = String(verb ?? '').trim();
    for (const rule of FAMILY_HINTS) {
      if (rule.terms.some((term) => raw.includes(term))) {
        const definition = familyDefinition(rule.family);
        return Object.freeze({ family: rule.family, ...definition, raw });
      }
    }
    return null;
  }

  function notation(kind, options = {}) {
    const definition = kindDefinition(kind);
    if (!definition.directed) return definition.symbol;
    if (options.reciprocal) return '↔';
    return options.direction === 'incoming' ? '←' : '→';
  }

  globalThis.VocabularyRelationGrammar = Object.freeze({
    version: 2,
    kinds: KIND_DEFINITIONS,
    typeGroups: TYPE_GROUPS,
    verbHints: VERB_HINTS,
    families: FAMILY_DEFINITIONS,
    familyHints: FAMILY_HINTS,
    duplicateTypes: Object.freeze([...duplicateTypes]),
    knownTypes: Object.freeze([...typeToKind.keys()]),
    classifyType,
    classifyVerb,
    classifyVerbFamily,
    notation,
    kindDefinition,
    familyDefinition,
  });
})();
