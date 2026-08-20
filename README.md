# Read Frog Minimal

Read Frog Minimal 是 [Read Frog](https://github.com/mengxi-ream/read-frog) 的非官方、独立维护 fork。它基于上游 `v1.46.3`（[`61b3e76c`](https://github.com/mengxi-ream/read-frog/commit/61b3e76c3664006fd4cd2a265b3dab4fd025889d)）进行裁剪，只保留 local-first 的网页翻译主链路，主要用于本地构建和个人使用。

翻译请求直接发送到用户选择的 Provider；本 fork 不依赖 Read Frog 账号、托管 AI、云端同步或遥测服务。

> [!IMPORTANT]
>
> 本项目不是 Read Frog 官方发行版，也不由上游维护者提供支持。Read Frog Minimal 的问题和改动请在本仓库处理；如需完整功能、官方发行版或官方支持，请使用上游 [Read Frog](https://github.com/mengxi-ream/read-frog)。

## 为什么有这个 fork

Read Frog 是一个功能完整的开源语言学习与翻译扩展。Read Frog Minimal 面向更窄的需求：保留成熟的网页翻译体验，同时移除账号、Hosted AI、云同步、遥测、社区与商业化入口，以及字幕、划词工具栏、TTS 等不属于网页翻译主链路的功能。

这不是对上游项目的替代，而是一个有意缩小范围的衍生版本。项目不以维持很小的 upstream diff 或持续同步全部上游功能为目标。

## 与上游的关系

本项目建立在 Read Frog 作者和贡献者的工作之上，沿用了其网页翻译内核、双语渲染、Provider 架构和界面基础。感谢他们将这些成果以开源方式发布。

- 上游项目：[mengxi-ream/read-frog](https://github.com/mengxi-ream/read-frog)
- fork 基线：Read Frog `v1.46.3`，commit [`61b3e76c`](https://github.com/mengxi-ream/read-frog/commit/61b3e76c3664006fd4cd2a265b3dab4fd025889d)
- 维护方式：独立演进；按需参考或移植上游修复，不承诺持续保持兼容
- 发行方式：目前仅面向本地构建，不提供官方商店版本

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

## 范围与实现规格

完整功能边界、数据策略、迁移规则、实现约束和验收标准见 [MINIMAL_SPEC.md](./MINIMAL_SPEC.md)。

## License

本项目延续上游的开源许可，并保留上游提交历史与版权信息。详见 [GNU General Public License v3.0](./LICENSE)。
