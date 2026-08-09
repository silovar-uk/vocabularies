# Vocabularies

「なんかうまく言えない」を、より精密な言葉へ変えるための語彙集。

専門用語を知っている人のための辞典ではなく、**感覚・違和感・印象から専門語へたどり着く**ことを主役にした個人用の発見型ボキャブラリーサイトです。

## Concept

> うまく言葉にできない感覚から、より精密な概念・専門語へたどり着く。

入口は3つ持ちます。

1. **感覚から探す** — 「ごちゃごちゃ」「重い」「余韻がある」「文章が固い」などから探す
2. **分野から探す** — Design / Writing / Music / Emotion / Art などから探す
3. **用語から探す** — Progressive Disclosure / Prosody などを直接検索する

主役は 1 の「感覚から探す」です。

## Principles

- 網羅性より「知ったあとに見え方が変わる語」を優先する
- 専門語 → 定義ではなく、違和感 → 専門語の導線を重視する
- 分野ごとの縦割りではなく、関連概念を横断してつなぐ
- 1語ごとに Before → After を置き、実際の言語化に使える状態にする
- 出典を残し、専門用語の意味を独自解釈だけで固定しない
- UIを先に作り込みすぎず、実データから必要な体験を逆算する

## Initial fields

- Design / UI / Web
- Graphic Design
- Photography / Film / Art
- Music / Sound
- Writing / Literature / Linguistics
- Psychology / Cognition / Emotion
- Sociology / Philosophy
- Marketing / Communication
- Games / Sports / Body

## Repository structure

```text
/
├─ index.html
├─ styles.css
├─ app.js
├─ data/
│  └─ vocabularies.json
└─ docs/
   └─ PLANNING.md
```

## Development order

1. 思想を定義する
2. 「言葉に困った瞬間」を集める
3. 掲載する語の基準を決める
4. 1語のデータ構造を固める
5. 感覚語・分野・用語の3入口を設計する
6. 関連語をネットワーク化する
7. 20〜30語の実データで体験を検証する
8. その後にUIを磨く

詳細は [`docs/PLANNING.md`](docs/PLANNING.md) を参照。
