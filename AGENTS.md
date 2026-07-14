# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

这是一个最小可用的 Chrome 本地网页翻译扩展（Manifest V3），使用 Chrome 138+ 内置的 `Translator API`。纯原生 JavaScript，**无构建系统、无 npm 依赖、无打包工具**。

## 本地开发与安装

```bash
# 1. 使用 Chrome 138+ 打开 chrome://extensions
# 2. 开启右上角 "开发者模式"
# 3. 点击 "加载已解压的扩展程序"
# 4. 选择本目录（[代码]沉浸式翻译）
```

修改代码后，在 `chrome://extensions` 页面点击扩展的刷新按钮即可生效。

## 测试

项目使用无依赖的浏览器 fixture 回归套件。启动本地服务器后优先打开聚合入口：

```bash
# 启动一个本地 HTTP 服务器（因为 file:// 协议下 chrome.runtime 不存在）
# 在项目根目录启动，以便 fixture 能通过 ../content.js 加载源码
python3 -m http.server 8000
# 然后在浏览器中打开 http://127.0.0.1:8000/tests/run-all.html
# 发布门槛：23/23 通过
```

也可以单独打开任一 fixture 调试具体场景。

每个 fixture 会：
1. 注入模拟的 `chrome.runtime.onMessage` 监听器
2. 加载 `content.js`
3. 通过 `dataset` 属性把测试结果写到 `document.body` 上

测试内容包括：segment 收集、翻译插入、显示模式切换、原文恢复、动态内容修复、legacy 页面回退等。

其中 `performance-page.html`、`youtube-virtual-feed.html` 和
`shell-class-reveal.html` 是性能回归护栏：分别覆盖大列表预扫描复用、
高频 style/class 变化不触发重复扫描、虚拟列表结构保持，以及页面壳 class
真正展开内容时仍能追加翻译。

`ui-chrome-labels.html` 覆盖导航栏原子链接/按钮翻译且不破坏图标和交互；
`cache-replay.html` 覆盖页面重新加载后直接回放译文且不创建 Translator；
部分缓存命中必须保持翻译中状态，补齐缺口后才能报告完成；
`prepared-snapshot-reconciliation.html` 覆盖预扫描后框架替换/新增 DOM 时重新对账；
`hero-inline-slogan.html` 覆盖由 span/br/em/sup 拼接的 Hero 标语整句翻译并保留排版。

## 代码架构

### 整体消息流

扩展采用 **popup ↔ content** 的双层架构：

- **popup.js**：运行在扩展弹窗中，管理语言偏好并驱动翻译流程
- **content.js**（IIFE）：注入到网页中，负责 DOM 扫描、segment 收集、翻译节点注入、显示模式切换、原文恢复
- **languages.js**：popup/options 共用的 Chrome 翻译语言目录与本地化语言名
- **i18n.js**：popup/options 共用的界面本地化层，支持跟随浏览器和手动切换

通信完全通过 `chrome.runtime.onMessage` / `chrome.tabs.sendMessage` 进行。

### 关键消息类型

| type | 方向 | 作用 |
|---|---|---|
| `collect-segments` | popup → content | 收集可翻译文本段落 |
| `insert-translation` | popup → content | 插入一段译文 |
| `set-display-mode` | popup → content | 切换显示模式 |
| `restore-original` | popup → content | 恢复原文 |
| `get-page-state` | popup → content | 查询页面翻译状态 |

### content.js DOM 标记约定

`content.js` 使用 `data-local-translator-*` 系列属性在 DOM 中记录翻译状态，这是理解代码的关键：

- `data-local-translator-source`：标记已扫描的源文本容器，值为 segment ID
- `data-local-translator-target`：标记译文元素，值为对应 segment ID
- `data-local-translator-original-display`：记录原文节点原来的 `display` 值（用于切换模式时恢复）
- `data-local-translator-original-wrapper`：仅用于 `td`/`th`，包裹单元格内原文子节点（避免译文破坏表格列结构）
- `.local-translator-result`：译文元素的 class

legacy 回退路径使用额外的 `data-local-translator-generated-anchor` 和 `data-local-translator-legacy-source`。

### segment 收集策略（三路优先级）

1. **语义扫描**（`collectSegments` 主路径）：遍历 `h1-h6, p, li, blockquote, figcaption, td, th` 等块级元素
2. **通用文本块扫描**（`collectGenericTextBlocks`）：TreeWalker 遍历文本节点，向上查找最近的可视块级父元素 — 处理 semantic 元素（如 `<a style="display:block">`）无法覆盖的自定义卡片标题
3. **legacy 回退**（`collectLegacySegments`）：当页面文本量大但前两种方式收集到的内容不足 10% 时，回退到 `font`/`td` 容器 + BR 分段的老式策略

语义扫描还包含少量稳定的平台内容契约：YouTube 的标题/新版评论/简介、
X 的 `tweetText`，以及 Reddit 的正文 slot。平台选择器只负责确定原子内容
边界，翻译、缓存和动态更新仍复用同一套通用管线。

### 显示模式

三种模式通过 inline style 控制原文和译文的 `display` 属性：
- `translation`：原文 `display:none`，只显示译文
- `original`：译文 `display:none`，显示原文
- `bilingual`：两者都显示，译文添加上边距

**渲染模型**：纯文本段落在仅译文模式下复用原容器；富文本段落只替换可翻译的文本节点，保留链接、强调、行内代码及原节点事件。双语模式创建去除重复 `id` 的深层译文副本，保留标签和链接属性。`<td>`/`<th>` 的译文放在单元格内部，避免破坏表格列结构。

富文本翻译使用私有 Unicode 标记在一次请求中保留各文本节点边界；如果模型未完整保留标记，会自动回退为逐文本节点翻译，优先保证 DOM 可恢复和交互不丢失。

动态框架（React/Vue）重排节点会触发 MutationObserver（`renderObserver`），由 `repairRenderedSource` 检测译文被移除并自动重建。
若虚拟列表复用已标记 source 并换入新文本，会为新内容分配新的 segment ID；
旧的异步翻译结果因此无法写回，新内容再进入串行增量翻译队列。

### 性能约束

- popup 的自动语言检测只抽样最多 36 段，并缓存同一批页面数据的检测结果。
- popup 预检测产生的 segment 会由 `content.js` 在正式翻译时复用，禁止无条件恢复后再次全页扫描。
- 动态观察器只把 `hidden`、`aria-hidden` 或 `display:none` 的“隐藏 → 显示”变化视为新增内容；普通 transform、opacity、尺寸动画不得触发扫描。
- html/body 的 class 变化只在出现明确的 open/expanded/shown 等状态 token 时做低频全页补扫。
- 大页面正文翻译进度按 2% 粒度上报，避免逐段跨进程消息和 icon 重绘。

### 语言处理

- `popup.js` 中 `SUPPORTED_LANGUAGES` 列出所有支持的语言（注意 `iw` 是代码但显示为"希伯来语"）
- `normalizeLanguage()` 处理 `zh-TW/HK/Hant` → `zh-Hant`、`he` → `iw` 等映射
- `detectSegmentLanguage()` 先用 `chrome.i18n.detectLanguage`，失败时回退到 CJK/latin 启发式
- `chooseDominantSourceLanguage()` 取占比最高的源语言，排除目标语言
- 源语言检测只用于建立页面级 Translator 语言对；所有已收集段落都必须进入翻译管线，不得因短词、专有名词、混合语言、局部 `lang` 或逐段检测置信度而跳过
- 产品优先级固定为：覆盖完整性 > DOM/排版保持 > 翻译准确度

### options.js

独立的本地模型管理页面（`options_ui`）。仅用于展示语言包状态和触发下载，**不能真正卸载**语言包（Chrome 没有公开接口）。

翻译缓存开关和清理入口只放在高级设置中，不在 popup 重复展示。缓存同时
保存文本结果与页面 URL/语言对索引；已完整翻译过的页面重新打开时会先回放
精确命中的缓存，不创建 Translator。旧版只有文本结果、没有页面索引；更新
后仅在同一语言对精确命中至少 3 段较长原文时自动迁移，通用短词不会触发。

## 代码风格

- 纯原生 ES2022+，无 transpiler
- `content.js` 是一个 IIFE，通过 `globalThis.__localTranslatorLoaded` 防止重复注入
- 当前作用域内无 lint 配置，保持代码风格一致即可
