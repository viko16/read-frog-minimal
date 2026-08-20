# Read Frog Minimal 产品需求文档

## 1. 产品定义

Read Frog Minimal 是基于开源项目 Read Frog 裁剪的、长期本地自用的浏览器网页翻译扩展。

唯一核心目标：

> 提供纯粹、稳定、Local-first、无需 Read Frog 账号或云服务的网页翻译能力。

产品保留 Read Frog 成熟的网页翻译内核、双语渲染、网页翻译配置、传统机器翻译 Provider 与第三方 BYOK AI Provider；删除账号、Hosted AI、同步、社区、商业化、AI Assistant 及其他不直接服务网页翻译的功能。

本项目不追求继续维持很小的 upstream diff。实现应优先保证本地构建、自用体验、代码边界清晰和废弃功能真正删除；但不无故重写稳定的网页翻译内核和 Provider 架构。

## 2. 核心使用流程

1. 本地构建并安装扩展。
2. 直接使用 Google Translate 或 Microsoft Translate，或按需添加 DeepLX、DeepL、第三方 AI Provider。
3. 打开网页。
4. 通过 Popup 或网页翻译快捷键触发翻译。
5. 在当前页面显示译文或双语内容。

用户不需要注册、登录、Read Frog Credits、Hosted AI、Google Drive 或任何 Read Frog Cloud 服务。

首次安装时不自动打开官网、Guide、Options 或其他页面。

## 3. 支持平台与扩展身份

- Chrome 是正式支持和功能验收目标。
- Edge 与 Firefox 继续保证生产构建成功，但不要求完整人工功能验收。
- 保留翻译任意网页所需的安装时全站权限，包括 `file://` 页面支持。
- Read Frog Minimal 使用独立扩展身份和固定开发 key，不复用官方扩展 ID。
- 不承诺从商店版 Read Frog 原地覆盖升级。
- 通过配置 JSON 导入保证当前 upstream v98 配置迁移到 Minimal。
- 产品版本以当前 `1.46.3` 为 Fork 基线，后续继续使用正常 SemVer；README 记录对应 upstream 基线。

## 4. 必须保留的网页翻译能力

以下能力完整保留：

- 整页翻译；
- 双语与纯译文模式；
- 页面主体或全部内容范围；
- 段落级/悬停翻译；
- 源语言自动检测与手动选择；
- 目标语言选择；
- 网页翻译 Provider 与 Model 选择；
- 内置 AI 翻译风格；
- 用户自定义网页翻译 Prompt；
- AI 智能上下文；
- 翻译样式和自定义 CSS；
- 网站禁用/启用规则；
- 始终翻译、永不自动翻译和语言级自动翻译规则；
- 内置及用户自定义站点解析规则；
- 请求速率、批处理、预加载和翻译缓存；
- 网页翻译与翻译模式快捷键；
- 必要的 iframe 注入、DOM 发现、语言检测、翻译队列和双语渲染。

“自定义网页翻译 Prompt”属于网页翻译能力，不属于待删除的 Custom AI Actions。

## 5. Provider 范围

### 5.1 传统翻译 Provider

保留当前独立运行的传统翻译 Provider：

- Google Translate；
- Microsoft Translate；
- DeepLX；
- DeepL API。

DeepL 虽然曾在旧功能树中遗漏，但属于独立 BYOK Provider，必须保留。

### 5.2 第三方 AI Provider

保留源码当前已经实现、且不依赖 Read Frog 账号、Credits 或 Hosted Backend 的第三方 AI Provider，包括但不限于：

- OpenAI；
- Anthropic；
- Google Gemini；
- DeepSeek；
- OpenRouter；
- Ollama；
- Groq；
- Azure OpenAI；
- Amazon Bedrock；
- OpenAI-compatible / Open Responses；
- 其他当前已有的独立 Provider。

不新增 Provider。用户继续可以配置 API Key、Endpoint/Base URL、模型、自定义模型、启用状态和排序。

### 5.3 商业合作 Provider

Jalapeno Cloud、Atlas Cloud 等若能脱离 Read Frog 账号独立运行，可作为手动添加的第三方 Provider 保留，但必须删除：

- 默认预置；
- Sponsor 标识；
- Referral；
- 合作网站桥接；
- Read Frog 官方归因 Header；
- 其他商业推荐露出。

### 5.4 首次安装默认值

- 新配置只预置 Google Translate 与 Microsoft Translate。
- 默认先使用 Microsoft Translate。
- 首次初始化后允许探测一次 Google Translate；可达时把仍处于 Microsoft 默认值的网页翻译切换到 Google。
- DeepLX、DeepL 与 AI Provider 由用户手动添加。
- 默认“始终翻译网站”列表为空，不再预置 Hacker News。

### 5.5 Provider 失效回退

当当前 Provider 被删除、禁用或因导入配置而不存在时：

1. 优先选择第一个仍启用且支持网页翻译的 Provider；
2. 若不存在可用 Provider，自动补回并选择 Microsoft Translate；
3. 不得因为单个 Provider 引用失效而重置整份配置；
4. API Key、Prompt、网站规则等其他配置必须保留。

## 6. Popup

Popup 只围绕“翻译当前网页”组织。

保留：

- 源语言、目标语言和自动检测；
- Provider / Model；
- LLM 翻译风格；
- 翻译模式；
- 翻译按钮；
- 当前网站启用/禁用；
- 当前网站始终翻译；
- 段落翻译热键；
- AI 智能上下文；
- Options 入口；
- 版本号。

删除：

- Avatar、Guest、登录和账户状态；
- Translation Hub；
- Discord；
- 通知、Blog、产品动态；
- “更多”菜单及产品、社区、官网、反馈、Roadmap、Changelog 等入口。

LLM 控件行为：

- 翻译风格只在当前网页 Provider 是 LLM 时显示；
- AI 智能上下文在传统翻译 Provider 下禁用，并提示需要 AI Provider；
- 从 LLM 临时切换到传统翻译 Provider 时保留开关值，切回 LLM 后恢复；
- 从 Hosted AI 迁移到 Microsoft 的旧配置例外：迁移时主动关闭该值。

## 7. Options

一级导航只保留：

```text
设置
├── API 提供商
├── 偏好设置
└── 快捷键

功能
└── 网页翻译
```

保留：

- Provider 配置、排序、模型和 Endpoint；
- 基础或 BYOK LLM 语言检测；
- 网页翻译 AI 智能上下文设置；
- 主题与界面语言；
- 翻译语言；
- 扩展启用规则；
- 手动 JSON 导入导出；
- 本地配置备份/恢复；
- 配置重置；
- 裁剪后的设置搜索/命令面板；
- 网页翻译全部高级设置；
- 网页翻译、翻译模式和段落翻译快捷键。

删除：账户菜单、Google Drive、Beta Experience、Analytics、What’s New、自定义 AI Actions、视频字幕、输入翻译、悬浮按钮、Selection Toolbar、Context Menu、TTS、Translation Hub、Roadmap、Help & Community 及其他产品导航。

## 8. 必须彻底删除的运行时功能

以下功能不能只隐藏 UI，必须删除入口、实现、后台初始化、消息、监听器、权限和专用依赖：

- Read Frog Account、Guest、Auth、Session、Profile、Subscription；
- Read Frog Hosted AI、Built-in AI、Credits、Usage、Quota、套餐与升级；
- `readfrog.app` 云 API、Blog、通知、产品配置、Guide、卸载调查；
- Google Drive Sync；
- Custom AI Actions、Selection Dictionary、Notebase；
- 视频字幕翻译与 AI 分段；
- 输入翻译；
- Floating Button；
- Selection Toolbar；
- Context Menu；
- TTS 与 Offscreen Document；
- Translation Hub；
- Chrome Side Panel / Firefox Sidebar；
- Partner Bridge；
- PostHog、Analytics、Telemetry、外部 Crash/Error 上报；
- 商业推荐、反馈、社区、Roadmap、Changelog 和商店评分入口。

共享模块必须保留仍服务网页翻译的分支。例如 Host content script、iframe 注入、背景流、网页翻译队列不能因曾与待删除功能共享而整体删除。

## 9. Local-first 数据策略

### 9.1 配置

Provider、API Key、Endpoint、Model、语言、翻译模式、风格、自定义网页 Prompt、AI 智能上下文、网页翻译高级设置、网站规则、主题和界面语言保存在 Extension Local Storage。

API Key 延续当前明文 Local Storage 方式，不引入没有可靠主密钥来源的伪加密。

### 9.2 本地备份

- 删除 Google Drive 同步、Token、同步镜像和 OAuth。
- 保留 Extension Local Storage 自动备份与恢复；自动备份包含 API Key。
- 保留手动 JSON 导入导出；默认导出不包含 API Key，用户明确选择后才包含，并显示警告。

### 9.3 本地数据库

- 保留网页翻译缓存；
- 保留 AI 智能上下文摘要缓存；
- 保持现有七天清理策略；
- 删除批请求节省比例等非核心本地 Usage 统计；
- 删除字幕分段及其他被裁功能的缓存表和清理逻辑。

## 10. v98 → Minimal 配置迁移

必须提供冻结快照式迁移，保证当前 upstream v98 配置或 JSON 导出可以导入 Minimal。

迁移要求：

- 保留 Provider、API Key、Endpoint、Model、语言、网页翻译设置、自定义网页 Prompt、网站规则和本地体验设置；
- 网页翻译若引用 Hosted AI，改为 Microsoft Translate；
- Hosted LLM 语言检测改为基础本地检测；
- 网页翻译由 Hosted AI 改为 Microsoft 时关闭 AI 智能上下文；
- 原本已使用 BYOK LLM 的网页翻译保留 AI 智能上下文；
- 删除所有已裁功能的配置字段；
- 未修改、未选择的赞助 Provider 默认行删除；已选择、配置或编辑过的保留并去除商业元数据；
- `autoTranslatePatterns` 恰好等于旧默认 `['news.ycombinator.com']` 时清空；包含其他网站时保留；
- 迁移失败不得静默覆盖完整旧配置；应记录明确错误并避免破坏原值；
- 更早版本可以先经过现有迁移链到 v98，再进入 Minimal 迁移，但只作 best effort。

迁移脚本必须使用内联冻结值，不得导入主代码常量、Helper 或共享类型。

## 11. Manifest 与入口

必须删除 `cookies`、`identity`、`contextMenus`、`sidePanel`、`offscreen` 权限。

保留并由实际功能证明用途：`storage`、`tabs`、`alarms`、`scripting`、`webNavigation` 与网页翻译所需全站 host permissions。`alarms` 用于本地备份及网页翻译/摘要缓存清理。

删除对应 WXT entrypoints：字幕、输入注入、Selection、Floating Button、Side Panel、Offscreen、Translation Hub、Guide/Partner Bridge。保留 Host、Popup、Options、Background 及网页翻译需要的注入脚本。

## 12. Read Frog Cloud 隔离

生产运行时必须完全独立于 `api.readfrog.app`、`www.readfrog.app` 和 `*.readfrog.app`。

要求：

- 生产 bundle 和生成的 Manifest 不包含 Read Frog 官方 endpoint/origin；
- 不发起或重试 Read Frog Auth、Hosted AI、Credits、Usage、Subscription、Blog、Notification、Telemetry 请求；
- 第三方 Provider Header 不得继续冒充 Read Frog 官方产品；
- 活跃 UI 不链接 Read Frog 官网文档；应使用 Provider 官方文档或无链接；
- 测试、注释、冻结历史迁移 fixture 可以保留必要的旧字符串；
- README 与许可证保留合法 upstream attribution。

允许使用 `@read-frog/api-contract`、`@read-frog/definitions` 中仍服务通用类型或网页翻译的部分；保留包不代表允许保留云运行时。

## 13. 品牌与仓库维护

- Manifest、本地化名称、描述、README 和 package description 使用 Read Frog Minimal 定位。
- 保留现有图标，不要求重新设计视觉。
- 保留包名 `@read-frog/extension`、许可证和 upstream attribution。
- 删除依赖官方 OAuth、PostHog、Discord、商店提交的 release/submit 工作流。
- 可保留或简化只执行本地可复现检查的 PR 验证工作流。
- 删除被裁功能的源码、测试、资源、本地化文案和依赖；不为降低 upstream diff 保留死代码。
- 共享代码可合理拆分或重构，但不无关重写网页翻译引擎。

## 14. 非目标

- 不重写网页翻译引擎；
- 不开发新 Provider；
- 不开发 Hosted AI 替代服务；
- 不开发账号、同步或后端；
- 不重新设计整体 UI；
- 不实现任何被删除功能的 Minimal 版本；
- 不要求彻底移除所有 `@read-frog/*` npm Package；
- 不考虑商业化、订阅或浏览器商店上架；
- 不把真实 BYOK 凭据或在线服务稳定性作为 CI 前提。

## 15. 自动验证

以下命令必须在没有任何 Read Frog OAuth、PostHog 或官方 secrets 时通过：

```bash
pnpm install --frozen-lockfile
pnpm fmt:check
pnpm lint
SKIP_FREE_API=true pnpm test
pnpm build
pnpm build:edge
pnpm build:firefox
```

自动测试至少覆盖：v98 → Minimal 配置迁移、Hosted AI 回退且不丢配置、Provider 安全回退、新配置默认 Provider 与网站规则、Popup/Options/Manifest 裁剪、无官方环境变量生产构建、本地 OpenAI-compatible mock BYOK 链路，以及 Chrome 本地 fixture 的网页翻译核心流程。

## 16. 用户负责的人工验收

以下验收由用户亲自执行，不属于 Codex 的完成门槛：

1. 使用用户自己的真实 BYOK Provider / Model 完成网页翻译；
2. 阻断 `*://*.readfrog.app/*` 后执行启动、空闲观察和完整翻译流程，确认无请求、无重试、无官方身份 Header。

此外建议用户人工 smoke test Google Translate、Microsoft Translate、DeepLX 与至少一个真实 BYOK Provider。

## 17. 完成标准

- Chrome 能构建、加载并执行核心网页翻译；
- Edge 和 Firefox 能完成生产构建；
- Popup 与 Options 只保留本 PRD 定义的功能；
- 所有待删除 WXT entrypoint、后台初始化和权限均不存在；
- Google、Microsoft、DeepLX、DeepL 与独立 BYOK Provider 代码仍可用；
- v98 配置可以安全迁移或导入；
- 无 Read Frog 云运行时、Hosted AI、账号或遥测残留；
- 自动验证全部通过；
- 用户负责的真实服务和云隔离验收被明确保留为交付后的人工检查项。

一句话定义：

> Read Frog Minimal 是一个独立扩展身份、Local-first、无账号、无 Read Frog Cloud、只专注网页翻译，并保留传统翻译与第三方 BYOK AI Provider 的精简浏览器扩展。
