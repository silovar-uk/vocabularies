# Relation Grammar

Vocabulariesでは、**人が読む関係表現**と**機械が扱う関係の意味**を分離する。

```text
Human Relation Label / Editorial Verb
        ↓
Canonical Relation Kind
        ↓
UI / Validation
```

Concept Mapの自由なEditorial Verbには、さらに「どう読むか」を表す中間層を持つ。

```text
Canonical Relation Kind
        ↓
Verb Family
        ↓
Editorial Verb
```

Canonical KindとVerb Familyは同じ分類ではない。Kindはontology上の意味、Familyは人が関係を読むときの動作・視点を表す。

## Source of truth

Canonical Relation KindとVerb Familyの正本はルートの `relation-grammar.js`。

Relation datasetやessay relationの各edgeへ `kind` / `family` を重複保存しない。既存の自然な `type` / `verb` から中央Grammarで導出する。

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

## Concept Map Editorial Verb

Concept Mapのessay relationsでは、`type` ではなく自由な `verb` を使う。

例：

- `余白で支える`
- `目立ち方と比べる`
- `複雑さの行き先を見る`
- `外へ預ける`

154種類近い表現を少数の固定文言へ書き換えない。Editorial Verbは、そのrelationを読者へどう差し出すかという編集表現として残す。

## Verb Family

Editorial Verbの表現力を残したまま探索可能にするため、現在は10種類のVerb Familyを定義する。

| Family | 公開ラベル | 読み方 |
| --- | --- | --- |
| `DISTINGUISHING` | 比べる | 差・対立・両立を見る |
| `SUPPORTING` | 支える | 別の概念を補助・保護する |
| `EXPANDING` | 広げる | 視野や適用範囲を先へ広げる |
| `CONNECTING` | つなぐ | 別領域・別概念を橋渡しする |
| `REDUCING` | 減らす | 負担・幅・距離を小さくする |
| `TRANSFERRING` | 移す | 負担・注意・処理を別の場所へ渡す |
| `TRACING` | たどる | 原因・結果・差・行き先を観察する |
| `BUILDING` | 組み立てる | 構造・理解・状態を形成する |
| `APPLYING` | 使う | 概念を設計・判断・改善へ適用する |
| `FRAMING` | 見方を変える | 問い・文脈・焦点を組み替えて捉える |

FamilyはCanonical Kindの別名ではない。

例えば同じ `ACTION` 系の関係でも、「減らす」「移す」「使う」では読者が辿る思考方向が違う。また、同じVerb Familyが文脈によって異なるCanonical Kindに接続してもよい。

## Family derivation

各essay edgeへ `family` を手入力しない。

`relation-grammar.js` の `FAMILY_HINTS` がEditorial Verbの動詞核からFamilyを導出する。

```text
「余白で支える」
        ↓
SUPPORTING

「複雑さの行き先を見る」
        ↓
TRACING
```

154個すべてを列挙する巨大な辞書は作らない。共通する動詞核を少数のルールとして持ち、必要な場合のみルールを補強する。

## Coverage gate

`scripts/validate-relation-grammar.mjs` は全published essay relationを横断し、Verb Family coverageを計測する。

品質基準は **unique Editorial Verbの90%以上**。

導入時の実測値：

- 158 editorial edges
- 154 unique editorial verbs
- 10 Verb Families
- 153 / 154 verbs classified
- **99.4% coverage**

現在未分類として意図的に残している代表例は `感情領域の具体例にする`。100%達成のためだけに不自然なFamilyへ押し込まない。

新しいverb追加でcoverageが90%を下回る場合はCI errorになる。

## Concept Map filtering

Concept Mapのfilterは個々のEditorial VerbではなくVerb Familyを使う。

以前は154種類近いverbがほぼそのままfilter候補だったが、現在は「比べる / 支える / 広げる / つなぐ / 減らす / 移す / たどる / 組み立てる / 使う / 見方を変える」という読み方から探索する。

ただしroute本文では元のEditorial Verbを保持する。

```text
Filter: 支える

余白 → 主役を支える → 視覚的階層
状態の可視性 → 仕組み理解を支える → 概念モデル
```

つまり、**filterでは意味を圧縮し、routeでは表現を展開する**。

## Canonical Kind for Editorial Verb

Concept MapはEditorial Verbについても `relation-grammar.js` の共通verb hintsを利用してCanonical Kindへ寄せる。

分類できないverbはCanonical Kind上では `NEAR` へfallbackする。このfallbackはtyped relationの未知typeとは異なりerrorにしない。Editorial Verbは文章としての自由度を持つため。

Verb Familyも未分類を許すが、全体coverageを90%以上に保つ。

## Page roles

- **Library / Semantic Index** — Canonical Kindを小さな記号として感じる
- **Reader** — 正確なHuman Relation Labelとnoteを読む
- **Concept Map** — Verb Familyから入口を選び、自由なEditorial Verbを辿る

3画面を同じ表現へ統一しない。共有するのは意味のGrammarだけ。

## Adding a typed relation

1. `data/relations*.json` にhuman-readableな `type` と `note` を書く
2. 新しい `type` なら `relation-grammar.js` でCanonical Kindを1つ決める
3. `node scripts/validate-data.mjs`
4. `node scripts/validate-relation-grammar.mjs`
5. Reader / Semantic Indexの代表例を確認する

## Adding an Editorial Verb

1. essay relationへ自然なEditorial Verbを書く
2. edgeへ `family` / `kind` を手入力しない
3. `node scripts/validate-relation-grammar.mjs` でFamily coverageを確認する
4. 未分類なら、本当に新Familyが必要か、既存Familyの動詞核で説明できるかを先に考える
5. UI側へverb固有の例外を追加しない

分類数を増やすことではなく、**自由な文章表現を残しながら、探索可能な意味構造を維持すること**を目的にする。
