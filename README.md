# Read Frog Minimal

Read Frog Minimal 是一个 local-first 的开源网页翻译浏览器扩展。它只保留网页翻译主链路，翻译请求直接发送到所选 Provider，不依赖 Read Frog 账号、托管 AI 或云端同步服务。

## 保留功能

- 整页双语与仅译文模式
- 悬停/节点翻译、快捷键与自动翻译规则
- Google Translate、Microsoft Translate、DeepLX、DeepL
- OpenAI、Anthropic、Google、DeepSeek 等独立 BYOK Provider
- 自定义网页翻译 Prompt、AI 智能上下文与自定义 CSS
- 本地配置、备份、JSON 导入导出、翻译缓存

API Key 以明文保存在浏览器扩展的本地存储中。请只在可信设备上使用；导出配置时按需选择是否包含 API Key。

## 本地开发

需要 Node.js、pnpm 和 Chromium 系浏览器。

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
pnpm build:edge
pnpm build:firefox
```

Chrome 构建产物位于 `.output/chrome-mv3`，可在 `chrome://extensions` 中开启开发者模式后“加载已解压的扩展程序”。

## 验证

```bash
pnpm fmt:check
pnpm lint
SKIP_FREE_API=true pnpm test
pnpm build
pnpm build:edge
pnpm build:firefox
```

`SKIP_FREE_API=true` 会跳过依赖线上免费翻译服务的测试。

## 设计与范围

完整产品边界、迁移规则和验收标准见 [PRD.md](./PRD.md)。

## License

[GNU Affero General Public License v3.0](./LICENSE)
