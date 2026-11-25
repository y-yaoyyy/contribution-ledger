# ContributionLedger

> English is the canonical version. This translation may lag behind the latest features.

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語 | [한국어](README.ko.md) | [Español](README.es.md)

圧縮されたエンジニアリングセッションの要約を、レビュー可能なオープンソース貢献の台帳に変換します。

ContributionLedger は意図的に小さく、決定的に設計されています。

- **オフライン。** ネットワーク呼び出し、LLM 呼び出し、データベースを使用しません。
- **証拠優先。** 各ケースは session id、block index、topic に追跡できます。
- **設計上、記録は履歴です。** 記録された段階はその時点のセッションでの発言であり、上流プロジェクトの現在の状態ではありません。
- **プライバシーへの配慮。** 生の要約テキストはレポートにコピーされません。一般的なシークレットは検出され、マスクされます。

自動で issue を作成するツールではありません。人間が再現・検証し、メンテナと議論するための手がかりを生成します。

## なぜ

長時間実行されるエージェントセッションには有用なデバッグ証拠が含まれていますが、その証拠は圧縮ブロックに分散しています。要約をそのまま公開 issue に貼り付けるとノイズが多く、機密情報が漏れる可能性もあります。ContributionLedger は再現可能な形だけを抽出します。

- コンポーネントと症状
- 症状が現れた異なるセッション
- 記録された段階（言及、診断済み、ローカル修正済み、提出済み、マージ済み）
- テキスト内で見つかった GitHub issue/PR 参照
- 以前の結論と後の結論の矛盾
- 次に人間が行う操作

## 要件

- Node.js 22 以上
- セッションストアからエクスポートした JSONL インベントリ

## 使用方法

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

オプション:

```text
-i, --input <file>       読み込む JSONL インベントリ（必須）
-o, --out <dir>          出力ディレクトリ（既定: ./contributionledger-out）
    --min-sessions <n>   n 個以上のセッションで見られたケースだけを残す（既定: 1）
-h, --help               ヘルプを表示
-v, --version            バージョンを表示
```

出力:

```text
contributionledger-out/
  report.md     人間が読むためのキューと証拠
  cases.json    後続ツール用の構造化ケース
```

入力ファイルは読み取り専用で開かれ、ツールが変更することはありません。

## 入力形式

1 行につき 1 つの JSON オブジェクト:

```json
{
  "id": "session-123",
  "title": "CodeArts の画像能力",
  "blockDetails": [
    {
      "topic": "画像サポート",
      "summary": "モデルはテキスト専用と文書化されていたが、カーネルは実際の画像を送信していた。"
    }
  ]
}
```

`blocks` は `blockDetails` の別名として使用できます。各ブロックには `topic` と `summary` が必要です。詳細は [docs/input-format.md](docs/input-format.md) を参照してください。

## ケースの生成方法

1. 各セッションとブロックを読み取る。
2. `topic + summary` に対して保守的な症状ルールを実行する。
3. GitHub 参照、報告段階、矛盾、プライバシーフラグを抽出する。
4. コンポーネントと症状でグループ化する。
5. 異なるセッション数、ローカル修正、上流参照、矛盾、出現回数で順位付けする。
6. キューと証拠を出力する。

10 個の組み込みルールは、このプロジェクトの抽出元となった領域をカバーします。CodeArts の画像能力、OpenCode のプラグインライフサイクル、MCP のプロセスライフサイクル、推論メタデータ、コンテキスト圧縮、DSH の起動、GridDraft の AOA トポロジ、Word レポート構造、字幕カバレッジ、Magpie provider メタデータです。

## 報告段階

| 段階 | 意味 |
|---|---|
| `mentioned` | 症状が言及されたが、まだ診断されていない |
| `diagnosed` | 根本原因が報告された |
| `local-fix-reported` | ローカル修正が報告された |
| `upstream-submitted` | issue または PR が報告された |
| `duplicate-reported` | 重複としてクローズされた |
| `merged-reported` | マージ済みとして報告された |

`merged-reported` は、上流プロジェクトが現在マージ済みであることを意味しません。行動する前にリンクを再確認してください。

## プライバシー

- レポートには生の要約テキストは含まれません。
- 一般的な API キー、GitHub トークン、Slack トークン、認証ヘッダー、秘密鍵、base64 画像ペイロード、password 代入を検出します。
- 検出された値は `cases.json` に保持される topic からマスクされます。レポートにはフラグ名だけが表示されます。
- 実際のセッションデータを公開リポジトリにコミットしないでください。テストとデモには合成 fixture を使用してください。

完璧なスキャナーはありません。`cases.json` を共有する前に確認してください。

## 開発

```bash
npm test
npm run check
node bin/contributionledger.mjs --input tests/fixtures/synthetic.jsonl --out /tmp/contributionledger-demo
```

テストスイートは `node:test` と Node 標準ライブラリだけを使用します。

## 制限

- ルールは意図的に狭くしています。見逃しは、自信のある誤報よりも望ましいです。
- ツールは完全なチャット履歴やツールログを読みません。提供された圧縮インベントリだけを処理します。
- 報告された上流 issue が現在もオープンかどうかは判断できません。
- issue の作成や pull request のオープンは行いません。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。