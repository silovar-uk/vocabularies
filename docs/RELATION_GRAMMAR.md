# Relation Grammar

Vocabulariesでは、**人が読む関係名**と**機械が扱う関係の意味**を分離する。

```text
Human Relation Label
        ↓
Canonical Relation Kind
        ↓
UI / Validation / Concept Map
```

## Source of truth

Canonical Relation Kindの正本はルートの `relation-grammar.js`。

Relation dataset側の各edgeへ `kind` を重複保存しない。

## Human Relation Label

`data/relations*.json` の `type` はReaderで読むための自然な日本語を保持する。

例：

- `兆候`
- `改善手段`
- `品質への影響`
- `安全網`
- `対概念`
- `理解の鍵`

Readerではこの表現をそのまま表示する。

## Canonical Relation Kind

現在は7種類。

| Kind | 意味 | Semantic Index |
| --- | --- | --- |
| `SIGNAL` | 兆候・きっかけ | `!` |
| `CONTRAST` | 区別・比較・対立 | `↔` |
| `STRUCTURE` | 構成・内訳・成立 | `+` |
| `ACTION` | 方法・改善・適用 | `→ / ←` |
| `INFLUENCE` | 影響・負担・結果 | `→ / ←` |
| `SUPPORT` | 支援・補完・安全網 | `→ / ←` |
| `NEAR` | 近接・学習上の接続 | `≈` |

方向を持つkindは、incomingなら `←`、outgoingなら `→`、相互なら `↔` を使う。

## Strict typed relations

`data/relations*.json` に追加する `type` は、必ず `relation-grammar.js` のどれか1つのCanonical Kindへ登録する。

`scripts/validate-relation-grammar.mjs` が次を検証する。

- 未知のrelation typeがない
- 同じhuman labelが複数kindへ重複登録されていない
- Canonical Kindの定義が欠けていない

未知typeはCI error。

新しいHuman Relation Labelを使いたい場合は、edgeごとに `kind` を足すのではなく、`relation-grammar.js` へ1回だけ登録する。

## Concept Map editorial verbs

Concept Mapのessay relationsでは、`type` ではなく自由な `verb` を使っている。

例：

- `余白で支える`
- `目立ち方と比べる`
- `複雑さの行き先を見る`

これらは文章としての表現力を残すため、typed relationのような完全登録制にはしていない。

ただし、Concept Mapも `relation-grammar.js` の共通verb hintsを利用してCanonical Kindへ寄せる。分類できないverbは `NEAR` へfallbackする。

このfallbackは現在はerrorにしない。Human Relation LabelとEditorial Verbは役割が異なるため。

## Page roles

- **Library / Semantic Index** — 関係の性質を小さな記号で感じる
- **Reader** — 正確なHuman Relation Labelとnoteを読む
- **Concept Map** — 自由なeditorial verbを辿って関係を探索する

3画面を同じ表現へ統一しない。共有するのは意味のGrammarだけ。

## Adding a relation

1. `data/relations*.json` にhuman-readableな `type` と `note` を書く
2. 新しい `type` なら `relation-grammar.js` でCanonical Kindを1つ決める
3. `node scripts/validate-data.mjs`
4. `node scripts/validate-relation-grammar.mjs`
5. Reader / Semantic Index / Concept Mapの代表例を確認する

UI側へrelation typeごとの例外を追加しない。
