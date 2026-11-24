# ContributionLedger

[English](README.md) | 简体中文 | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

把压缩后的工程会话摘要，整理成一份可复核的开源贡献线索账本。

ContributionLedger 刻意保持小而确定：

- **离线。** 不联网、不调用 LLM、不使用数据库。
- **证据优先。** 每个案例都能回溯到 session id、block index 和 topic。
- **历史即历史。** 记录的阶段是当时会话里的说法，不代表上游项目当前的状态。
- **隐私防护。** 报告不复制原始摘要；常见密钥会被标记并脱敏。

它不是自动提 issue 的机器。它只生成线索，由人工复现、验证，再与维护者沟通。

## 为什么

长时间运行的 Agent 会话里有很多有用的调试证据，但这些证据散落在压缩块中。把摘要直接贴进公开 issue 既吵，也可能泄露隐私。ContributionLedger 只提取可复现的部分：

- 组件与症状
- 症状出现过的不同会话
- 会话中记录的阶段（提及、已诊断、已本地修复、已提交、已合并）
- 文本中出现的 GitHub issue/PR 引用
- 前后结论之间的矛盾
- 下一步人工动作

## 环境要求

- Node.js 22 或更高版本
- 从你的会话存储导出的 JSONL 清单

## 用法

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

选项：

```text
-i, --input <file>       要读取的 JSONL 清单（必填）
-o, --out <dir>          输出目录（默认：./contributionledger-out）
    --min-sessions <n>   只保留至少出现在 n 个会话中的案例（默认：1）
-h, --help               显示帮助
-v, --version            显示版本
```

输出：

```text
contributionledger-out/
  report.md     人类可读的队列与证据
  cases.json    供后续工具使用的结构化案例
```

输入文件以只读方式打开，工具不会修改它。

## 输入格式

每行一个 JSON 对象：

```json
{
  "id": "session-123",
  "title": "CodeArts 图片能力",
  "blockDetails": [
    {
      "topic": "图片支持",
      "summary": "模型文档写的是纯文本，但内核实际发送了真实图片。"
    }
  ]
}
```

`blocks` 可以作为 `blockDetails` 的别名。每个块需要 `topic` 和 `summary`。详见 [docs/input-format.md](docs/input-format.md)。

## 案例如何生成

1. 读取每个会话和压缩块。
2. 对 `topic + summary` 运行保守的症状规则。
3. 提取 GitHub 引用、报告阶段、矛盾和隐私标记。
4. 按组件与症状分组。
5. 按不同会话数、本地修复、上游引用、矛盾数和出现次数排序。
6. 输出队列与证据。

十条内置规则覆盖本项目提炼自的领域：CodeArts 图片能力、OpenCode 插件生命周期、MCP 进程生命周期、推理元数据、上下文压缩、DSH 启动、GridDraft AOA 拓扑、Word 报告结构、字幕覆盖率和 Magpie provider 元数据。

## 报告阶段

| 阶段 | 含义 |
|---|---|
| `mentioned` | 只提到了症状，尚未诊断 |
| `diagnosed` | 已报告根因 |
| `local-fix-reported` | 已报告本地修复 |
| `upstream-submitted` | 已报告 issue 或 PR |
| `duplicate-reported` | 已作为重复项关闭 |
| `merged-reported` | 会话中报告为已合并 |

`merged-reported` 不代表上游项目当前已经合并。采取行动前请重新检查链接。

## 隐私

- 报告不包含原始摘要文本。
- 会检测常见 API key、GitHub token、Slack token、认证头、私钥、base64 图片载荷和 password 赋值。
- 检测到的值会从 `cases.json` 保留的 topic 中脱敏；报告只显示标记名称。
- 真实会话数据不应提交到公开仓库。测试和演示请使用合成 fixture。

没有扫描器是完美的。分享 `cases.json` 前请先检查。

## 开发

```bash
npm test
npm run check
node bin/contributionledger.mjs --input tests/fixtures/synthetic.jsonl --out /tmp/contributionledger-demo
```

测试套件只使用 `node:test` 和 Node 标准库。

## 局限

- 规则刻意收窄。漏报比自信的误报更好。
- 工具不读取完整聊天记录或工具日志，只处理你提供的压缩清单。
- 无法判断已报告的上游 issue 现在是否仍打开。
- 不会自动提 issue 或开 pull request。

## 许可证

MIT。详见 [LICENSE](LICENSE)。