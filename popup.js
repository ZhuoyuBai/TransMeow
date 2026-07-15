const translateButton = document.querySelector("#translate-button");
const displayModeButton = document.querySelector("#display-mode-button");
const displayModeLabel = document.querySelector("#display-mode-label");
const targetLanguageSelect = document.querySelector("#target-language");
const sourceLanguageSelect = document.querySelector("#source-language");
const statusText = document.querySelector("#status-text");
const statusDot = document.querySelector("#status-dot");
const statusCard = document.querySelector("#status-card");
const openSettingsButton = document.querySelector("#open-settings");
const progressArea = document.querySelector("#progress-area");
const progressLabel = document.querySelector("#progress-label");
const progressPercent = document.querySelector("#progress-percent");
const translationProgress = document.querySelector("#translation-progress");
const alwaysTranslateSiteInput = document.querySelector("#always-translate-site");
const quickTranslationInput = document.querySelector("#quick-translation-input");
const quickTranslationCount = document.querySelector("#quick-translation-count");
const quickTranslationResult = document.querySelector("#quick-translation-result");
const quickTranslationLoading = document.querySelector("#quick-translation-loading");
const quickTranslationPackWarning = document.querySelector(
  "#quick-translation-pack-warning"
);
const quickTranslationPackMessage = document.querySelector(
  "#quick-translation-pack-message"
);
const quickTranslationDownload = document.querySelector(
  "#quick-translation-download"
);
const quickTranslationCopy = document.querySelector("#quick-translation-copy");
const customSelects = new Map();
const targetLanguageStatuses = new Map();

let activeTabId;
let activePageUrl = "";
let pageIsTranslated = false;
let isWorking = false;
let isPageUnsupported = false;
let currentSourceLanguage = "";
let currentPageData;
let detectedPageDataRef = null;
let cachedDetectedSegments = null;
let currentDisplayMode = "translation";
let cacheEnabled = true;
let activeHostname = "";
let quickTranslationTimer = null;
let quickTranslationRequestId = 0;
let quickTranslatedText = "";

const DISPLAY_MODES = ["translation", "bilingual"];
const DISPLAY_MODE_ICONS = {
  translation: "A",
  bilingual: "文/A"
};
const i18n = globalThis.LocalTranslatorI18n;
const languageCatalog = globalThis.LocalTranslatorLanguages;
const SUPPORTED_LANGUAGES = languageCatalog.all;
const SUPPORTED_LANGUAGE_CODES = new Set(
  SUPPORTED_LANGUAGES.map(({ code }) => code)
);

function normalizeLanguage(language) {
  return languageCatalog.normalize(language);
}

function getSiteOrigins(hostname) {
  return [`http://${hostname}/*`, `https://${hostname}/*`];
}

function populateLanguageSelectors() {
  for (const { code: language } of SUPPORTED_LANGUAGES) {
    const displayName = getLanguageNameWithNativeName(language);
    const sourceOption = new Option(displayName, language);
    const targetOption = new Option(displayName, language);
    sourceLanguageSelect.add(sourceOption);
    targetLanguageSelect.add(targetOption);
  }
  targetLanguageSelect.value = languageCatalog.getSystemLanguage();
  initializeCustomSelects();
}

function closeCustomSelect(root) {
  root.classList.remove("is-open");
  root.querySelector(".custom-select-trigger").setAttribute("aria-expanded", "false");
  root.querySelector(".custom-select-menu").hidden = true;
}

function closeAllCustomSelects(except = null) {
  for (const root of customSelects.values()) {
    if (root !== except) closeCustomSelect(root);
  }
}

function syncCustomSelect(select) {
  const root = customSelects.get(select.id);
  if (!root) return;
  const selected = select.selectedOptions[0];
  root.querySelector(".custom-select-value").textContent = selected?.textContent || "";
  const menu = root.querySelector(".custom-select-menu");
  menu.replaceChildren();

  const options = Array.from(select.options);
  if (select.id === "target-language") {
    options.sort((left, right) => {
      const leftSelected = left.value === select.value;
      const rightSelected = right.value === select.value;
      if (leftSelected !== rightSelected) {
        return Number(rightSelected) - Number(leftSelected);
      }
      const leftInstalled = targetLanguageStatuses.get(left.value)?.state === "available";
      const rightInstalled = targetLanguageStatuses.get(right.value)?.state === "available";
      return Number(rightInstalled) - Number(leftInstalled);
    });
  }

  for (const option of options) {
    if (select.id === "target-language") {
      menu.append(createTargetLanguageOption(select, option, root));
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-option";
    button.dataset.value = option.value;
    button.textContent = option.textContent;
    button.disabled = option.disabled;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(option.selected));
    button.classList.toggle("is-selected", option.selected);
    button.addEventListener("click", () => {
      if (option.disabled) return;
      select.value = option.value;
      closeCustomSelect(root);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    menu.append(button);
  }
}

function createTargetLanguageOption(select, option, root) {
  const row = document.createElement("div");
  row.className = "custom-option target-option";
  row.setAttribute("role", "option");
  row.setAttribute("aria-selected", String(option.selected));
  row.classList.toggle("is-selected", option.selected);

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "target-option-name";
  selectButton.textContent = option.textContent;
  selectButton.addEventListener("click", () => {
    select.value = option.value;
    closeCustomSelect(root);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const status = targetLanguageStatuses.get(option.value) || {
    state: "checking",
    progress: 0
  };
  const statusButton = document.createElement("button");
  statusButton.type = "button";
  statusButton.className = `pack-status is-${status.state}`;
  statusButton.disabled = !["downloadable", "error"].includes(status.state);
  statusButton.textContent =
    status.state === "available"
      ? i18n.t("downloaded")
      : status.state === "downloadable"
        ? i18n.t("notDownloaded")
        : status.state === "downloading"
          ? `${status.progress || 0}%`
          : status.state === "error"
            ? i18n.t("retry")
            : status.state === "unavailable"
              ? i18n.t("unavailable")
              : i18n.t("checking");
  if (["downloadable", "error"].includes(status.state)) {
    statusButton.title = i18n.t("clickDownload");
    statusButton.addEventListener("click", (event) => {
      event.stopPropagation();
      downloadTargetLanguagePack(option.value);
    });
  }

  row.append(selectButton, statusButton);
  if (status.state === "downloading") {
    const progress = document.createElement("span");
    progress.className = "pack-download-progress";
    progress.style.setProperty("--progress", `${status.progress || 0}%`);
    row.append(progress);
  }
  return row;
}

function getLanguagePackOptions(targetLanguage) {
  return {
    sourceLanguage: targetLanguage === "en" ? "zh" : "en",
    targetLanguage
  };
}

async function refreshTargetLanguageStatuses() {
  if (!("Translator" in self)) {
    for (const option of targetLanguageSelect.options) {
      targetLanguageStatuses.set(option.value, { state: "unavailable" });
    }
    syncCustomSelect(targetLanguageSelect);
    return;
  }

  await Promise.all(
    Array.from(targetLanguageSelect.options, async (option) => {
      try {
        const state = await Translator.availability(
          getLanguagePackOptions(option.value)
        );
        targetLanguageStatuses.set(option.value, { state });
      } catch {
        targetLanguageStatuses.set(option.value, { state: "error" });
      }
    })
  );
  syncCustomSelect(targetLanguageSelect);
}

async function downloadTargetLanguagePack(language) {
  if (!("Translator" in self)) return;
  targetLanguageStatuses.set(language, { state: "downloading", progress: 0 });
  syncCustomSelect(targetLanguageSelect);
  try {
    const translator = await Translator.create({
      ...getLanguagePackOptions(language),
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          targetLanguageStatuses.set(language, {
            state: "downloading",
            progress: Math.round(event.loaded * 100)
          });
          syncCustomSelect(targetLanguageSelect);
        });
      }
    });
    translator.destroy();
    targetLanguageStatuses.set(language, { state: "available", progress: 100 });
  } catch {
    targetLanguageStatuses.set(language, { state: "error" });
  }
  syncCustomSelect(targetLanguageSelect);
}

function initializeCustomSelects() {
  for (const root of document.querySelectorAll(".custom-select")) {
    const select = document.querySelector(`#${root.dataset.selectId}`);
    const trigger = root.querySelector(".custom-select-trigger");
    const menu = root.querySelector(".custom-select-menu");
    customSelects.set(select.id, root);
    trigger.addEventListener("click", () => {
      const willOpen = menu.hidden;
      closeAllCustomSelects(root);
      root.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      menu.hidden = !willOpen;
      if (willOpen) {
        menu.querySelector(".is-selected")?.focus();
        if (select.id === "target-language" && targetLanguageStatuses.size === 0) {
          refreshTargetLanguageStatuses();
        }
      }
    });
    syncCustomSelect(select);
  }
}

function setStatus(message, state = "ready") {
  statusText.textContent = message;
  statusCard.hidden = !message || state === "busy";
  statusDot.classList.toggle("is-busy", state === "busy");
  statusDot.classList.toggle("is-error", state === "error");
}

function setProgress(percent, label = i18n.t("translating"), visible = true) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  progressArea.hidden = !visible;
  progressLabel.textContent = label;
  progressPercent.textContent = `${safePercent}%`;
  translationProgress.value = safePercent;
}

function setTranslatedState(translated) {
  pageIsTranslated = translated;
  translateButton.textContent = translated
    ? i18n.t("showOriginal")
    : i18n.t("translate");
  translateButton.classList.toggle("is-restore", translated);
}

function updateDisplayModeButton() {
  const label = i18n.t(
    currentDisplayMode === "translation" ? "onlyTranslation" : "bilingual"
  );
  displayModeLabel.textContent = label;
  const nextLabel = i18n.t(
    currentDisplayMode === "translation" ? "bilingual" : "onlyTranslation"
  );
  displayModeButton.setAttribute("aria-label", `${label} → ${nextLabel}`);
  displayModeButton.dataset.tooltip = `${label}\n${nextLabel}`;
  displayModeButton.querySelector(".display-mode-icon").textContent =
    DISPLAY_MODE_ICONS[currentDisplayMode];
}

async function applyDisplayMode(mode, announce = true) {
  if (!DISPLAY_MODES.includes(mode)) return;

  if (activeTabId) {
    const response = await sendToPage({ type: "set-display-mode", mode });
    if (!response?.ok || response.mode !== mode) {
      throw new Error(i18n.t("pageModeUnconfirmed"));
    }
  }

  currentDisplayMode = mode;
  updateDisplayModeButton();
  await chrome.storage.local.set({ displayMode: mode });
  if (announce) setStatus("");
}

async function cycleDisplayMode() {
  const currentIndex = DISPLAY_MODES.indexOf(currentDisplayMode);
  const nextMode = DISPLAY_MODES[(currentIndex + 1) % DISPLAY_MODES.length];

  try {
    await applyDisplayMode(nextMode);
    if (!pageIsTranslated && !isWorking) {
      await handlePrimaryAction();
    }
  } catch {
    setStatus(i18n.t("modeSwitchFailed"), "error");
  }
}

function getLanguageName(language) {
  return language
    ? languageCatalog.getDisplayName(language, i18n.locale)
    : i18n.t("unknownLanguage");
}

function getLanguageNameWithNativeName(language) {
  const name = getLanguageName(language);
  const nativeName = languageCatalog.nativeNames[language];
  return nativeName && nativeName !== name ? `${name} (${nativeName})` : name;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(i18n.t("pageUnavailable"));
  if (!/^https?:/.test(tab.url || "")) {
    throw new Error(i18n.t("pagePermissionDenied"));
  }
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["languages.js", "content.js"]
  });
}

async function sendToPage(message) {
  return chrome.tabs.sendMessage(activeTabId, message);
}

async function detectSegmentLanguage(text, fallbackLanguage = "") {
  const normalizedText = text.trim();
  if (!normalizedText) return fallbackLanguage;

  try {
    const result = await chrome.i18n.detectLanguage(normalizedText.slice(0, 4000));
    const detected = normalizeLanguage(result.languages?.[0]?.language);
    if (detected && detected !== "und") return detected;
  } catch {
    // Fall through to the lightweight script heuristic below.
  }

  const latinLetterCount = (normalizedText.match(/[A-Za-z]/g) || []).length;
  const cjkCount = (normalizedText.match(/[\u3400-\u9fff]/g) || []).length;
  if (latinLetterCount >= 4 && latinLetterCount > cjkCount * 2) return "en";
  return fallbackLanguage;
}

function setQuickTranslationState(state, message = "") {
  quickTranslationLoading.hidden = state !== "loading";
  quickTranslationPackWarning.hidden = state !== "pack-required";
  quickTranslationCopy.hidden = state !== "translated";
  quickTranslationCopy.classList.remove("is-copied");

  if (state === "translated") {
    quickTranslatedText = message;
    quickTranslationResult.textContent = message;
    return;
  }

  quickTranslatedText = "";
  quickTranslationResult.textContent =
    state === "error" ? message : "";
  if (state === "pack-required") {
    quickTranslationPackMessage.textContent = message;
  }
}

async function resolveQuickSourceLanguage(text, targetLanguage) {
  if (sourceLanguageSelect.value !== "auto") {
    return sourceLanguageSelect.value;
  }

  const detected = normalizeLanguage(
    await detectSegmentLanguage(text)
  );
  if (SUPPORTED_LANGUAGE_CODES.has(detected)) return detected;
  return targetLanguage === "en" ? "zh" : "en";
}

async function translateQuickText(text, requestId) {
  const targetLanguage = targetLanguageSelect.value;

  try {
    if (!("Translator" in self)) {
      throw new Error(i18n.t("translationFailed"));
    }

    const sourceLanguage = await resolveQuickSourceLanguage(
      text,
      targetLanguage
    );
    if (requestId !== quickTranslationRequestId) return;
    if (!sourceLanguage || sourceLanguage === targetLanguage) {
      throw new Error(i18n.t("sameLanguage"));
    }

    const options = { sourceLanguage, targetLanguage };
    const availability = await Translator.availability(options);
    if (requestId !== quickTranslationRequestId) return;
    if (availability !== "available") {
      setQuickTranslationState(
        "pack-required",
        i18n.t("downloadLanguagePackFirst", {
          language: getLanguageName(targetLanguage)
        })
      );
      return;
    }

    const translator = await Translator.create(options);
    try {
      const translatedText = await translator.translate(text);
      if (requestId !== quickTranslationRequestId) return;
      setQuickTranslationState("translated", translatedText);
    } finally {
      translator.destroy();
    }
  } catch (error) {
    if (requestId !== quickTranslationRequestId) return;
    setQuickTranslationState(
      "error",
      error?.message || i18n.t("translationFailed")
    );
  }
}

function scheduleQuickTranslation(delay = 280) {
  clearTimeout(quickTranslationTimer);
  quickTranslationRequestId += 1;
  const requestId = quickTranslationRequestId;
  const text = quickTranslationInput.value.trim();
  quickTranslationCount.textContent = `${quickTranslationInput.value.length} / 100`;

  if (!text) {
    setQuickTranslationState("idle");
    return;
  }

  setQuickTranslationState("loading");
  quickTranslationTimer = setTimeout(
    () => translateQuickText(text, requestId),
    delay
  );
}

async function copyQuickTranslation() {
  if (!quickTranslatedText) return;

  try {
    await navigator.clipboard.writeText(quickTranslatedText);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = quickTranslatedText;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }

  quickTranslationCopy.classList.add("is-copied");
  setTimeout(() => quickTranslationCopy.classList.remove("is-copied"), 1200);
}

async function detectPageSegments(pageData) {
  if (pageData === detectedPageDataRef && cachedDetectedSegments) {
    return cachedDetectedSegments;
  }
  const declaredLanguage = normalizeLanguage(pageData.pageLanguage);
  const segments = pageData.segments || [];
  // 自动检测只需要判断主导语言，不需要对 Reddit/YouTube 的每一张卡片
  // 都调用 chrome.i18n.detectLanguage。长段优先并混入均匀抽样，兼顾正文
  // 权重和页面不同区域，最多检测 36 段、约 24k 字符。
  const selectedIndexes = new Set();
  const rankedIndexes = segments
    .map((segment, index) => ({ index, length: segment.text.length }))
    .sort((left, right) => right.length - left.length);
  rankedIndexes.slice(0, 18).forEach(({ index }) => selectedIndexes.add(index));
  const distributedCount = Math.min(18, segments.length);
  for (let sample = 0; sample < distributedCount; sample += 1) {
    selectedIndexes.add(
      Math.min(
        segments.length - 1,
        Math.floor(((sample + 0.5) * segments.length) / distributedCount)
      )
    );
  }
  const selectedSegments = Array.from(selectedIndexes)
    .sort((left, right) => left - right)
    .reduce(
      (result, index) => {
        const usedCharacters = result.reduce(
          (total, segment) => total + segment.text.length,
          0
        );
        if (usedCharacters >= 24000 && result.length > 0) return result;
        result.push(segments[index]);
        return result;
      },
      []
    );
  const detected = new Array(selectedSegments.length);
  let nextIndex = 0;

  // chrome.i18n.detectLanguage 批量并发数过高时会抢占页面与扩展进程。
  // 固定小并发池既保留逐段检测，也避免 YouTube 长列表触发卡死。
  const workerCount = Math.min(4, selectedSegments.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < selectedSegments.length) {
        const index = nextIndex;
        nextIndex += 1;
        const segment = selectedSegments[index];
        detected[index] = {
          ...segment,
          sourceLanguage: await detectSegmentLanguage(
            segment.text,
            declaredLanguage
          )
        };
      }
    })
  );
  detectedPageDataRef = pageData;
  cachedDetectedSegments = detected;
  return detected;
}

function updateAutoDetectionLabel(language = "") {
  const autoOption = sourceLanguageSelect.querySelector('option[value="auto"]');
  autoOption.textContent = language
    ? i18n.t("autoDetected", {
        language: getLanguageNameWithNativeName(language)
      })
    : i18n.t("autoDetect");
  syncCustomSelect(sourceLanguageSelect);
}

function chooseDominantSourceLanguage(detectedSegments, targetLanguage) {
  const scores = new Map();

  for (const segment of detectedSegments) {
    const language = segment.sourceLanguage;
    if (
      !language ||
      language === targetLanguage ||
      !SUPPORTED_LANGUAGE_CODES.has(language)
    ) {
      continue;
    }

    scores.set(language, (scores.get(language) || 0) + segment.text.length);
  }

  return Array.from(scores.entries()).sort(
    (left, right) => right[1] - left[1]
  )[0]?.[0] || "";
}

function resolveSourceLanguage(detectedSegments, targetLanguage) {
  if (sourceLanguageSelect.value !== "auto") {
    updateAutoDetectionLabel();
    return sourceLanguageSelect.value;
  }

  const detectedLanguage = chooseDominantSourceLanguage(
    detectedSegments,
    targetLanguage
  );
  updateAutoDetectionLabel(detectedLanguage);
  return detectedLanguage;
}

function syncLanguageOptionStates() {
  for (const option of sourceLanguageSelect.options) {
    option.disabled = false;
  }

  for (const option of targetLanguageSelect.options) {
    option.disabled = false;
  }
  syncCustomSelect(sourceLanguageSelect);
  syncCustomSelect(targetLanguageSelect);
}

async function startTranslation() {
  // 预检测源语言，然后发 start-translation 触发 content.js 后台翻译。
  // 翻译在 content.js 持有 translator 实例进行，弹窗关闭不影响。
  const targetLanguage = targetLanguageSelect.value;
  if (!currentPageData) {
    currentPageData = await sendToPage({ type: "collect-segments" });
  }
  if (!currentPageData?.segments?.length) {
    throw new Error(i18n.t("noContent"));
  }

  const detectedSegments = await detectPageSegments(currentPageData);
  const sourceLanguage = resolveSourceLanguage(detectedSegments, targetLanguage);

  if (!sourceLanguage) {
    throw new Error(i18n.t("noDifferentLanguage"));
  }
  if (sourceLanguage === targetLanguage) {
    throw new Error(i18n.t("sameLanguage"));
  }

  currentSourceLanguage = sourceLanguage;
  await sendToPage({
    type: "start-translation",
    sourceLanguage,
    targetLanguage,
    scope: "viewport",
    cacheEnabled
  });
  setProgress(0, i18n.t("translating"));
  setStatus(i18n.t("translatingClose"), "busy");
}

async function restorePage() {
  await sendToPage({ type: "restore-original" });
  setTranslatedState(false);
  setProgress(0, i18n.t("translating"), false);
  setStatus("");
}

async function handlePrimaryAction() {
  if (isWorking || isPageUnsupported) return;
  isWorking = true;
  translateButton.disabled = true;
  if (!pageIsTranslated) {
    translateButton.textContent = i18n.t("translating");
  }

  try {
    if (pageIsTranslated) {
      await restorePage();
      isWorking = false;
      translateButton.disabled = false;
    } else {
      await startTranslation();
      // 翻译在 content.js 后台异步进行，isWorking 在收到
      // translation-complete/error 消息时重置（见 onMessage 监听）。
    }
  } catch (error) {
    setStatus(error?.message || i18n.t("translationFailed"), "error");
    isWorking = false;
    translateButton.disabled = false;
    setTranslatedState(pageIsTranslated);
  }
}

async function initialize() {
  try {
    const stored = await chrome.storage.local.get([
      "sourceLanguage",
      "targetLanguage",
      "displayMode",
      "cacheEnabled",
      "alwaysTranslateSites"
    ]);
    if (SUPPORTED_LANGUAGE_CODES.has(stored.targetLanguage)) {
      targetLanguageSelect.value = stored.targetLanguage;
    }
    if (stored.sourceLanguage) {
      sourceLanguageSelect.value = stored.sourceLanguage;
    }
    if (sourceLanguageSelect.value === targetLanguageSelect.value) {
      sourceLanguageSelect.value = "auto";
    }
    if (DISPLAY_MODES.includes(stored.displayMode)) {
      currentDisplayMode = stored.displayMode;
    }
    cacheEnabled = stored.cacheEnabled !== false;
    updateDisplayModeButton();
    syncLanguageOptionStates();

    const tab = await getActiveTab();
    activeTabId = tab.id;
    activePageUrl = tab.url;
    activeHostname = new URL(tab.url).hostname;
    alwaysTranslateSiteInput.disabled = false;
    alwaysTranslateSiteInput.checked = (stored.alwaysTranslateSites || []).includes(
      activeHostname
    );
    await ensureContentScript(activeTabId);
    await sendToPage({ type: "set-display-mode", mode: currentDisplayMode });

    const state = await sendToPage({ type: "get-page-state" });
    setTranslatedState(Boolean(state?.translated));
    chrome.runtime.sendMessage({
      type: "page-state-sync",
      tabId: activeTabId,
      translated: Boolean(state?.translated),
      translating: Boolean(state?.translating),
      failed: state?.failed || 0
    }).catch(() => {});

    if (state?.translating) {
      // content.js 正在后台翻译，同步工作状态，跳过预检测避免干扰。
      isWorking = true;
      translateButton.disabled = true;
      translateButton.textContent = i18n.t("translating");
      setStatus(i18n.t("translatingProgress"), "busy");
      setProgress(state.progress || 0, i18n.t("translating"));
    } else if (state?.translated) {
      // 已翻译页面不能再次 collect：重新扫描会覆盖现有 segment id，导致
      // translatedTextBySource 映射与仅译文/双语切换失联。
      currentSourceLanguage = state.sourceLang || "";
      if (sourceLanguageSelect.value === "auto") {
        updateAutoDetectionLabel(currentSourceLanguage);
      }
      setProgress(100, i18n.t("translationComplete"));
      setStatus("");
      if (state?.failed > 0) {
        setStatus(i18n.t("failedSegments", { count: state.failed }), "error");
      }
    } else {
      setStatus("");
      currentPageData = await sendToPage({ type: "collect-segments" });
      const detectedSegments = await detectPageSegments(currentPageData);
      currentSourceLanguage = resolveSourceLanguage(
        detectedSegments,
        targetLanguageSelect.value
      );
    }
  } catch {
    isPageUnsupported = true;
    translateButton.disabled = false;
    setStatus("");
  }
}

targetLanguageSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ targetLanguage: targetLanguageSelect.value });
  syncLanguageOptionStates();
  if (quickTranslationInput.value.trim()) scheduleQuickTranslation(0);
  if (currentPageData) {
    const detectedSegments = await detectPageSegments(currentPageData);
    currentSourceLanguage = resolveSourceLanguage(
      detectedSegments,
      targetLanguageSelect.value
    );
  }
});

sourceLanguageSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ sourceLanguage: sourceLanguageSelect.value });
  syncLanguageOptionStates();
  if (quickTranslationInput.value.trim()) scheduleQuickTranslation(0);
  if (currentPageData) {
    const detectedSegments = await detectPageSegments(currentPageData);
    currentSourceLanguage = resolveSourceLanguage(
      detectedSegments,
      targetLanguageSelect.value
    );
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".custom-select")) closeAllCustomSelects();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllCustomSelects();
});

// 监听 content.js 推送的翻译进度/完成/错误消息。
// popup 关闭时这些消息由 background service worker 接收（更新 badge/icon）。
chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab?.id && activeTabId && sender.tab.id !== activeTabId) return;
  if (
    message.type !== "page-route-changed" &&
    message.pageUrl &&
    activePageUrl &&
    message.pageUrl !== activePageUrl
  ) {
    return;
  }

  if (message.type === "page-route-changed") {
    activePageUrl = message.pageUrl || activePageUrl;
    currentPageData = null;
    detectedPageDataRef = null;
    cachedDetectedSegments = null;
    isWorking = false;
    translateButton.disabled = false;
    setTranslatedState(false);
    setProgress(0, i18n.t("translating"), false);
    setStatus("");
    return;
  }

  if (message.type === "translation-progress") {
    if (message.phase === "download") {
      // 语言包准备属于翻译流程的一部分，不单独暴露“下载 100%”。
      // 将准备阶段压缩在总进度的前 10%，随后进入正文翻译进度。
      const preparationProgress = Math.min(10, (message.progress || 0) / 10);
      setStatus("", "busy");
      setProgress(preparationProgress, i18n.t("translating"));
    } else if (message.phase === "translate") {
      const percent = message.total
        ? 10 + (message.done / message.total) * 90
        : 10;
      setStatus(i18n.t("translatingProgress"), "busy");
      setProgress(percent, i18n.t("translating"));
    } else if (message.phase === "retry") {
      const percent = message.total ? (message.done / message.total) * 100 : 0;
      setStatus(i18n.t("retrying"), "busy");
      setProgress(percent, i18n.t("retrying"));
    } else if (message.phase === "incremental") {
      setStatus("");
    }
  } else if (message.type === "translation-complete") {
    isWorking = false;
    translateButton.disabled = false;
    if (message.total === 0 || message.translated === 0) {
      setTranslatedState(false);
      setProgress(0, i18n.t("translating"), false);
      const sourceName = getLanguageName(currentSourceLanguage);
      setStatus(
        currentSourceLanguage
          ? i18n.t("noTranslatableSource", { language: sourceName })
          : i18n.t("noContent"),
        "error"
      );
      return;
    }
    setTranslatedState(true);
    setProgress(100, i18n.t("translationComplete"));
    const failed = message.failed || 0;
    if (message.aborted) {
      setStatus(
        i18n.t("abortedProgress", {
          done: message.total - failed,
          total: message.total
        }),
        "error"
      );
    } else if (failed > 0) {
      setStatus(
        i18n.t("failedSegments", { count: failed }),
        "error"
      );
    } else {
      setStatus("");
    }
  } else if (message.type === "translation-error") {
    isWorking = false;
    translateButton.disabled = false;
    setTranslatedState(pageIsTranslated);
    setStatus(message.message || i18n.t("translationFailed"), "error");
    setProgress(0, i18n.t("translationFailed"), false);
  }
});

alwaysTranslateSiteInput.addEventListener("change", async () => {
  if (!activeHostname) return;

  if (alwaysTranslateSiteInput.checked) {
    // permissions.request 必须直接发生在用户手势中；先发起请求，再等待结果。
    const permissionRequest = chrome.permissions.request({
      origins: getSiteOrigins(activeHostname)
    });
    alwaysTranslateSiteInput.disabled = true;

    try {
      const granted = await permissionRequest;
      if (!granted) {
        alwaysTranslateSiteInput.checked = false;
        setStatus(i18n.t("sitePermissionDenied"), "error");
        return;
      }

      const stored = await chrome.storage.local.get("alwaysTranslateSites");
      const sites = new Set(stored.alwaysTranslateSites || []);
      sites.add(activeHostname);
      await chrome.storage.local.set({ alwaysTranslateSites: Array.from(sites) });
      setStatus(i18n.t("siteEnabled"));
      if (!pageIsTranslated && !isWorking) await handlePrimaryAction();
    } catch {
      alwaysTranslateSiteInput.checked = false;
      setStatus(i18n.t("sitePermissionDenied"), "error");
    } finally {
      alwaysTranslateSiteInput.disabled = false;
    }
    return;
  }

  const stored = await chrome.storage.local.get("alwaysTranslateSites");
  const sites = new Set(stored.alwaysTranslateSites || []);
  sites.delete(activeHostname);
  await chrome.storage.local.set({ alwaysTranslateSites: Array.from(sites) });
  await chrome.permissions.remove({
    origins: getSiteOrigins(activeHostname)
  }).catch(() => false);
  setStatus(i18n.t("siteDisabled"));
});

translateButton.addEventListener("click", handlePrimaryAction);
displayModeButton.addEventListener("click", cycleDisplayMode);
quickTranslationInput.addEventListener("input", () => scheduleQuickTranslation());
quickTranslationCopy.addEventListener("click", copyQuickTranslation);
quickTranslationDownload.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
openSettingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
// 通知 service worker popup 已打开（用于判断是否做 icon 动画）。
// popup 关闭时连接自动断开，service worker 的 popupPort 变 null。
chrome.runtime.connect({ name: "popup" });

async function bootstrap() {
  await Promise.all([i18n.ready, globalThis.LocalTranslatorTheme.ready]);
  populateLanguageSelectors();
  await initialize();
}

bootstrap();
