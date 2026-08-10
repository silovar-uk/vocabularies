# Editorial Intake

Vocabulariesへ新しい語を入れる前に、候補を**候補 → 調査 → 判定 → 関係 → 採用準備**の順で育てる。

目的は、語彙数を増やすことではなく、**収録判断の質を再現可能にすること**。

## Entry point

公開語彙集とは分離して、`/editorial.html` を編集用画面として使う。

この画面はGitHubへ直接書き込まない。候補はまずブラウザの`localStorage`へ保存し、必要に応じてJSONで出力する。

Canonicalな編集キューをリポジトリへ残す場合は `data/intake.json` を更新する。

## Workflow

### 1. captured — 候補

最初に必要なのは二つだけ。

- 候補語
- 何をうまく言えなかったか

この時点では正式名称、定義、分野を確定させない。

### 2. researching — 調査

最低1件の出典を持つ。

優先順位：

1. 一次資料・原典
2. 標準・規格
3. 査読研究
4. 大学・研究機関・美術館・専門機関
5. 信頼できる専門解説

一般辞典・二次解説だけでA判定にしない。

`editorial.html` の「調査プロンプト」は、この調査条件を含んだプロンプトを生成する。

### 3. qualified — 判定

次を確定する。

- A / B / C
- `formal_status`
- 日本語 / 英語どちらを主表記にするか
- `one_liner`
- `description`

Grade:

- **A — Strong**: 現在の位置づけのまま強く扱える
- **B — Qualified**: 訳語・適用範囲・拡張に注記が必要
- **C — Editorial**: 編集原理またはVocabularies内のメタ概念として扱う

### 4. related — 関係

最低1件、既存語とのtyped relationを持つ。

形式：

```text
target-id | relation type | difference note
```

例：

```text
signifier | 補完 | 操作後のFeedbackではなく、操作前に結果を予告する。
```

リンク数より、**差が一文で説明できるか**を優先する。

### 5. ready — 採用準備

最低限、次が揃っていること。

- 採用ID
- 分野
- 選定背景
- Before
- After
- 出典
- Relations

`editorial.html` の「採用JSON」は、この状態になった候補だけ有効になる。

生成されるbundle:

```json
{
  "dataset_item": {},
  "catalog_metadata": {},
  "relations": {}
}
```

この3点を本体データへ移す。

### 6. adopted / rejected

採用済み、または見送り。

見送り時は `decision_note` を残す。後から同じ候補を再調査する無駄を減らすため。

## Storage

### Browser queue

`editorial.html` での編集内容は以下のキーで端末内に保存する。

```text
vocabularies.editorial-intake.v1
```

### Repository queue

`data/intake.json`

Git管理したい候補だけをここへ置く。本体の`catalog.datasets`には含めない。

## Validation

編集キューだけを確認する場合：

```bash
node scripts/validate-intake.mjs
```

通常のGitHub Actionsでは、本体データ検証とEditorial Intake検証を両方実行する。

## Editorial rule

候補を思いついた時点で定義を書き始めない。

最初に記録すべきなのは、

> **その語を知らなかったために、何を「なんか」としか言えなかったか**

である。

Vocabulariesに必要なのは、知識として正しい語だけではなく、**知ったことで差が見えるようになる語**だから。
