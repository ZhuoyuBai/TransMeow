(() => {
  if (globalThis.__localTranslatorLoaded) return;
  globalThis.__localTranslatorLoaded = true;

  const TRANSLATION_CLASS = "local-translator-result";
  const SOURCE_ATTRIBUTE = "data-local-translator-source";
  const TARGET_ATTRIBUTE = "data-local-translator-target";
  const LEGACY_ANCHOR_ATTRIBUTE = "data-local-translator-generated-anchor";
  const LEGACY_SOURCE_ATTRIBUTE = "data-local-translator-legacy-source";
  const ORIGINAL_DISPLAY_ATTRIBUTE = "data-local-translator-original-display";
  const ORIGINAL_WRAPPER_ATTRIBUTE = "data-local-translator-original-wrapper";
  const RESIDUAL_SOURCE_ATTRIBUTE = "data-local-translator-residual-source";
  const DISPLAY_MODES = new Set(["translation", "original", "bilingual"]);
  const TRANSLATION_TEXT_STYLE_PROPERTIES = [
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "line-height",
    "letter-spacing",
    "text-transform",
    "color",
    "white-space",
    "overflow-wrap",
    "word-break"
  ];
  const RICH_MARKER_OPEN = "\ue000";
  const RICH_MARKER_MIDDLE = "\ue001";
  const RICH_MARKER_CLOSE = "\ue002";
  const RICH_MARKER_END = "\ue003";
  const MAX_RICH_TRANSLATION_LENGTH = 1600;
  let currentDisplayMode = "translation";
  let displayModeRenderVersion = 0;
  let isRestoring = false;
  const translatedTextBySource = new WeakMap();
  const renderStateBySource = new WeakMap();
  let knownSearchRoots = [];
  let preparedPageData = null;
  const preparedSourcesById = new Map();

  // --- 翻译引擎层状态 ---
  // 翻译编排骨架下沉到 content.js：持有 translator 实例，弹窗关闭也能继续翻译。
  let translatorInstance = null;
  let translatorSourceLang = "";
  let translatorTargetLang = "";
  let translationState = "idle"; // idle | creating | ready | translating
  let abortRequested = false;
  let segmentIdCounter = 0;
  const failedSegments = new Set();
  let dynamicObserver = null;
  let observedDynamicRoots = new WeakSet();
  let globalShellObserver = null;
  let globalRevealTimer = null;
  let dynamicFlushTimer = null;
  let dynamicFlushPending = [];
  let dynamicFlushPendingSet = new Set();
  const pendingRetranslations = new Map();
  let dynamicFlushRunning = false;
  let viewportObserver = null;
  let viewportSourcesByTarget = new WeakMap();
  let viewportTranslationQueue = [];
  let queuedViewportSources = new WeakSet();
  let viewportQueueRunning = false;
  let currentProgress = 0;
  let currentScope = "viewport";
  let observedPageUrl = location.href;
  let translatedPageUrl = "";
  let autoTranslationTimer = null;
  let autoTranslationPromise = null;
  let useTranslationCache = true;
  let translationCache = {};
  let translationPageCache = {};
  let cacheDirty = false;
  let pageCacheDirty = false;
  let cacheHydrationPromise = null;
  const sourceTextBySource = new WeakMap();
  let auxiliaryTranslationChain = Promise.resolve();
  const MAX_DYNAMIC_ROOTS_PER_FLUSH = 40;
  // 以上方 1.5 屏、下方 4 屏作为预加载带。信息流主要向下滚动，优先把
  // YouTube/Reddit 即将出现的内容送进翻译队列，同时避免退化为整页翻译。
  const VIEWPORT_PRELOAD_MARGIN = "150% 0px 400% 0px";
  const SITE_CONTENT_UNIT_SELECTOR = [
    // YouTube 2026：标题、评论和简介正文均可能是非语义自定义元素。
    // 直接选中内容单元，避免简介中的多个链接让通用安全检查整段跳过。
    "yt-formatted-string#video-title",
    "yt-formatted-string#title",
    "yt-attributed-string#content-text",
    "yt-formatted-string#content-text",
    "yt-attributed-string#attributed-snippet-text",
    // X 的正文可能包含多个 @mention 链接；整个 tweetText 才是原子正文。
    "[data-testid='tweetText']",
    // Reddit 新版 Web Components 会通过 slot 暴露标题、正文和评论。
    "[slot='title']",
    "[slot='text-body']",
    "[slot='comment']"
  ].join(",");
  const BLOCK_SELECTOR = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "blockquote",
    "figcaption",
    "caption",
    "summary",
    "dt",
    "dd",
    "td",
    "th",
    SITE_CONTENT_UNIT_SELECTOR
  ].join(",");
  const SKIP_SELECTOR = [
    "script",
    "style",
    "noscript",
    "code",
    "pre",
    "textarea",
    "input",
    "select",
    "option",
    "[contenteditable='true']",
    "[translate='no']",
    ".notranslate",
    ".local-translator-result"
  ].join(",");
  const GENERIC_EXCLUDE_SELECTOR = [
    "nav",
    "header",
    "footer",
    "button",
    "[role='button']",
    "[role='menu']",
    "[role='menuitem']",
    "[role='navigation']",
    "[role='tab']",
    "[aria-hidden='true']"
  ].join(",");
  // 页面正文扫描仍排除站点外壳，避免把整条导航当成一个大段落；但导航中
  // 的叶子链接/按钮本身是用户需要理解的原子文本，应走独立的 UI 标签通道。
  const ATOMIC_UI_LABEL_SELECTOR = [
    "a[href]",
    "button",
    "label",
    "[role='menuitem']",
    "[role='tab']"
  ].join(",");
  const GENERIC_BLOCK_DISPLAYS = new Set([
    "block",
    "flow-root",
    "flex",
    "grid",
    "list-item",
    "table-cell"
  ]);
  // 通用 div/custom-element 没有稳定的正文语义，候选过大时通常是 feed、
  // 列表或应用壳。把这种容器原位替换成一条译文会直接清空它的整棵子树。
  const MAX_GENERIC_BLOCK_TEXT_LENGTH = 1800;
  const MAX_ATOMIC_UI_LABEL_TEXT_LENGTH = 160;
  const MAX_TRANSLATION_CACHE_ENTRIES = 800;
  const MAX_TRANSLATION_PAGE_CACHE_ENTRIES = 80;

  function discoverSearchRoots() {
    const roots = [document.body];

    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot && !roots.includes(element.shadowRoot)) {
          roots.push(element.shadowRoot);
        }
      }
    }

    knownSearchRoots = roots;
    return knownSearchRoots;
  }

  function getSearchRoots() {
    return knownSearchRoots.length > 0
      ? knownSearchRoots
      : discoverSearchRoots();
  }

  function queryAllRoots(selector) {
    return getSearchRoots().flatMap((root) =>
      Array.from(root.querySelectorAll(selector))
    );
  }

  function queryRoot(selector) {
    for (const root of getSearchRoots()) {
      const match = root.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  function closestComposed(element, selector) {
    let current = element;
    while (current) {
      const match = current.closest?.(selector);
      if (match) return match;
      const root = current.getRootNode?.();
      current = root instanceof ShadowRoot ? root.host : null;
    }
    return null;
  }

  function findTranslationForId(id) {
    const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${id}"]`);
    if (source) {
      // 仅译文模式直接复用原元素承载译文，避免丢失 class、宽度、定位、
      // flex/grid item 等决定页面布局的样式信息。
      if (source.getAttribute(TARGET_ATTRIBUTE) === id) return source;
      // 兄弟节点模式：查 source 的下一个兄弟
      const next = source.nextElementSibling;
      if (next && next.getAttribute(TARGET_ATTRIBUTE) === id) return next;
      // td/th 内部模式：查 source 的直接子元素
      const internal = source.querySelector(
        `:scope > [${TARGET_ATTRIBUTE}="${id}"]`
      );
      if (internal) return internal;
    }
    return queryRoot(`[${TARGET_ATTRIBUTE}="${id}"]`);
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function getElementText(element) {
    return normalizeText(element.innerText || element.textContent || "");
  }

  function getNodePath(root, node) {
    const path = [];
    let current = node;
    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
      current = parent;
    }
    return current === root ? path : null;
  }

  function getNodeAtPath(root, path) {
    let current = root;
    for (const index of path) {
      current = current?.childNodes?.[index];
      if (!current) return null;
    }
    return current;
  }

  function isInsideSkippedInlineContent(source, node) {
    const skipped = closestComposed(node.parentElement, SKIP_SELECTOR);
    return Boolean(skipped && skipped !== source && source.contains(skipped));
  }

  function collectRichTextEntries(source) {
    if (!source.querySelector("*")) return [];

    const entries = [];
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.nodeValue || "";
      if (value.trim() && !isInsideSkippedInlineContent(source, node)) {
        const path = getNodePath(source, node);
        if (path) {
          entries.push({
            node,
            path,
            originalValue: value,
            leadingWhitespace: value.match(/^\s*/u)?.[0] || "",
            trailingWhitespace: value.match(/\s*$/u)?.[0] || "",
            text: value.trim()
          });
        }
      }
      node = walker.nextNode();
    }
    return entries;
  }

  function formatRichNodeTranslation(entry, translatedText) {
    return `${entry.leadingWhitespace}${translatedText.trim()}${entry.trailingWhitespace}`;
  }

  function encodeRichTranslationRequest(entries) {
    return entries
      .map(
        (entry, index) =>
          `${RICH_MARKER_OPEN}${index}${RICH_MARKER_MIDDLE}${entry.text}${RICH_MARKER_CLOSE}${index}${RICH_MARKER_END}`
      )
      .join("");
  }

  function parseRichTranslationResponse(response, entries) {
    const values = new Array(entries.length);
    const pattern = new RegExp(
      `${RICH_MARKER_OPEN}(\\d+)${RICH_MARKER_MIDDLE}([\\s\\S]*?)${RICH_MARKER_CLOSE}\\1${RICH_MARKER_END}`,
      "gu"
    );
    let match;
    while ((match = pattern.exec(response))) {
      const index = Number(match[1]);
      if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
        return null;
      }
      if (values[index] !== undefined) return null;
      values[index] = formatRichNodeTranslation(entries[index], match[2]);
    }
    const complete = Array.from(
      { length: entries.length },
      (_unused, index) => values[index] !== undefined
    ).every(Boolean);
    return complete ? values : null;
  }

  function isUsefulText(text, minimumLength = 2) {
    return text.length >= minimumLength && /[\p{L}\p{N}]/u.test(text);
  }

  function isSafeGenericTextBlock(element, text) {
    if (text.length > MAX_GENERIC_BLOCK_TEXT_LENGTH) return false;

    // 已经包含独立翻译单元，说明当前元素只是这些单元的结构父容器。
    // 尤其是 YouTube 的虚拟 feed：显隐/class 变化会让增量扫描从元数据
    // 向上走到整个 grid；若再把 grid 当 source，replaceChildren 会摧毁首页。
    if (
      element.querySelector(
        `[${SOURCE_ATTRIBUTE}], [${TARGET_ATTRIBUTE}], ${BLOCK_SELECTOR}`
      )
    ) {
      return false;
    }

    // 多链接或多个独立块级分支通常代表卡片集合，而不是一段连续正文。
    // 行内 span/em/sup/br 常被 Hero 标题用于换行、斜体和脚注；即使有三个
    // 以上文本分支，它们仍属于同一段富文本，不能因此排除整句 slogan。
    if (element.querySelectorAll("a[href]").length > 1) return false;
    let textBranches = 0;
    for (const child of element.children) {
      const childDisplay = getComputedStyle(child).display;
      if (
        GENERIC_BLOCK_DISPLAYS.has(childDisplay) &&
        isUsefulText(normalizeText(child.innerText || ""), 4)
      ) {
        textBranches += 1;
        if (textBranches > 2) return false;
      }
    }

    return true;
  }

  function yieldToMainThread() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function runAuxiliaryTranslationTask(task) {
    const result = auxiliaryTranslationChain.catch(() => {}).then(task);
    auxiliaryTranslationChain = result.catch(() => {});
    return result;
  }

  function findNearestTextBlock(textNode, root, resultCache = null) {
    let element = textNode.parentElement;
    const boundary = root.parentElement;
    const traversed = [];

    function finish(result) {
      if (resultCache) {
        traversed.forEach((visited) => resultCache.set(visited, result));
      }
      return result;
    }

    while (element && element !== boundary) {
      if (resultCache?.has(element)) {
        return finish(resultCache.get(element));
      }
      traversed.push(element);
      if (
        element.matches(SKIP_SELECTOR) ||
        closestComposed(element, GENERIC_EXCLUDE_SELECTOR)
      ) {
        return finish(null);
      }

      const display = getComputedStyle(element).display;
      if (GENERIC_BLOCK_DISPLAYS.has(display) && isVisible(element)) {
        const text = normalizeText(element.innerText);
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const hasEnoughContent = text.length >= 12 || wordCount >= 3;

        if (hasEnoughContent && isUsefulText(text, 4)) {
          // 遇到的第一个可见块如果是结构容器，立即放弃这条文本路径；
          // 继续向上只会命中更大的结构容器。
          return finish(
            isSafeGenericTextBlock(element, text) ? element : null
          );
        }
      }

      if (element === root) break;
      element = element.parentElement;
    }

    return finish(null);
  }

  async function collectGenericTextBlocks(roots) {
    const candidates = new Set();
    const resultCache = new WeakMap();
    let visitedTextNodes = 0;

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const text = normalizeText(node.nodeValue || "");
          if (!isUsefulText(text, 2)) return NodeFilter.FILTER_REJECT;
          if (closestComposed(node.parentElement, SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node = walker.nextNode();
      while (node) {
        const candidate = findNearestTextBlock(node, root, resultCache);
        if (candidate) candidates.add(candidate);
        node = walker.nextNode();
        visitedTextNodes += 1;
        if (visitedTextNodes % 160 === 0) await yieldToMainThread();
      }
    }

    return Array.from(candidates)
      .filter(
        (candidate) =>
          !closestComposed(candidate, `[${SOURCE_ATTRIBUTE}]`) &&
          !candidate.querySelector(`[${SOURCE_ATTRIBUTE}]`)
      )
      .filter(
        (candidate, _index, allCandidates) =>
          !allCandidates.some(
            (other) => other !== candidate && candidate.contains(other)
          )
      );
  }

  function collectLegacySegments() {
    const candidates = Array.from(document.querySelectorAll("font, td"))
      .filter((element) => !element.closest(SKIP_SELECTOR))
      .filter(isVisible)
      .map((element) => ({
        element,
        textLength: normalizeText(element.innerText).length
      }))
      .filter((candidate) => candidate.textLength >= 200);

    const specificCandidates = candidates.filter(
      (candidate) =>
        !candidates.some(
          (other) =>
            other !== candidate &&
            candidate.element.contains(other.element) &&
            other.textLength >= candidate.textLength * 0.6
        )
    );

    const container = specificCandidates.sort(
      (left, right) => right.textLength - left.textLength
    )[0]?.element;

    if (!container) return [];

    const segments = [];
    const rawSegments = [];
    const textParts = [];
    const textNodes = [];
    let consecutiveBreaks = 0;

    function commitSegment(anchor) {
      const text = normalizeText(textParts.join(" "));
      const segmentTextNodes = textNodes.slice();
      textParts.length = 0;
      textNodes.length = 0;

      if (text.length < 2) return;
      if (!/[\p{L}\p{N}]/u.test(text)) return;
      rawSegments.push({ anchor, text, textNodes: segmentTextNodes });
    }

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.trim()) {
          if (consecutiveBreaks === 1) textParts.push(" ");
          textParts.push(node.nodeValue);
          textNodes.push(node);
          consecutiveBreaks = 0;
        }
      } else if (node.tagName === "BR") {
        consecutiveBreaks += 1;
        if (consecutiveBreaks >= 2) {
          commitSegment(node);
          consecutiveBreaks = 0;
        }
      }

      node = walker.nextNode();
    }

    if (normalizeText(textParts.join(" "))) {
      const anchor = document.createElement("span");
      anchor.hidden = true;
      anchor.setAttribute(LEGACY_ANCHOR_ATTRIBUTE, "true");
      container.append(anchor);
      commitSegment(anchor);
    }

    rawSegments.forEach((segment, index) => {
      const id = String(index + 1);
      segment.anchor.setAttribute(SOURCE_ATTRIBUTE, id);
      preparedSourcesById.set(id, segment.anchor);

      for (const textNode of segment.textNodes) {
        const existingWrapper = textNode.parentElement?.closest(
          `[${LEGACY_SOURCE_ATTRIBUTE}]`
        );
        if (existingWrapper) {
          existingWrapper.setAttribute(LEGACY_SOURCE_ATTRIBUTE, id);
          continue;
        }

        const wrapper = document.createElement("span");
        wrapper.setAttribute(LEGACY_SOURCE_ATTRIBUTE, id);
        textNode.parentNode.insertBefore(wrapper, textNode);
        wrapper.append(textNode);
      }

      segments.push({ id, text: segment.text, inViewport: true });
    });

    return segments;
  }

  // 抽出为独立函数，供全量 collectSegments 与增量 collectIncremental 共用。
  // id 用全局 segmentIdCounter 续编，保证全量(1..N)与增量(N+1..M)不冲突。
  function appendElementSegment(
    element,
    segments,
    seen,
    { allowUiChrome = false } = {}
  ) {
    if (
      seen.has(element) ||
      closestComposed(element, SKIP_SELECTOR) ||
      (!allowUiChrome && closestComposed(element, GENERIC_EXCLUDE_SELECTOR))
    ) {
      return false;
    }
    if (!isVisible(element)) return false;

    const text = normalizeText(element.innerText);
    if (!isUsefulText(text)) return false;
    // 老式整页表格常把全文塞进一个 td/font，并用连续 BR 分段。把整个
    // 单元格当成一段会丢失段落结构，应交给 legacy 分段器处理。
    if (
      text.length > 3000 &&
      element.matches("td, th") &&
      element.querySelector("font, br")
    ) {
      return false;
    }

    const id = String(++segmentIdCounter);
    element.setAttribute(SOURCE_ATTRIBUTE, id);
    preparedSourcesById.set(id, element);
    sourceTextBySource.set(element, text);
    seen.add(element);
    segments.push({ id, text, inViewport: isInViewport(element) });
    return true;
  }

  function isAtomicUiLabel(element) {
    if (closestComposed(element, "[aria-hidden='true']")) return false;
    if (element.querySelector(ATOMIC_UI_LABEL_SELECTOR)) return false;
    if (element.querySelector(BLOCK_SELECTOR)) return false;

    const text = getElementText(element);
    if (
      !isUsefulText(text) ||
      text.length > MAX_ATOMIC_UI_LABEL_TEXT_LENGTH ||
      !isVisible(element)
    ) {
      return false;
    }

    let textBranches = 0;
    for (const child of element.children) {
      if (isUsefulText(normalizeText(child.innerText || ""), 2)) {
        textBranches += 1;
        if (textBranches > 2) return false;
      }
    }
    return true;
  }

  function collectAtomicUiLabels(roots, segments, seen) {
    for (const root of roots) {
      const rootElement = root.nodeType === Node.ELEMENT_NODE ? root : null;
      const candidates = [
        ...(rootElement?.matches?.(ATOMIC_UI_LABEL_SELECTOR)
          ? [rootElement]
          : []),
        ...Array.from(root.querySelectorAll(ATOMIC_UI_LABEL_SELECTOR))
      ];

      for (const element of candidates) {
        if (
          element.hasAttribute(SOURCE_ATTRIBUTE) ||
          closestComposed(element, `[${SOURCE_ATTRIBUTE}]`) ||
          element.querySelector(`[${SOURCE_ATTRIBUTE}]`) ||
          !isAtomicUiLabel(element)
        ) {
          continue;
        }
        appendElementSegment(element, segments, seen, { allowUiChrome: true });
      }
    }
  }

  function collectNestedBlockResiduals(roots, segments, seen) {
    for (const root of roots) {
      const rootElement = root.nodeType === Node.ELEMENT_NODE ? root : null;
      const containers = [
        ...(rootElement?.matches(BLOCK_SELECTOR) ? [rootElement] : []),
        ...Array.from(root.querySelectorAll(BLOCK_SELECTOR))
      ].filter((element) => Boolean(element.querySelector(BLOCK_SELECTOR)));

      for (const container of containers) {
        let pendingNodes = [];

        function commitPendingNodes() {
          if (pendingNodes.length === 0) return;
          const text = normalizeText(
            pendingNodes.map((node) => node.textContent || "").join(" ")
          );
          const nodes = pendingNodes;
          pendingNodes = [];
          if (!isUsefulText(text)) return;

          const wrapper = document.createElement("span");
          wrapper.style.display = "contents";
          wrapper.setAttribute(RESIDUAL_SOURCE_ATTRIBUTE, "true");
          nodes[0].parentNode.insertBefore(wrapper, nodes[0]);
          nodes.forEach((node) => wrapper.append(node));

          const id = String(++segmentIdCounter);
          wrapper.setAttribute(SOURCE_ATTRIBUTE, id);
          preparedSourcesById.set(id, wrapper);
          sourceTextBySource.set(wrapper, text);
          seen.add(wrapper);
          segments.push({ id, text, inViewport: isInViewport(container) });
        }

        for (const child of Array.from(container.childNodes)) {
          const containsNestedBlock =
            child.nodeType === Node.ELEMENT_NODE &&
            (child.matches(BLOCK_SELECTOR) ||
              child.querySelector(BLOCK_SELECTOR) ||
              child.hasAttribute(SOURCE_ATTRIBUTE) ||
              child.hasAttribute(RESIDUAL_SOURCE_ATTRIBUTE));
          if (containsNestedBlock) {
            commitPendingNodes();
          } else {
            pendingNodes.push(child);
          }
        }
        commitPendingNodes();
      }
    }
  }

  function rememberPreparedPageData(pageData) {
    preparedPageData = {
      pageLanguage: pageData.pageLanguage,
      title: pageData.title,
      segments: pageData.segments.map((segment) => ({ ...segment }))
    };
  }

  function getReusablePreparedPageData() {
    if (!preparedPageData?.segments?.length) return null;
    const connectedSegments = preparedPageData.segments.filter((segment) => {
      const source = preparedSourcesById.get(segment.id);
      return (
        source?.isConnected &&
        source.getAttribute(SOURCE_ATTRIBUTE) === segment.id &&
        !translatedTextBySource.has(source)
      );
    });
    if (connectedSegments.length === 0) return null;
    return {
      ...preparedPageData,
      segments: connectedSegments.map((segment) => ({ ...segment }))
    };
  }

  function clearPreparedPageData() {
    preparedPageData = null;
    preparedSourcesById.clear();
  }

  async function collectSegments() {
    const reusablePageData = getReusablePreparedPageData();
    if (reusablePageData) return reusablePageData;

    const existingTranslatedSources = queryAllRoots(
      `[${SOURCE_ATTRIBUTE}]`
    ).filter((source) => translatedTextBySource.has(source));
    if (existingTranslatedSources.length > 0) {
      return {
        pageLanguage: document.documentElement.lang || "",
        title: document.title,
        segments: existingTranslatedSources.map((source) => {
          const state = renderStateBySource.get(source);
          const originalText = state
            ? state.originalText
            : getElementText(source);
          return {
            id: source.getAttribute(SOURCE_ATTRIBUTE),
            text: originalText,
            inViewport: isInViewport(source)
          };
        })
      };
    }

    // Scan the whole document so secondary content regions (related posts,
    // knowledge panels, side rails) are eligible too. UI chrome is filtered by
    // semantic roles instead of assuming every `aside` is navigation.
    const searchRoot = discoverSearchRoots();
    observeRenderRoots(searchRoot);
    const seen = new Set();
    const segments = [];
    // 全量收集前重置 id 计数器（调用方应已 restoreOriginal 清除旧标记）。
    segmentIdCounter = 0;
    preparedSourcesById.clear();

    let visitedBlocks = 0;
    for (const root of searchRoot) {
      for (const element of root.querySelectorAll(BLOCK_SELECTOR)) {
        const nestedBlock = Boolean(element.querySelector(BLOCK_SELECTOR));
        if (nestedBlock) continue;
        appendElementSegment(element, segments, seen);
        visitedBlocks += 1;
        if (visitedBlocks % 100 === 0) await yieldToMainThread();
      }
    }

    // 导航、筛选器、标签等交互控件不能作为一个大容器翻译，否则会破坏
    // 布局与交互；统一收集其中可见的叶子链接、按钮和 label。
    collectAtomicUiLabels(searchRoot, segments, seen);

    // li/hgroup 等容器可能同时包含标题块和直接文本。只收集最内层块会漏掉
    // 这些直接文本；将连续的非块子节点包进 display:contents 的轻量 source，
    // 既能逐段翻译，也不改变外层列表、标题及父布局。
    collectNestedBlockResiduals(searchRoot, segments, seen);

    let selectedTextLength;
    const pageTextLength = normalizeText(document.body.innerText).length;

    // Modern feeds often mix semantic paragraphs with custom div/link-based
    // post titles. Always run the generic pass, then de-duplicate against the
    // semantic segments, so one valid semantic paragraph cannot suppress the
    // rest of a card.
    const genericBlocks = await collectGenericTextBlocks(searchRoot);
    for (let index = 0; index < genericBlocks.length; index += 1) {
      appendElementSegment(genericBlocks[index], segments, seen);
      if (index > 0 && index % 100 === 0) await yieldToMainThread();
    }
    selectedTextLength = segments.reduce(
      (total, segment) => total + segment.text.length,
      0
    );

    const needsLegacyFallback =
      segments.length === 0 ||
      (pageTextLength >= 1000 && selectedTextLength < pageTextLength * 0.1);

    if (needsLegacyFallback) {
      const semanticAnchors = Array.from(
        queryAllRoots(`[${SOURCE_ATTRIBUTE}]`)
      ).map((node) => [node, node.getAttribute(SOURCE_ATTRIBUTE)]);
      semanticAnchors.forEach(([node]) => node.removeAttribute(SOURCE_ATTRIBUTE));

      const legacySegments = collectLegacySegments();
      if (legacySegments.length > 0) {
        const legacyIds = new Set(legacySegments.map((segment) => segment.id));
        for (const id of Array.from(preparedSourcesById.keys())) {
          if (!legacyIds.has(id)) preparedSourcesById.delete(id);
        }
        segmentIdCounter = legacySegments.length;
        segments.splice(0, segments.length, ...legacySegments);
      } else {
        semanticAnchors.forEach(([node, id]) =>
          node.setAttribute(SOURCE_ATTRIBUTE, id)
        );
      }
    }

    const pageData = {
      pageLanguage: document.documentElement.lang || "",
      title: document.title,
      segments
    };
    rememberPreparedPageData(pageData);
    return pageData;
  }

  // --- 渲染模型 ---
  // 仅译文模式必须复用原元素。若另建一个无 class/属性的 <p> 兄弟节点，
  // 依赖 class、子选择器、flex/grid item 或固定宽度的页面会立刻错位。
  // 原子节点只暂时从 DOM 中取下（节点引用和事件监听仍保留），切回原文时
  // 原样放回。双语模式才创建浅克隆作为兄弟节点，而且会继承原元素的标签、
  // class 与 inline style。

  function getRenderState(source) {
    let state = renderStateBySource.get(source);
    if (!state) {
      const typography = captureRepresentativeTypography(source);
      const richEntries = collectRichTextEntries(source);
      state = {
        originalNodes: Array.from(source.childNodes),
        originalText: getElementText(source),
        richEntries,
        richNodeTexts: null,
        renderStrategy: "plain",
        translationElement: null,
        typography,
        originallyHadStyleAttribute: source.hasAttribute("style"),
        originalInlineTextStyles: Object.fromEntries(
          TRANSLATION_TEXT_STYLE_PROPERTIES.map((property) => [
            property,
            {
              value: source.style.getPropertyValue(property),
              priority: source.style.getPropertyPriority(property)
            }
          ])
        ),
        mode: "original"
      };
      renderStateBySource.set(source, state);
    }
    return state;
  }

  function restoreSourceChildren(source, state) {
    if (state.mode === "translation") {
      if (state.renderStrategy === "rich") {
        const entriesStillConnected = state.richEntries.every(
          (entry) => entry.node.isConnected && source.contains(entry.node)
        );
        if (entriesStillConnected) {
          state.richEntries.forEach((entry) => {
            entry.node.nodeValue = entry.originalValue;
          });
        } else {
          source.replaceChildren(...state.originalNodes);
        }
      } else {
        source.replaceChildren(...state.originalNodes);
      }
    }
    restoreInlineTextStyles(source, state);
    source.removeAttribute(TARGET_ATTRIBUTE);
    state.mode = "original";
  }

  function captureRepresentativeTypography(source) {
    let representative = source;
    let bestScore = -1;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = normalizeText(node.nodeValue || "");
      const parent = node.parentElement;
      if (text && parent && !closestComposed(parent, SKIP_SELECTOR)) {
        const computed = getComputedStyle(parent);
        const fontSize = Number.parseFloat(computed.fontSize) || 0;
        const score = Math.min(text.length, 160) * Math.max(fontSize, 1);
        if (score > bestScore) {
          representative = parent;
          bestScore = score;
        }
      }
      node = walker.nextNode();
    }

    const computed = getComputedStyle(representative);
    return Object.fromEntries(
      TRANSLATION_TEXT_STYLE_PROPERTIES.map((property) => [
        property,
        computed.getPropertyValue(property)
      ])
    );
  }

  function applyTranslationTypography(element, state) {
    for (const [property, value] of Object.entries(state.typography)) {
      if (value && element.style.getPropertyValue(property) !== value) {
        element.style.setProperty(property, value);
      }
    }
  }

  function restoreInlineTextStyles(source, state) {
    for (const [property, original] of Object.entries(
      state.originalInlineTextStyles
    )) {
      if (original.value) {
        source.style.setProperty(property, original.value, original.priority);
      } else {
        source.style.removeProperty(property);
      }
    }
    if (!state.originallyHadStyleAttribute && !source.getAttribute("style")) {
      source.removeAttribute("style");
    }
  }

  function removeBilingualTranslation(state) {
    if (state.translationElement?.isConnected) {
      state.translationElement.remove();
    }
    state.translationElement = null;
  }

  function stripClonedIdentity(root) {
    const elements = [root, ...root.querySelectorAll("*")];
    elements.forEach((element) => {
      element.removeAttribute("id");
      element.removeAttribute(SOURCE_ATTRIBUTE);
      element.removeAttribute(TARGET_ATTRIBUTE);
      element.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
      element.removeAttribute(ORIGINAL_WRAPPER_ATTRIBUTE);
      element.removeAttribute(RESIDUAL_SOURCE_ATTRIBUTE);
      element.removeAttribute(LEGACY_SOURCE_ATTRIBUTE);
    });
  }

  function applyRichTextToClone(cloneRoot, state) {
    if (!state.richNodeTexts) return false;
    for (let index = 0; index < state.richEntries.length; index += 1) {
      const clonedNode = getNodeAtPath(cloneRoot, state.richEntries[index].path);
      if (clonedNode?.nodeType !== Node.TEXT_NODE) return false;
      clonedNode.nodeValue = state.richNodeTexts[index];
    }
    return true;
  }

  function richTranslationIsCurrent(source, state) {
    if (!state.richNodeTexts) return false;
    return state.richEntries.every(
      (entry, index) =>
        entry.node.isConnected &&
        source.contains(entry.node) &&
        entry.node.nodeValue === state.richNodeTexts[index]
    );
  }

  function applyRichTranslationToSource(source, state) {
    restoreSourceChildren(source, state);
    if (!state.richNodeTexts) return false;
    for (let index = 0; index < state.richEntries.length; index += 1) {
      const entry = state.richEntries[index];
      if (!entry.node.isConnected || !source.contains(entry.node)) return false;
      entry.node.nodeValue = state.richNodeTexts[index];
    }
    return true;
  }

  function createBilingualTranslation(source, id, translatedText, state) {
    const isTableCell = source.matches("td, th");
    const translation = isTableCell
      ? document.createElement("div")
      : source.cloneNode(false);
    // 重复 id 会干扰页面脚本和锚点；class、行内样式及其它布局属性保留。
    translation.removeAttribute("id");
    translation.removeAttribute(SOURCE_ATTRIBUTE);
    translation.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    translation.removeAttribute(ORIGINAL_WRAPPER_ATTRIBUTE);
    translation.setAttribute(TARGET_ATTRIBUTE, id);
    translation.classList.add(TRANSLATION_CLASS);

    if (state.richNodeTexts) {
      state.originalNodes.forEach((node) => translation.append(node.cloneNode(true)));
      stripClonedIdentity(translation);
      translation.setAttribute(TARGET_ATTRIBUTE, id);
      translation.classList.add(TRANSLATION_CLASS);
      if (!applyRichTextToClone(translation, state)) {
        translation.replaceChildren(document.createTextNode(translatedText));
        applyTranslationTypography(translation, state);
      }
    } else {
      translation.textContent = translatedText;
      applyTranslationTypography(translation, state);
    }

    // 双语列表只保留原文项目的 bullet/编号，避免多出一个列表序号。
    if (source.tagName.toLowerCase() === "li") {
      translation.style.listStyle = "none";
    }
    translation.style.marginTop = "0.45em";
    return translation;
  }

  function renderModernSource(source, id) {
    const translatedText = translatedTextBySource.get(source);
    if (!translatedText) return;

    const state = getRenderState(source);

    if (
      currentDisplayMode === "translation" &&
      state.mode === "translation" &&
      source.getAttribute(TARGET_ATTRIBUTE) === id &&
      (state.renderStrategy === "rich"
        ? richTranslationIsCurrent(source, state)
        : source.textContent === translatedText)
    ) {
      if (state.renderStrategy !== "rich") applyTranslationTypography(source, state);
      return;
    }

    removeBilingualTranslation(state);

    if (currentDisplayMode === "translation") {
      // source 自己留在原位置，外层标签、class、尺寸、定位及父布局关系均不变。
      if (state.richNodeTexts && applyRichTranslationToSource(source, state)) {
        state.renderStrategy = "rich";
      } else {
        source.replaceChildren(document.createTextNode(translatedText));
        applyTranslationTypography(source, state);
        state.renderStrategy = "plain";
      }
      source.setAttribute(TARGET_ATTRIBUTE, id);
      state.mode = "translation";
      return;
    }

    restoreSourceChildren(source, state);
    if (currentDisplayMode === "bilingual") {
      const translation = createBilingualTranslation(
        source,
        id,
        translatedText,
        state
      );
      if (source.matches("td, th")) {
        source.append(translation);
      } else {
        source.insertAdjacentElement("afterend", translation);
      }
      state.translationElement = translation;
      state.mode = "bilingual";
    }
  }

  function isLegacySource(source) {
    return (
      source.tagName === "BR" || source.hasAttribute(LEGACY_ANCHOR_ATTRIBUTE)
    );
  }

  function insertTranslation(id, translatedText, richNodeTexts = null) {
    const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${id}"]`);
    if (!source) return;

    const isLegacyAnchor = isLegacySource(source);

    // 已有译文 → 更新文本
    const existing = findTranslationForId(id);
    if (existing && isLegacyAnchor) {
      existing.textContent = translatedText;
      translatedTextBySource.set(source, translatedText);
      applyDisplayModeToSegment(id);
      return;
    }

    translatedTextBySource.set(source, translatedText);

    if (!isLegacyAnchor) {
      const state = getRenderState(source);
      state.richNodeTexts =
        Array.isArray(richNodeTexts) &&
        richNodeTexts.length === state.richEntries.length
          ? richNodeTexts
          : null;
      renderModernSource(source, id);
      return;
    }

    // 记录原文元素的原始 display（仅一次），用于切换模式时恢复
    if (!source.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
      source.setAttribute(
        ORIGINAL_DISPLAY_ATTRIBUTE,
        source.style.display || ""
      );
    }

    // legacy 模式：记录 legacy sources 的 display
    if (isLegacyAnchor) {
      document
        .querySelectorAll(`[${LEGACY_SOURCE_ATTRIBUTE}="${id}"]`)
        .forEach((node) => {
          if (!node.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
            node.setAttribute(
              ORIGINAL_DISPLAY_ATTRIBUTE,
              node.style.display || ""
            );
          }
        });
    }

    // legacy 页面仍使用锚点后的兄弟节点；锚点本身通常是 BR，无法承载文本。
    const translation = document.createElement("p");
    translation.className = TRANSLATION_CLASS;
    translation.setAttribute(TARGET_ATTRIBUTE, id);
    translation.textContent = translatedText;
    source.insertAdjacentElement("afterend", translation);

    applyDisplayModeToSegment(id);
  }

  function applyDisplayModeToSegment(id) {
    const showOriginal = currentDisplayMode !== "translation";
    const showTranslation = currentDisplayMode !== "original";

    const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${id}"]`);
    if (!source) return;

    if (!isLegacySource(source)) {
      renderModernSource(source, id);
      return;
    }

    const translation = findTranslationForId(id);

    // legacy 锚点模式
    if (source.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
      const originalDisplay =
        source.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || "";
      source.style.display = showOriginal ? originalDisplay : "none";
    }

    // legacy sources
    const legacySources = queryAllRoots(
      `[${LEGACY_SOURCE_ATTRIBUTE}="${id}"]`
    );
    legacySources.forEach((node) => {
      if (!node.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
        node.setAttribute(
          ORIGINAL_DISPLAY_ATTRIBUTE,
          node.style.display || ""
        );
      }
      node.style.display = showOriginal
        ? node.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || ""
        : "none";
    });

    // 控制译文 display
    if (translation) {
      translation.style.display = showTranslation ? "" : "none";
      translation.style.marginTop =
        showOriginal && showTranslation ? "0.45em" : "0";
    }
  }

  function setDisplayMode(mode) {
    if (!DISPLAY_MODES.has(mode)) return;
    currentDisplayMode = mode;
    const renderVersion = ++displayModeRenderVersion;
    const sources = queryAllRoots(`[${SOURCE_ATTRIBUTE}]`).filter((source) =>
      translatedTextBySource.has(source)
    );
    let index = 0;

    function renderBatch() {
      if (renderVersion !== displayModeRenderVersion) return;
      const batchEnd = Math.min(index + 60, sources.length);
      while (index < batchEnd) {
        const source = sources[index];
        applyDisplayModeToSegment(source.getAttribute(SOURCE_ATTRIBUTE));
        index += 1;
      }
      if (index < sources.length) setTimeout(renderBatch, 0);
    }

    renderBatch();
  }

  function createRecoveredTranslation(source, id) {
    const translatedText = translatedTextBySource.get(source);
    if (!translatedText) return null;
    if (!isLegacySource(source)) {
      renderModernSource(source, id);
      return findTranslationForId(id);
    }

    const translation = document.createElement("p");
    translation.className = TRANSLATION_CLASS;
    translation.setAttribute(TARGET_ATTRIBUTE, id);
    translation.textContent = translatedText;
    source.insertAdjacentElement("afterend", translation);
    applyDisplayModeToSegment(id);
    return translation;
  }

  function repairRenderedSource(source) {
    if (isRestoring) return;
    const id = source.getAttribute(SOURCE_ATTRIBUTE);
    if (!id) return;

    const translation = findTranslationForId(id);
    const translatedText = translatedTextBySource.get(source);
    const translationIsCurrent =
      translation?.isConnected &&
      (translation !== source ||
        (renderStateBySource.get(source)?.renderStrategy === "rich"
          ? richTranslationIsCurrent(source, renderStateBySource.get(source))
          : source.textContent === translatedText));
    if (translationIsCurrent) {
      // 当前渲染已经正确时不能再次调用 renderModernSource。尤其在双语
      // 模式下，重复渲染会先移除再创建 clone，MutationObserver 会因此
      // 形成自激循环。
      return;
    }

    // 译文被框架移除 → 重建
    if (translatedTextBySource.has(source)) {
      createRecoveredTranslation(source, id);
    }
  }

  function sourceMatchesTrackedContent(source) {
    const state = renderStateBySource.get(source);
    if (state) {
      if (state.mode === "translation") {
        const translatedText = translatedTextBySource.get(source);
        return state.renderStrategy === "rich"
          ? richTranslationIsCurrent(source, state)
          : source.textContent === translatedText;
      }
      return getElementText(source) === state.originalText;
    }

    const expectedText = sourceTextBySource.get(source);
    return expectedText === undefined || getElementText(source) === expectedText;
  }

  function sourceStillContainsPlainTranslation(source) {
    const state = renderStateBySource.get(source);
    const translatedText = translatedTextBySource.get(source);
    return Boolean(
      state?.mode === "translation" &&
        state.renderStrategy === "plain" &&
        translatedText &&
        normalizeText(source.textContent || "").includes(
          normalizeText(translatedText)
        )
    );
  }

  function stageChangedSourceForTranslation(source) {
    const oldId = source.getAttribute(SOURCE_ATTRIBUTE);
    if (!oldId || isLegacySource(source)) return;

    const state = renderStateBySource.get(source);
    if (state) {
      removeBilingualTranslation(state);
      restoreInlineTextStyles(source, state);
    }

    // 框架已经把当前节点改成了新的原文。这里不能调用 restoreSourceChildren，
    // 否则会把虚拟列表的新标题重新覆盖成旧标题。
    translatedTextBySource.delete(source);
    renderStateBySource.delete(source);
    preparedSourcesById.delete(oldId);
    failedSegments.delete(oldId);
    source.removeAttribute(SOURCE_ATTRIBUTE);
    source.removeAttribute(TARGET_ATTRIBUTE);
    source.removeAttribute("data-local-translator-failed");
    pendingRetranslations.delete(source);
    preparedPageData = null;

    const text = getElementText(source);
    if (!isUsefulText(text) || !isVisible(source)) {
      sourceTextBySource.delete(source);
      return;
    }

    // 仅预扫描、尚未开始翻译时，只让下次 collect 重新建立快照。语言包
    // 创建期间也要把虚拟列表复用的新版本入队，不能因为实例未就绪而丢弃。
    if (translationState === "idle") {
      sourceTextBySource.delete(source);
      return;
    }

    // 使用新 id，使仍在 await Translator.translate() 的旧任务即使完成，
    // 也找不到目标节点，不能把旧译文写回已复用的卡片。
    const id = String(++segmentIdCounter);
    source.setAttribute(SOURCE_ATTRIBUTE, id);
    preparedSourcesById.set(id, source);
    sourceTextBySource.set(source, text);
    pendingRetranslations.set(source, {
      id,
      text,
      inViewport: isInViewport(source)
    });
    scheduleDynamicFlush([]);
  }

  function nodeContainsOpenShadowRoot(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.shadowRoot) return true;
    return Array.from(node.querySelectorAll("*")).some(
      (element) => Boolean(element.shadowRoot)
    );
  }

  const observedRenderRoots = new WeakSet();
  const renderObserver = new MutationObserver((mutations) => {
    if (isRestoring) return;
    const affectedSources = new Set();
    let mayContainNewShadowRoot = false;

    for (const mutation of mutations) {
      if (Array.from(mutation.addedNodes).some(nodeContainsOpenShadowRoot)) {
        mayContainNewShadowRoot = true;
      }
      // 译文节点被移除 → 标记对应 source 重建
      for (const removed of mutation.removedNodes) {
        if (
          removed.nodeType === Node.ELEMENT_NODE &&
          removed.hasAttribute?.(TARGET_ATTRIBUTE)
        ) {
          const removedId = removed.getAttribute(TARGET_ATTRIBUTE);
          const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${removedId}"]`);
          if (source && translatedTextBySource.has(source)) {
            affectedSources.add(source);
          }
        }
      }
      const target =
        mutation.target.nodeType === Node.ELEMENT_NODE
          ? mutation.target
          : mutation.target.parentElement;
      const source = closestComposed(target, `[${SOURCE_ATTRIBUTE}]`);
      if (source) affectedSources.add(source);
    }

    if (mayContainNewShadowRoot) {
      const roots = discoverSearchRoots();
      observeRenderRoots(roots);
      observeDynamicRoots(roots);
    }
    affectedSources.forEach((source) => {
      if (!sourceMatchesTrackedContent(source)) {
        // 有些框架会把旧原文追加到仍在 DOM 中的纯文本译文后面；此时
        // 译文本身仍在，直接按当前模式重绘即可。真正的虚拟卡片复用会
        // 完整换掉旧译文，才进入新版本翻译流程。
        if (sourceStillContainsPlainTranslation(source)) {
          repairRenderedSource(source);
        } else {
          stageChangedSourceForTranslation(source);
        }
      } else {
        repairRenderedSource(source);
      }
    });
  });

  function observeRenderRoots(roots = discoverSearchRoots()) {
    for (const root of roots) {
      const target = root === document.body ? document.documentElement : root;
      if (observedRenderRoots.has(target)) continue;
      observedRenderRoots.add(target);
      renderObserver.observe(target, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }
  observeRenderRoots();

  function restoreOriginal() {
    isRestoring = true;
    displayModeRenderVersion += 1;
    destroyTranslator();
    failedSegments.clear();
    queryAllRoots(`[data-local-translator-failed]`).forEach((node) =>
      node.removeAttribute("data-local-translator-failed")
    );
    // 现代页面先把暂存的原子节点原样放回；source 自己也是仅译文模式的
    // target，不能像旧兄弟节点那样直接 remove。
    queryAllRoots(`[${SOURCE_ATTRIBUTE}]`).forEach((source) => {
      const state = renderStateBySource.get(source);
      if (state) {
        removeBilingualTranslation(state);
        restoreSourceChildren(source, state);
      }
      translatedTextBySource.delete(source);
      renderStateBySource.delete(source);
      sourceTextBySource.delete(source);
    });
    // 移除 legacy 或残留的兄弟译文节点。
    queryAllRoots(`[${TARGET_ATTRIBUTE}]`).forEach((node) => {
      if (!node.hasAttribute(SOURCE_ATTRIBUTE)) node.remove();
    });
    // 恢复原文 display
    queryAllRoots(`[${ORIGINAL_DISPLAY_ATTRIBUTE}]`).forEach((node) => {
      node.style.display =
        node.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || "";
      node.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    });
    // 解包 td/th 的原文 wrapper
    queryAllRoots(`[${ORIGINAL_WRAPPER_ATTRIBUTE}]`).forEach((node) =>
      node.replaceWith(...node.childNodes)
    );
    queryAllRoots(`[${SOURCE_ATTRIBUTE}]`).forEach((node) =>
      node.removeAttribute(SOURCE_ATTRIBUTE)
    );
    queryAllRoots(`[${LEGACY_ANCHOR_ATTRIBUTE}]`).forEach((node) =>
      node.remove()
    );
    queryAllRoots(`[${LEGACY_SOURCE_ATTRIBUTE}]`).forEach((node) =>
      node.replaceWith(...node.childNodes)
    );
    queryAllRoots(`[${RESIDUAL_SOURCE_ATTRIBUTE}]`).forEach((node) =>
      node.replaceWith(...node.childNodes)
    );
    clearPreparedPageData();
    translatedPageUrl = "";
    currentProgress = 0;
    isRestoring = false;
  }

  // --- 翻译引擎层 ---
  // 翻译编排骨架下沉到 content.js：持有 translator 实例，弹窗关闭也能继续翻译。
  // 进度通过 chrome.runtime.sendMessage 广播给 service worker（badge/icon）+ popup（UI）。

  function reportToPopup(message) {
    chrome.runtime
      .sendMessage({ pageUrl: location.href, ...message })
      .catch(() => {});
  }

  function destroyTranslator() {
    if (translatorInstance) {
      try {
        translatorInstance.destroy();
      } catch {
        // ignore
      }
      translatorInstance = null;
    }
    translatorSourceLang = "";
    translatorTargetLang = "";
    translationState = "idle";
    abortRequested = true;
    stopDynamicObserver();
    stopViewportObserver();
  }

  async function ensureTranslator(sourceLanguage, targetLanguage, onProgress) {
    // 语言对相同则复用，变更则销毁重建。
    if (
      translatorInstance &&
      translatorSourceLang === sourceLanguage &&
      translatorTargetLang === targetLanguage
    ) {
      return translatorInstance;
    }

    if (translatorInstance) {
      try {
        translatorInstance.destroy();
      } catch {
        // ignore
      }
      translatorInstance = null;
    }

    if (!("Translator" in self)) {
      throw new Error(
        "当前环境不支持 Translator API（需 Chrome 138+，且 content script 可用）"
      );
    }

    const options = { sourceLanguage, targetLanguage };
    const availability = await Translator.availability(options);
    const needsDownload =
      availability === "downloadable" || availability === "downloading";

    if (availability === "unavailable") {
      throw new Error("当前设备不支持这个语言组合");
    }

    translationState = "creating";
    let latestDownloadProgress = 0;
    let downloadProgressVisible = false;
    let downloadProgressTimer = null;

    // Chrome 可能对已经存在于本机的语言包仍返回 downloadable，随后在
    // Translator.create() 中立即发出 100%。延迟展示可以过滤这种假下载，
    // 真实下载持续超过阈值时仍会正常显示进度。
    if (needsDownload) {
      downloadProgressTimer = setTimeout(() => {
        downloadProgressVisible = true;
        onProgress?.(latestDownloadProgress);
      }, 500);
    }

    try {
      translatorInstance = await Translator.create({
        ...options,
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            if (!needsDownload) return;
            latestDownloadProgress = Math.round(event.loaded * 100);
            if (downloadProgressVisible) {
              onProgress?.(latestDownloadProgress);
            }
          });
        }
      });
    } finally {
      if (downloadProgressTimer) clearTimeout(downloadProgressTimer);
    }
    translatorSourceLang = sourceLanguage;
    translatorTargetLang = targetLanguage;
    translationState = "ready";
    return translatorInstance;
  }

  function splitTextForTranslation(text, maximumLength = 1800) {
    if (text.length <= maximumLength) return [text];

    const sentences =
      text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu) || [text];
    const chunks = [];
    let current = "";

    function commitCurrent() {
      const value = current.trim();
      if (value) chunks.push(value);
      current = "";
    }

    for (const sentence of sentences) {
      const value = sentence.trim();
      if (!value) continue;

      if (value.length > maximumLength) {
        commitCurrent();
        for (let index = 0; index < value.length; index += maximumLength) {
          chunks.push(value.slice(index, index + maximumLength));
        }
        continue;
      }

      if (current && current.length + value.length + 1 > maximumLength) {
        commitCurrent();
      }
      current += `${current ? " " : ""}${value}`;
    }
    commitCurrent();
    return chunks;
  }

  async function translateSegment(id, text) {
    if (!translatorInstance) throw new Error("translator 未就绪");
    const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${id}"]`);
    if (!source) return false;
    const legacySource = isLegacySource(source);
    if (!legacySource && getElementText(source) !== normalizeText(text)) {
      return false;
    }
    // 完整性优先：页面级源语言只用于创建 Translator；所有已收集段落都
    // 必须进入缓存/翻译管线。短词、专有名词、混合语言或检测置信度不能
    // 再成为跳过理由，是否保持原词交给 Translator 自身决定。

    const state = !legacySource ? getRenderState(source) : null;
    const canTranslateRichText = Boolean(state?.richEntries.length);
    const cacheKey = `${translatorSourceLang}|${translatorTargetLang}|${text}`;
    let cached = useTranslationCache ? translationCache[cacheKey] : null;
    let translatedText = typeof cached === "string" ? cached : cached?.text || "";
    let richNodeTexts =
      canTranslateRichText &&
      Array.isArray(cached?.richNodeTexts) &&
      cached.richNodeTexts.length === state.richEntries.length
        ? cached.richNodeTexts
        : null;

    if (canTranslateRichText && !richNodeTexts) {
      const request = encodeRichTranslationRequest(state.richEntries);
      if (request.length <= MAX_RICH_TRANSLATION_LENGTH) {
        const response = await translatorInstance.translate(request);
        richNodeTexts = parseRichTranslationResponse(response, state.richEntries);
      }

      // 极少数模型可能改写私有分隔符。此时退回逐节点翻译，牺牲少量速度，
      // 但确保链接、强调、代码与原 DOM 交互结构不会因为解析失败而丢失。
      if (!richNodeTexts) {
        richNodeTexts = [];
        for (const entry of state.richEntries) {
          const chunks = splitTextForTranslation(entry.text);
          const translatedChunks = [];
          for (const chunk of chunks) {
            translatedChunks.push(await translatorInstance.translate(chunk));
          }
          richNodeTexts.push(
            formatRichNodeTranslation(entry, translatedChunks.join(" "))
          );
        }
      }
      translatedText = normalizeText(richNodeTexts.join(" "));
    } else if (!translatedText) {
      const chunks = splitTextForTranslation(text);
      const translatedChunks = [];
      for (const chunk of chunks) {
        translatedChunks.push(await translatorInstance.translate(chunk));
      }
      translatedText = translatedChunks.join(" ");
    }

    if (
      !source.isConnected ||
      source.getAttribute(SOURCE_ATTRIBUTE) !== id ||
      (!legacySource && getElementText(source) !== normalizeText(text))
    ) {
      return false;
    }

    if (useTranslationCache && (!cached || (canTranslateRichText && !cached.richNodeTexts))) {
      translationCache[cacheKey] = richNodeTexts
        ? { text: translatedText, richNodeTexts }
        : translatedText;
      cacheDirty = true;
    }
    insertTranslation(id, translatedText, richNodeTexts);
    return true;
  }

  async function loadTranslationCache() {
    if (!useTranslationCache) {
      translationCache = {};
      translationPageCache = {};
      cacheDirty = false;
      pageCacheDirty = false;
      return;
    }
    if (!chrome.storage?.local) {
      translationCache = {};
      translationPageCache = {};
      cacheDirty = false;
      pageCacheDirty = false;
      return;
    }
    const stored = await chrome.storage.local.get([
      "translationCache",
      "translationPageCache"
    ]);
    translationCache = stored.translationCache || {};
    translationPageCache = stored.translationPageCache || {};
    cacheDirty = false;
    pageCacheDirty = false;
  }

  async function saveTranslationCache() {
    if (
      !useTranslationCache ||
      (!cacheDirty && !pageCacheDirty) ||
      !chrome.storage?.local
    ) {
      return;
    }
    const entries = Object.entries(translationCache);
    translationCache = Object.fromEntries(
      entries.slice(-MAX_TRANSLATION_CACHE_ENTRIES)
    );
    const pageEntries = Object.entries(translationPageCache).sort(
      (left, right) =>
        (left[1]?.updatedAt || 0) - (right[1]?.updatedAt || 0)
    );
    translationPageCache = Object.fromEntries(
      pageEntries.slice(-MAX_TRANSLATION_PAGE_CACHE_ENTRIES)
    );
    await chrome.storage.local.set({ translationCache, translationPageCache });
    cacheDirty = false;
    pageCacheDirty = false;
  }

  function rememberCachedPage(pageUrl, sourceLanguage, targetLanguage) {
    translationPageCache[pageUrl] = {
      sourceLanguage,
      targetLanguage,
      updatedAt: Date.now()
    };
    pageCacheDirty = true;
  }

  function parseTranslationCacheKey(cacheKey) {
    const firstSeparator = cacheKey.indexOf("|");
    const secondSeparator = cacheKey.indexOf("|", firstSeparator + 1);
    if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1) return null;
    return {
      sourceLanguage: cacheKey.slice(0, firstSeparator),
      targetLanguage: cacheKey.slice(firstSeparator + 1, secondSeparator),
      text: cacheKey.slice(secondSeparator + 1)
    };
  }

  function inferLegacyCachedPageRecord(
    targetLanguage,
    configuredSourceLanguage = "auto"
  ) {
    // 旧版缓存没有 URL。先做一次不触发布局的纯文本预筛：同一语言对至少
    // 命中 3 段较长原文且总长度足够，才值得执行完整 DOM 收集。普通新页面
    // 不会因为缓存中偶然存在 “About” 等通用短词而触发扫描或回放。
    if (Object.keys(translationCache).length === 0) return null;
    const pageText = normalizeText(document.body?.textContent || "");
    const scores = new Map();
    for (const cacheKey of Object.keys(translationCache)) {
      const parsed = parseTranslationCacheKey(cacheKey);
      if (
        !parsed ||
        parsed.targetLanguage !== targetLanguage ||
        parsed.text.length < 20 ||
        (configuredSourceLanguage !== "auto" &&
          parsed.sourceLanguage !== configuredSourceLanguage) ||
        !pageText.includes(parsed.text)
      ) {
        continue;
      }
      let score = scores.get(parsed.sourceLanguage);
      if (!score) {
        score = { texts: new Set(), textLength: 0 };
        scores.set(parsed.sourceLanguage, score);
      }
      if (!score.texts.has(parsed.text)) {
        score.texts.add(parsed.text);
        score.textLength += parsed.text.length;
      }
    }

    const best = Array.from(scores.entries()).sort(
      (left, right) => right[1].textLength - left[1].textLength
    )[0];
    if (!best || best[1].texts.size < 3 || best[1].textLength < 180) {
      return null;
    }
    return {
      sourceLanguage: best[0],
      targetLanguage,
      migrated: true
    };
  }

  function getUsableCachedTranslation(source, cached) {
    const translatedText =
      typeof cached === "string" ? cached : cached?.text || "";
    if (!translatedText) return null;
    if (isLegacySource(source)) {
      return { translatedText, richNodeTexts: null };
    }

    const state = getRenderState(source);
    if (state.richEntries.length === 0) {
      return { translatedText, richNodeTexts: null };
    }
    if (
      Array.isArray(cached?.richNodeTexts) &&
      cached.richNodeTexts.length === state.richEntries.length
    ) {
      return { translatedText, richNodeTexts: cached.richNodeTexts };
    }
    // DOM 已变成富文本而旧缓存只有整段文本时，直接 replaceChildren 会
    // 破坏链接/图标/事件。此段留给正常翻译流程重新生成节点级缓存。
    return null;
  }

  async function hydrateCachedPage(pageUrl = location.href) {
    if (!chrome.storage?.local || translationState !== "idle") return false;
    const stored = await chrome.storage.local.get([
      "cacheEnabled",
      "translationCache",
      "translationPageCache",
      "sourceLanguage",
      "targetLanguage",
      "displayMode"
    ]);
    if (stored.cacheEnabled === false || location.href !== pageUrl) return false;

    useTranslationCache = true;
    translationCache = stored.translationCache || {};
    translationPageCache = stored.translationPageCache || {};
    cacheDirty = false;
    pageCacheDirty = false;
    const desiredTargetLanguage = stored.targetLanguage || "zh";
    const configuredSourceLanguage = stored.sourceLanguage || "auto";
    let pageRecord = translationPageCache[pageUrl];
    if (
      !pageRecord ||
      pageRecord.targetLanguage !== desiredTargetLanguage ||
      (configuredSourceLanguage !== "auto" &&
        pageRecord.sourceLanguage !== configuredSourceLanguage)
    ) {
      pageRecord = null;
    }
    if (!pageRecord) {
      pageRecord = inferLegacyCachedPageRecord(
        desiredTargetLanguage,
        configuredSourceLanguage
      );
    }
    if (!pageRecord) return false;

    if (DISPLAY_MODES.has(stored.displayMode)) {
      setDisplayMode(stored.displayMode);
    }
    const pageData = await collectSegments();
    if (location.href !== pageUrl || translationState !== "idle") return false;

    let restored = 0;
    const missingSegments = [];
    for (const segment of pageData.segments || []) {
      const source =
        preparedSourcesById.get(segment.id) ||
        queryRoot(`[${SOURCE_ATTRIBUTE}="${segment.id}"]`);
      if (!source) continue;
      const cacheKey = `${pageRecord.sourceLanguage}|${pageRecord.targetLanguage}|${segment.text}`;
      const cached = translationCache[cacheKey];
      if (!cached) {
        missingSegments.push(segment);
        continue;
      }
      const usable = getUsableCachedTranslation(source, cached);
      if (!usable) {
        missingSegments.push(segment);
        continue;
      }
      insertTranslation(
        segment.id,
        usable.translatedText,
        usable.richNodeTexts
      );
      restored += 1;
    }
    if (restored === 0 || location.href !== pageUrl) return false;

    translatorSourceLang = pageRecord.sourceLanguage;
    translatorTargetLang = pageRecord.targetLanguage;
    translatedPageUrl = pageUrl;
    currentProgress = 100;
    translationState = "ready";
    preparedPageData = null;

    if (pageRecord.migrated) {
      rememberCachedPage(
        pageUrl,
        pageRecord.sourceLanguage,
        pageRecord.targetLanguage
      );
      await saveTranslationCache().catch(() => {});
    }

    reportToPopup({
      type: "translation-complete",
      total: restored,
      translated: restored,
      failed: 0,
      cached: true
    });
    if (missingSegments.length > 0) {
      setTimeout(() => {
        fillHydratedCacheMisses(pageUrl, pageRecord, missingSegments);
      }, 0);
    }
    return true;
  }

  async function fillHydratedCacheMisses(pageUrl, pageRecord, segments) {
    await yieldToMainThread();
    if (location.href !== pageUrl || translationState !== "ready") return;

    abortRequested = false;
    try {
      await ensureTranslator(
        pageRecord.sourceLanguage,
        pageRecord.targetLanguage
      );
      if (location.href !== pageUrl || abortRequested) return;
      translationState = "translating";
      let translated = 0;
      for (const segment of segments) {
        if (location.href !== pageUrl || abortRequested) break;
        if (await translateSegment(segment.id, segment.text)) translated += 1;
      }
      if (translated > 0) {
        rememberCachedPage(
          pageUrl,
          pageRecord.sourceLanguage,
          pageRecord.targetLanguage
        );
        await saveTranslationCache();
        reportToPopup({
          type: "translation-complete",
          total: translated,
          translated,
          failed: 0,
          incremental: true,
          cachedReplayFill: true,
          cacheSaved: true
        });
      }
    } catch {
      // 已命中的缓存仍保持可见；补翻失败不撤销当前页面，用户稍后可重试。
    } finally {
      if (location.href === pageUrl) translationState = "ready";
    }
  }

  function startCachedPageHydration(pageUrl = location.href) {
    cacheHydrationPromise = hydrateCachedPage(pageUrl).catch(() => false);
    return cacheHydrationPromise;
  }

  async function runTranslation(
    sourceLanguage,
    targetLanguage,
    scope = "viewport",
    cacheEnabled = true
  ) {
    const runPageUrl = location.href;
    abortRequested = false;
    failedSegments.clear();
    currentProgress = 0;
    currentScope = scope === "viewport" ? "viewport" : "all";
    useTranslationCache = cacheEnabled !== false;
    await loadTranslationCache();

    // 弹窗初始化已经为自动语言检测收集过 segment。直接复用这批 source，
    // 避免 Reddit/YouTube 等大页面在点击翻译时再次做整页布局扫描。
    // 只有页面确实已有译文时才恢复原文并重新收集。
    const hasRenderedTranslations = queryAllRoots(
      `[${SOURCE_ATTRIBUTE}]`
    ).some((source) => translatedTextBySource.has(source));
    let pageData = hasRenderedTranslations
      ? null
      : getReusablePreparedPageData();
    if (hasRenderedTranslations) restoreOriginal();
    abortRequested = false;

    translationState = "translating";
    // 从语言包准备阶段就开始监听增量内容。实时页面可能在首屏翻译完成前
    // 已经换入新卡片；过晚注册 observer 会让这些节点永久漏过。
    startDynamicObserver();
    try {
      await ensureTranslator(sourceLanguage, targetLanguage, (progress) => {
        reportToPopup({
          type: "translation-progress",
          phase: "download",
          progress
        });
      });
      // ensureTranslator 完成时状态为 ready；初始批次仍需独占 Translator
      // 实例，等主循环结束后再处理准备期间积累的动态节点。
      translationState = "translating";
    } catch (error) {
      translationState = "idle";
      stopDynamicObserver();
      reportToPopup({
        type: "translation-error",
        message: error?.message || "translator 创建失败"
      });
      return;
    }

    if (location.href !== runPageUrl || abortRequested) {
      destroyTranslator();
      return;
    }

    if (!pageData) pageData = await collectSegments();
    if (location.href !== runPageUrl || abortRequested) {
      restoreOriginal();
      return;
    }
    preparedPageData = null;
    const allSegments = pageData.segments || [];
    const segments = allSegments.filter(
      (segment) => currentScope === "all" || segment.inViewport
    );
    const offscreenSegments = allSegments.filter(
      (segment) => !segment.inViewport
    );

    // 尽早观察屏外内容。首屏翻译可能持续较久；如果等首屏全部完成后才
    // 注册 observer，期间滚入视口的节点会错过滚动时机。
    if (currentScope === "viewport") {
      startViewportObserver(offscreenSegments);
    }

    if (segments.length === 0) {
      translatedPageUrl = "";
      translationState = "ready";
      reportToPopup({ type: "translation-complete", total: 0, failed: 0 });
      drainViewportTranslationQueue();
      return;
    }

    const total = segments.length;
    translatedPageUrl = runPageUrl;
    let done = 0;
    let translated = 0;
    let skipped = 0;
    let lastReportedProgress = -1;

    for (const segment of segments) {
      if (abortRequested || location.href !== runPageUrl) break;
      try {
        if (await translateSegment(segment.id, segment.text)) {
          translated += 1;
        } else {
          skipped += 1;
        }
      } catch {
        failedSegments.add(segment.id);
        const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${segment.id}"]`);
        source?.setAttribute("data-local-translator-failed", "true");
      }
      done += 1;
      currentProgress = Math.round((done / total) * 100);
      // 大页面不需要逐段刷新 popup/icon。最多约 50 次进度更新，显著降低
      // content → service worker → popup 的跨进程消息和图标重绘压力。
      if (
        done === total ||
        lastReportedProgress < 0 ||
        currentProgress >= lastReportedProgress + 2
      ) {
        lastReportedProgress = currentProgress;
        reportToPopup({
          type: "translation-progress",
          phase: "translate",
          done,
          total,
          translated,
          skipped,
          failed: failedSegments.size
        });
      }
    }

    if (location.href !== runPageUrl) {
      restoreOriginal();
      return;
    }
    translationState = "ready";
    if (useTranslationCache && translated > 0 && !abortRequested) {
      rememberCachedPage(runPageUrl, sourceLanguage, targetLanguage);
    }
    let cacheSaved = !useTranslationCache;
    await saveTranslationCache().catch(() => {
      // 缓存写入失败不影响当前页面已经完成的翻译。
      cacheSaved = false;
    });
    if (useTranslationCache && !cacheDirty && !pageCacheDirty) {
      cacheSaved = true;
    }
    // “翻译完成”必须晚于持久化。否则用户看到完成图标后立即关页时，content
    // script 可能在 storage.set 结束前被销毁，造成看似开启缓存却没有写入。
    reportToPopup({
      type: "translation-complete",
      total,
      translated,
      skipped,
      failed: failedSegments.size,
      aborted: abortRequested,
      cacheSaved
    });
    drainViewportTranslationQueue();

    // 动态 observer 已在语言包准备阶段启动；可视区域模式下，新增的屏外
    // 内容会先进入 IntersectionObserver，在预加载带内再翻译。
  }

  async function retryFailed() {
    if (failedSegments.size === 0 || !translatorInstance) return;
    const ids = Array.from(failedSegments);
    failedSegments.clear();
    translationState = "translating";
    const total = ids.length;
    let done = 0;

    for (const id of ids) {
      if (abortRequested) break;
      const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${id}"]`);
      if (!source) continue;
      const text = getElementText(source);
      try {
        await translateSegment(id, text);
        source.removeAttribute("data-local-translator-failed");
      } catch {
        failedSegments.add(id);
      }
      done += 1;
      reportToPopup({
        type: "translation-progress",
        phase: "retry",
        done,
        total,
        failed: failedSegments.size
      });
    }
    translationState = "ready";
    reportToPopup({
      type: "translation-complete",
      total: ids.length,
      failed: failedSegments.size,
      aborted: abortRequested,
      retried: true
    });
    await saveTranslationCache().catch(() => {});
  }

  // --- 动态内容自动追加翻译 ---
  // dynamicObserver 与 renderObserver 职责分离：
  // renderObserver 只修复已渲染容器被框架重排后的结构；
  // dynamicObserver 收集新出现、未被标记的文本块并翻译。

  async function collectIncrementalFromNodes(addedNodes) {
    const seen = new Set();
    const genericResultCache = new WeakMap();
    const segments = [];
    let visitedNodes = 0;

    for (const node of addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (!node.isConnected) continue;
      if (closestComposed(node, SKIP_SELECTOR)) continue;

      // 导航在响应式切换、登录状态变化时经常异步插入。先走原子 UI 标签
      // 通道，再继续用正文规则排除整个站点外壳。
      collectAtomicUiLabels([node], segments, seen);
      if (closestComposed(node, GENERIC_EXCLUDE_SELECTOR)) continue;

      // 节点本身是块级元素且未标记
      if (
        node.matches?.(BLOCK_SELECTOR) &&
        !node.hasAttribute(SOURCE_ATTRIBUTE) &&
        !node.querySelector(BLOCK_SELECTOR)
      ) {
        appendElementSegment(node, segments, seen);
      }

      // 节点子树里的块级元素
      for (const element of node.querySelectorAll(BLOCK_SELECTOR)) {
        if (element.hasAttribute(SOURCE_ATTRIBUTE)) continue;
        if (element.querySelector(BLOCK_SELECTOR)) continue;
        appendElementSegment(element, segments, seen);
        visitedNodes += 1;
        if (visitedNodes % 100 === 0) await yieldToMainThread();
      }

      collectNestedBlockResiduals([node], segments, seen);

      // 通用文本块（节点子树内，覆盖自定义卡片标题等）
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
          const text = normalizeText(textNode.nodeValue || "");
          if (!isUsefulText(text, 2)) return NodeFilter.FILTER_REJECT;
          if (closestComposed(textNode.parentElement, SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let textNode = walker.nextNode();
      while (textNode) {
        const candidate = findNearestTextBlock(
          textNode,
          node,
          genericResultCache
        );
        if (
          candidate &&
          !candidate.hasAttribute(SOURCE_ATTRIBUTE) &&
          !seen.has(candidate)
        ) {
          appendElementSegment(candidate, segments, seen);
        }
        textNode = walker.nextNode();
        visitedNodes += 1;
        if (visitedNodes % 160 === 0) await yieldToMainThread();
      }
    }

    return segments;
  }

  async function flushIncremental() {
    dynamicFlushTimer = null;
    if (dynamicFlushRunning) {
      if (
        dynamicFlushPending.length > 0 ||
        pendingRetranslations.size > 0
      ) {
        dynamicFlushTimer = setTimeout(flushIncremental, 300);
      }
      return;
    }
    if (translationState === "idle") {
      dynamicFlushPending = [];
      dynamicFlushPendingSet.clear();
      pendingRetranslations.clear();
      return;
    }
    // 语言包还在创建时保留新增节点，创建完成后再串行处理。
    if (!translatorInstance) {
      dynamicFlushTimer = setTimeout(flushIncremental, 100);
      return;
    }
    // Translator API 实例按串行使用。初始全页翻译尚未结束时保留队列，
    // 防止虚拟列表刷新任务与主循环并发调用同一个 translator。
    if (translationState !== "ready") {
      dynamicFlushTimer = setTimeout(flushIncremental, 100);
      return;
    }

    dynamicFlushRunning = true;
    try {
      const refreshedEntries = Array.from(pendingRetranslations.entries()).slice(
        0,
        MAX_DYNAMIC_ROOTS_PER_FLUSH
      );
      refreshedEntries.forEach(([source]) =>
        pendingRetranslations.delete(source)
      );
      const refreshedSegments = refreshedEntries
        .filter(
          ([source, segment]) =>
            source.isConnected &&
            source.getAttribute(SOURCE_ATTRIBUTE) === segment.id &&
            getElementText(source) === segment.text
        )
        .map(([, segment]) => segment);
      const remainingBudget = Math.max(
        0,
        MAX_DYNAMIC_ROOTS_PER_FLUSH - refreshedEntries.length
      );
      const addedNodes = dynamicFlushPending.splice(
        0,
        remainingBudget
      );
      addedNodes.forEach((node) => dynamicFlushPendingSet.delete(node));
      const segments = [
        ...refreshedSegments,
        ...(await collectIncrementalFromNodes(addedNodes))
      ];

      if (segments.length === 0) return;

      await runAuxiliaryTranslationTask(async () => {
        let translated = 0;
        for (const segment of segments) {
          if (abortRequested) break;
          if (currentScope === "viewport" && !segment.inViewport) {
            startViewportObserver([segment]);
            continue;
          }
          try {
            if (await translateSegment(segment.id, segment.text)) translated += 1;
          } catch {
            failedSegments.add(segment.id);
            const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${segment.id}"]`);
            source?.setAttribute("data-local-translator-failed", "true");
          }
        }
        if (translated > 0) {
          reportToPopup({
            type: "translation-progress",
            phase: "incremental",
            added: translated,
            failed: failedSegments.size
          });
          reportToPopup({
            type: "translation-complete",
            total: translated,
            failed: failedSegments.size,
            incremental: true
          });
          await saveTranslationCache().catch(() => {});
        }
      });
    } finally {
      dynamicFlushRunning = false;
      if (
        (dynamicFlushPending.length > 0 || pendingRetranslations.size > 0) &&
        !dynamicFlushTimer
      ) {
        dynamicFlushTimer = setTimeout(flushIncremental, 50);
      }
    }
  }

  function startViewportObserver(segments = []) {
    if (currentScope !== "viewport" || !translatorInstance) return;

    if (!viewportObserver) {
      viewportObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const observationTarget = entry.target;
            viewportObserver?.unobserve(observationTarget);
            const sources = viewportSourcesByTarget.get(observationTarget);
            if (sources) {
              sources.forEach(enqueueViewportTranslation);
              viewportSourcesByTarget.delete(observationTarget);
            }
          }
        },
        { root: null, rootMargin: VIEWPORT_PRELOAD_MARGIN, threshold: 0 }
      );
    }

    for (const segment of segments) {
      const source = queryRoot(`[${SOURCE_ATTRIBUTE}="${segment.id}"]`);
      if (source && !findTranslationForId(segment.id)) {
        // display:contents（嵌套列表正文的无布局 wrapper）没有可观察盒子，
        // 改为观察它的父块，进入视口时再把对应 source 加入翻译队列。
        const observationTarget = source.hasAttribute(
          RESIDUAL_SOURCE_ATTRIBUTE
        )
          ? source.parentElement
          : source;
        if (!observationTarget) continue;
        let sources = viewportSourcesByTarget.get(observationTarget);
        if (!sources) {
          sources = new Set();
          viewportSourcesByTarget.set(observationTarget, sources);
        }
        sources.add(source);
        viewportObserver.observe(observationTarget);
      }
    }
  }

  function enqueueViewportTranslation(source) {
    if (queuedViewportSources.has(source)) return;
    queuedViewportSources.add(source);
    viewportTranslationQueue.push(source);

    // runTranslation 的首屏循环与 Translator API 共用同一个实例。
    // 首屏尚未结束时只入队，结束后再串行处理，避免并发 translate 调用。
    if (translationState === "ready") drainViewportTranslationQueue();
  }

  async function drainViewportTranslationQueue() {
    if (
      viewportQueueRunning ||
      translationState !== "ready" ||
      !translatorInstance
    ) {
      return;
    }

    viewportQueueRunning = true;
    try {
      await runAuxiliaryTranslationTask(async () => {
        let translated = 0;
        while (viewportTranslationQueue.length > 0 && !abortRequested) {
          const source = viewportTranslationQueue.shift();
          queuedViewportSources.delete(source);
          if (!source?.isConnected) continue;

          const id = source.getAttribute(SOURCE_ATTRIBUTE);
          if (!id || findTranslationForId(id)) continue;
          const text = getElementText(source);
          if (!isUsefulText(text)) continue;

          try {
            if (await translateSegment(id, text)) translated += 1;
          } catch {
            failedSegments.add(id);
            source.setAttribute("data-local-translator-failed", "true");
          }
        }
        await saveTranslationCache().catch(() => {});
        if (translated > 0) {
          reportToPopup({
            type: "translation-progress",
            phase: "viewport",
            added: translated,
            failed: failedSegments.size
          });
          reportToPopup({
            type: "translation-complete",
            total: translated,
            failed: failedSegments.size,
            incremental: true
          });
        }
      });
    } finally {
      viewportQueueRunning = false;
      // await 让出执行权期间可能又有节点入队。
      if (viewportTranslationQueue.length > 0 && !abortRequested) {
        drainViewportTranslationQueue();
      }
    }
  }

  function stopViewportObserver() {
    if (viewportObserver) {
      viewportObserver.disconnect();
      viewportObserver = null;
    }
    viewportTranslationQueue = [];
    viewportSourcesByTarget = new WeakMap();
    queuedViewportSources = new WeakSet();
  }

  function scheduleDynamicFlush(nodes) {
    for (const node of nodes) {
      if (node.nodeType !== Node.ELEMENT_NODE || !node.isConnected) continue;
      if (dynamicFlushPendingSet.has(node)) continue;
      dynamicFlushPendingSet.add(node);
      dynamicFlushPending.push(node);
    }
    if (dynamicFlushTimer) return;
    dynamicFlushTimer = setTimeout(flushIncremental, 300);
  }

  function inlineStyleHides(styleText = "") {
    return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(
      styleText
    );
  }

  function attributeMutationRevealedContent(mutation) {
    const target = mutation.target;
    if (target.nodeType !== Node.ELEMENT_NODE) return false;

    if (mutation.attributeName === "hidden") {
      return mutation.oldValue !== null && !target.hasAttribute("hidden");
    }
    if (mutation.attributeName === "aria-hidden") {
      return (
        mutation.oldValue === "true" &&
        target.getAttribute("aria-hidden") !== "true"
      );
    }
    if (mutation.attributeName === "style") {
      const wasHidden = inlineStyleHides(mutation.oldValue || "");
      const isStillHidden = inlineStyleHides(
        target.getAttribute("style") || ""
      );
      return wasHidden && !isStillHidden && isVisible(target);
    }
    return false;
  }

  function shellClassMutationMayReveal(mutation) {
    const before = new Set((mutation.oldValue || "").split(/\s+/).filter(Boolean));
    const after = new Set(
      (mutation.target.getAttribute("class") || "").split(/\s+/).filter(Boolean)
    );
    const revealToken = /(?:^|[-_])(?:open|opened|expand|expanded|show|shown|visible)(?:$|[-_])/i;
    const concealToken = /(?:^|[-_])(?:close|closed|collapse|collapsed|hide|hidden)(?:$|[-_])/i;
    return (
      Array.from(after).some((token) => !before.has(token) && revealToken.test(token)) ||
      Array.from(before).some((token) => !after.has(token) && concealToken.test(token))
    );
  }

  function scheduleGlobalRevealScan() {
    if (globalRevealTimer) return;
    globalRevealTimer = setTimeout(() => {
      globalRevealTimer = null;
      if (translationState !== "idle" && document.body) {
        scheduleDynamicFlush([document.body]);
      }
    }, 500);
  }

  function startDynamicObserver() {
    if (dynamicObserver) return;
    const roots = getSearchRoots();
    dynamicObserver = new MutationObserver((mutations) => {
      if (translationState === "idle") return;
      const added = [];
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const markedSource = closestComposed(
            mutation.target,
            `[${SOURCE_ATTRIBUTE}]`
          );
          // 已标记 source 的内容变化由 renderObserver 负责版本切换，
          // dynamicObserver 只收集尚未成为 source 的新内容。
          if (markedSource) continue;
          // 新增节点（动态加载内容）
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              added.push(node);
            } else if (
              node.nodeType === Node.TEXT_NODE &&
              isUsefulText(normalizeText(node.nodeValue || "")) &&
              node.parentElement
            ) {
              added.push(node.parentElement);
            }
          }
        } else if (mutation.type === "characterData") {
          const parent = mutation.target.parentElement;
          if (
            parent &&
            !closestComposed(parent, `[${SOURCE_ATTRIBUTE}]`) &&
            !closestComposed(parent, `[${TARGET_ATTRIBUTE}]`) &&
            isUsefulText(normalizeText(mutation.target.nodeValue || ""))
          ) {
            added.push(parent);
          }
        } else if (mutation.type === "attributes") {
          // 只处理“从隐藏变为可见”。YouTube/Reddit 会持续修改 transform、
          // opacity、尺寸等 inline style；把所有 style 变化都当新内容会造成
          // 同一虚拟 feed 被无限重扫。
          const target = mutation.target;
          if (
            target.nodeType === Node.ELEMENT_NODE &&
            target !== document.documentElement &&
            target !== document.body &&
            attributeMutationRevealedContent(mutation) &&
            !closestComposed(target, `[${SOURCE_ATTRIBUTE}]`) &&
            !closestComposed(target, `[${TARGET_ATTRIBUTE}]`)
          ) {
            added.push(target);
          }
        }
      }
      if (added.length > 0) scheduleDynamicFlush(added);
    });
    observeDynamicRoots(roots);

    // 某些站点（例如侧边栏应用）只修改 html/body class 来显露既有内容。
    // 单独观察页面壳，且只接受有明确“展开/显示”语义的 class token，避免
    // YouTube 高频 active/hover/playing 状态触发全页扫描。
    globalShellObserver = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.attributeName === "class" &&
            shellClassMutationMayReveal(mutation)
        )
      ) {
        scheduleGlobalRevealScan();
      }
    });
    globalShellObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["class"]
    });
    if (document.body) {
      globalShellObserver.observe(document.body, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["class"]
      });
    }
  }

  function observeDynamicRoots(roots = getSearchRoots()) {
    if (!dynamicObserver) return;
    for (const root of roots) {
      const target = root === document.body ? document.documentElement : root;
      if (observedDynamicRoots.has(target)) continue;
      observedDynamicRoots.add(target);
      dynamicObserver.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        // class 在 YouTube 上会因 hover、播放状态和虚拟列表回收而高频
        // 改动；真正的新内容由 childList 捕获，显隐则由以下属性覆盖。
        attributeFilter: ["style", "hidden", "aria-hidden"]
      });
    }
  }

  function stopDynamicObserver() {
    if (dynamicObserver) {
      dynamicObserver.disconnect();
      dynamicObserver = null;
    }
    observedDynamicRoots = new WeakSet();
    if (globalShellObserver) {
      globalShellObserver.disconnect();
      globalShellObserver = null;
    }
    if (globalRevealTimer) {
      clearTimeout(globalRevealTimer);
      globalRevealTimer = null;
    }
    if (dynamicFlushTimer) {
      clearTimeout(dynamicFlushTimer);
      dynamicFlushTimer = null;
    }
    dynamicFlushPending = [];
    dynamicFlushPendingSet.clear();
    pendingRetranslations.clear();
    dynamicFlushRunning = false;
  }

  function normalizeDetectedLanguage(language = "") {
    if (/^zh-(?:TW|HK|Hant)/i.test(language)) return "zh-Hant";
    const baseLanguage = language.split("-")[0].toLowerCase();
    return baseLanguage === "he" ? "iw" : baseLanguage;
  }

  async function detectAutoSourceLanguage(pageData, targetLanguage) {
    const segments = (pageData.segments || [])
      .slice()
      .sort((left, right) => right.text.length - left.text.length)
      .slice(0, 16);
    const scores = new Map();

    await Promise.all(
      segments.map(async (segment) => {
        try {
          const result = await chrome.i18n.detectLanguage(
            segment.text.slice(0, 4000)
          );
          const language = normalizeDetectedLanguage(
            result.languages?.[0]?.language || ""
          );
          if (language && language !== "und" && language !== targetLanguage) {
            scores.set(language, (scores.get(language) || 0) + segment.text.length);
          }
        } catch {
          // 稍后使用页面声明的语言作为回退。
        }
      })
    );

    const detected = Array.from(scores.entries()).sort(
      (left, right) => right[1] - left[1]
    )[0]?.[0];
    if (detected) return detected;

    const declared = normalizeDetectedLanguage(pageData.pageLanguage || "");
    return declared && declared !== targetLanguage ? declared : "";
  }

  async function autoTranslateIfEnabled() {
    if (autoTranslationPromise) return autoTranslationPromise;

    autoTranslationPromise = (async () => {
      await cacheHydrationPromise?.catch(() => false);
      const pageUrl = location.href;
      const hostname = location.hostname;
      const stored = await chrome.storage.local.get([
        "alwaysTranslateSites",
        "sourceLanguage",
        "targetLanguage",
        "cacheEnabled",
        "displayMode"
      ]);
      if (!(stored.alwaysTranslateSites || []).includes(hostname)) return;
      if (
        location.href !== pageUrl ||
        translationState === "creating" ||
        translationState === "translating" ||
        (translatedPageUrl === pageUrl &&
          queryAllRoots(`[${SOURCE_ATTRIBUTE}]`).some((source) =>
            translatedTextBySource.has(source)
          ))
      ) {
        return;
      }

      if (DISPLAY_MODES.has(stored.displayMode)) {
        setDisplayMode(stored.displayMode);
      }
      const targetLanguage = stored.targetLanguage || "zh";
      const pageData = await collectSegments();
      if (location.href !== pageUrl || !pageData.segments?.length) return;

      const configuredSource = stored.sourceLanguage || "auto";
      const sourceLanguage =
        configuredSource === "auto"
          ? await detectAutoSourceLanguage(pageData, targetLanguage)
          : configuredSource;
      if (
        !sourceLanguage ||
        sourceLanguage === targetLanguage ||
        location.href !== pageUrl
      ) {
        return;
      }

      await runTranslation(
        sourceLanguage,
        targetLanguage,
        "viewport",
        stored.cacheEnabled !== false
      );
    })().finally(() => {
      autoTranslationPromise = null;
    });

    return autoTranslationPromise;
  }

  function scheduleAutoTranslation(delay = 800) {
    if (autoTranslationTimer) clearTimeout(autoTranslationTimer);
    autoTranslationTimer = setTimeout(() => {
      autoTranslationTimer = null;
      autoTranslateIfEnabled();
    }, delay);
  }

  function handlePossibleRouteChange() {
    if (location.href === observedPageUrl) return;
    observedPageUrl = location.href;
    if (autoTranslationTimer) clearTimeout(autoTranslationTimer);
    autoTranslationTimer = null;
    restoreOriginal();
    reportToPopup({ type: "page-route-changed" });
    reportToPopup({ type: "translation-idle" });
    startCachedPageHydration(location.href);
    scheduleAutoTranslation();
  }

  // YouTube 等 SPA 不会在站内导航时重新加载 content script。
  // 自定义事件负责快速响应，轻量轮询覆盖其他 SPA 路由器。
  window.addEventListener("popstate", handlePossibleRouteChange);
  window.addEventListener("hashchange", handlePossibleRouteChange);
  document.addEventListener("yt-navigate-finish", handlePossibleRouteChange);
  setInterval(handlePossibleRouteChange, 300);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // 弹窗可能在 300ms 轮询发现 SPA 导航前打开；每次请求前
    // 先同步路由，避免 collect-segments 读到旧页面的译文节点。
    handlePossibleRouteChange();

    if (message.type === "collect-segments") {
      collectSegments()
        .then(sendResponse)
        .catch((error) =>
          sendResponse({
            pageLanguage: document.documentElement.lang || "",
            title: document.title,
            segments: [],
            error: error?.message || "页面扫描失败"
          })
        );
      return true;
    }

    if (message.type === "insert-translation") {
      insertTranslation(message.id, message.text, message.richNodeTexts);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "restore-original") {
      restoreOriginal();
      // 通知 background 清除 badge/icon
      reportToPopup({ type: "translation-idle" });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "set-display-mode") {
      setDisplayMode(message.mode);
      sendResponse({ ok: true, mode: currentDisplayMode });
      return;
    }

    if (message.type === "start-translation") {
      // 立即响应，翻译异步进行，进度通过 translation-progress 消息推送。
      // 弹窗关闭不影响 content.js 继续翻译。
      sendResponse({ ok: true, started: true });
      Promise.resolve(cacheHydrationPromise)
        .catch(() => false)
        .then(() =>
          runTranslation(
            message.sourceLanguage,
            message.targetLanguage,
            message.scope,
            message.cacheEnabled
          )
        );
      return;
    }

    if (message.type === "auto-translate-if-enabled") {
      sendResponse({ ok: true });
      scheduleAutoTranslation(150);
      return;
    }

    if (message.type === "clear-translation-cache") {
      translationCache = {};
      translationPageCache = {};
      cacheDirty = false;
      pageCacheDirty = false;
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "cancel-translation") {
      abortRequested = true;
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "retry-failed") {
      sendResponse({ ok: true, started: true });
      retryFailed();
      return;
    }

    if (message.type === "get-page-state") {
      Promise.resolve(cacheHydrationPromise)
        .catch(() => false)
        .then(() => {
          const translated =
            translatedPageUrl === location.href &&
            queryAllRoots(`[${SOURCE_ATTRIBUTE}]`).some((source) =>
              translatedTextBySource.has(source)
            );
          sendResponse({
            translated,
            pageUrl: location.href,
            displayMode: currentDisplayMode,
            translating:
              translationState === "translating" ||
              translationState === "creating",
            state: translationState,
            failed: failedSegments.size,
            sourceLang: translatorSourceLang,
            targetLang: translatorTargetLang,
            progress: currentProgress
          });
        });
      return true;
    }
  });

  startCachedPageHydration();
  scheduleAutoTranslation(700);
})();
