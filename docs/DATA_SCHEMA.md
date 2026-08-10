# Vocabularies Data Schema v2

Vocabulariesでは、語彙本文と「どう見せるか／どう分類するか」を分離する。

## 1. ファイルの役割

- `data/vocabularies.json` — 基本語彙
- `data/research-*.json` — 調査単位で追加した語彙セット
- `data/meta-vocabularies.json` — Vocabularies自身を説明するメタ語彙
- `data/catalog.json` — データセット、表記、別名、正式度、分野体系、検索比較の設計図
- `data/relations.json` — 語と語の関係。本文とは独立して育てる

新しい語彙セットを追加するときは、語彙JSONを作り、`catalog.json` の `datasets` にパスを追加する。

## 2. 語彙本文の基本フィールド

```json
{
  "id": "signifier",
  "term": "Signifier",
  "ja": "シグニファイア",
  "fields": ["Design", "UI", "UX"],
  "one_liner": "何ができるかを、知覚できる手掛かりとして伝える。",
  "description": "...",
  "why_selected": "...",
  "feelings": ["押せるか分からない"],
  "before": "...",
  "after": "...",
  "related": ["affordance"],
  "sources": ["https://..."],
  "status": "researched"
}
```

本文データは概念の意味と利用例に集中させる。表記上の例外や検索用の別名は、原則 `catalog.json` に置く。

## 3. catalog.json の term metadata

```json
{
  "signifier": {
    "primary_language": "ja",
    "formal_status": "established_term",
    "aliases": ["シグニファイヤー", "操作の手掛かり"],
    "usage_note": "..."
  }
}
```

### primary_language

- `ja` — 日本語を主表記にする。デフォルト
- `en` — 英語名で扱う方が実務上自然な語のみ

英語を主表記にするかは、英語の方が格好いいかではなく、日本語圏でその専門語が実際にどう扱われるかで決める。

### aliases

検索用の別名・表記揺れ・略称・よくある記憶違い。

正式名称の代わりにはしない。例：

- `Signifiant` → `シグニフィアン`, `記号表現`
- `Tesler's Law` → `テスラー`, `複雑性保存則`

### formal_status

| value | 表示 | 意味 |
|---|---|---|
| `established_term` | 専門語 | 特定分野で定着した専門語・概念 |
| `design_principle` | 設計原則 | HCI・UX等で明示的に用いられる設計原則 |
| `heuristic` | ヒューリスティック | 有用な経験則。自然科学の法則とは区別する |
| `editorial_principle` | 編集・制作原理 | 制作・編集上の原理として採用する表現 |
| `project_meta` | この語彙集でのメタ概念 | Vocabularies内で横断的に使う独自の位置づけ |

「専門用語っぽく見えるものをすべて同じ強さで扱わない」ためのフィールド。

### usage_note

正式な用法と、Vocabularies内での拡張的な使い方を区別する注記。

例：

- `Timbre` は音響・音楽では正式な専門語。UIや文章の「質感」に使う場合は比喩的拡張。
- `Tesler's Law` は「法則」という名前だが、科学法則ではなく設計上のヒューリスティック。

## 4. 分野の二層構造

語彙側の `fields` は細かな分野を保持する。

一方、`catalog.json` の `taxonomy` で、発見UI用の上位分類を定義する。

現在の上位分類：

1. デザイン・インタラクション
2. ことば・記号
3. 認知・感情・学習
4. 表現・芸術
5. 思想・メタ
6. 実践・システム

細かな分類を捨てず、初見で処理する分類数だけを減らす。

## 5. Relationsとの役割分担

語彙本文の `related` は最低限の後方互換用。

精密な関係は `data/relations.json` に置く。

```json
{
  "id": "signifiant",
  "type": "混同注意",
  "note": "記号論のシニフィアンとは別概念。"
}
```

将来的には `related` をRelationsから自動生成できる状態を目指す。

## 6. Search contrast

「似ているが違う」組み合わせは `catalog.json` の `search_contrasts` に置く。

検索ロジックへ個別語をハードコードしない。

## 7. 追加時のチェック

新しい語を追加するときは、最低限次を確認する。

- 既存語と重複していないか
- 日本語／英語のどちらを主表記にするのが自然か
- aliasesは必要か
- formal_statusは何か
- 比喩的・拡張的な使用ならusage_noteが必要か
- fieldsは既存taxonomyで扱えるか
- 近接語との差をrelationsで説明できるか
- 信頼できるsourceがあるか

Vocabulariesでは、語の数より「その語をどの強さ・文脈で扱っているかが分かること」を優先する。
