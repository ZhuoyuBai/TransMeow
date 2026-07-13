// background.js — 最小 service worker，仅负责扩展图标状态反馈
// 不碰翻译逻辑（Translator API 在 service worker 不可用）。
// 翻译进度由 content.js 通过 chrome.runtime.sendMessage 广播，
// service worker 与 popup 各自监听、各司其职。

const COLOR_BUSY = "#E8743B"; // 橙：翻译中
const COLOR_DONE = "#3FB950"; // 绿：完成（更亮，对比度更高）
const COLOR_ERROR = "#D1242F"; // 红：出错

let iconsPromise = null;
let pulseToggle = false;

// 用 OffscreenCanvas 从现有 icon 动态生成彩色帧 + 半透明帧，
// 无需额外图片资源。service worker 支持 OffscreenCanvas + createImageBitmap。
async function prepareIcons() {
  const url = chrome.runtime.getURL("icons/icon-32.png");
  const resp = await fetch(url);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 32, 32);
  ctx.drawImage(bitmap, 0, 0, 32, 32);
  const baseIcon = ctx.getImageData(0, 0, 32, 32);

  ctx.clearRect(0, 0, 32, 32);
  ctx.globalAlpha = 0.4;
  ctx.drawImage(bitmap, 0, 0, 32, 32);
  ctx.globalAlpha = 1;
  const dimIcon = ctx.getImageData(0, 0, 32, 32);

  return { baseIcon, dimIcon };
}

function ensureIcons() {
  if (!iconsPromise) iconsPromise = prepareIcons().catch(() => null);
  return iconsPromise;
}

async function setPulseIcon(tabId) {
  const icons = await ensureIcons();
  if (!icons) return;
  pulseToggle = !pulseToggle;
  const imageData = pulseToggle ? icons.dimIcon : icons.baseIcon;
  const opts = { imageData: { 32: imageData } };
  if (tabId !== undefined) opts.tabId = tabId;
  chrome.action.setIcon(opts).catch(() => {});
}

async function setBaseIcon(tabId) {
  const icons = await ensureIcons();
  if (!icons) return;
  const opts = { imageData: { 32: icons.baseIcon } };
  if (tabId !== undefined) opts.tabId = tabId;
  chrome.action.setIcon(opts).catch(() => {});
}

async function setDoneIcon(tabId) {
  const opts = {
    path: {
      16: "icons/icon-done-16.png",
      32: "icons/icon-done-32.png",
    },
  };
  if (tabId !== undefined) opts.tabId = tabId;
  chrome.action.setIcon(opts).catch(() => {});
}

function setBadge(tabId, text, color) {
  const textOpts = { text };
  if (tabId !== undefined) textOpts.tabId = tabId;
  chrome.action.setBadgeText(textOpts).catch(() => {});
  const colorOpts = { color };
  if (tabId !== undefined) colorOpts.tabId = tabId;
  chrome.action.setBadgeBackgroundColor(colorOpts).catch(() => {});
}

function clearBadge(tabId) {
  const opts = { text: "" };
  if (tabId !== undefined) opts.tabId = tabId;
  chrome.action.setBadgeText(opts).catch(() => {});
}

// popup 通过 chrome.runtime.connect 建立长连接，关闭时自动断开。
// service worker 据此判断 popup 是否打开（MV3 中 chrome.extension.getViews 不可用）。
let popupPort = null;
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPort = port;
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  }
});
function isPopupOpen() {
  return popupPort !== null;
}

// 进度消息驱动 icon 动效：每次 progress 切换彩色/半透明帧，节奏跟随翻译。
chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id ?? message.tabId;

  switch (message.type) {
    case "translation-progress": {
      // popup 关闭后不动画（不脉冲、不跳数字），icon 保持静态彩色常态。
      // translation-complete 仍会切换到独立完成态图标（最终状态，非动画）。
      if (!isPopupOpen()) {
        setBaseIcon(tabId);
        return;
      }
      setPulseIcon(tabId);
      if (message.phase === "download") {
        setBadge(tabId, `${message.progress || 0}%`, COLOR_BUSY);
      } else if (message.total) {
        setBadge(tabId, `${message.done}/${message.total}`, COLOR_BUSY);
      }
      return;
    }
    case "translation-complete": {
      const failed = message.failed || 0;
      if (message.total === 0 || message.translated === 0) {
        setBaseIcon(tabId);
        clearBadge(tabId);
      } else if (failed > 0) {
        setBaseIcon(tabId);
        setBadge(tabId, `${failed}!`, COLOR_ERROR);
      } else {
        // 完成状态：切换到独立的“翻译完成”图标，不用 badge 文字。
        setDoneIcon(tabId);
        clearBadge(tabId);
      }
      return;
    }
    case "translation-error": {
      setBaseIcon(tabId);
      setBadge(tabId, "!", COLOR_ERROR);
      return;
    }
    case "page-state-sync": {
      if (message.translating) {
        setBaseIcon(tabId);
        setBadge(tabId, "…", COLOR_BUSY);
      } else if (message.translated && !message.failed) {
        setDoneIcon(tabId);
        clearBadge(tabId);
      } else if (message.failed) {
        setBaseIcon(tabId);
        setBadge(tabId, `${message.failed}!`, COLOR_ERROR);
      } else {
        setBaseIcon(tabId);
        clearBadge(tabId);
      }
      return;
    }
    case "restore-original":
    case "translation-idle": {
      setBaseIcon(tabId);
      clearBadge(tabId);
      return;
    }
  }
});

// service worker 启动时预加载图标帧
ensureIcons();

async function autoTranslateTab(tabId, url) {
  if (!tabId || !/^https?:/.test(url || "")) return;

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  const { alwaysTranslateSites = [] } = await chrome.storage.local.get(
    "alwaysTranslateSites"
  );
  if (!alwaysTranslateSites.includes(hostname)) return;

  try {
    await chrome.tabs.sendMessage(tabId, { type: "auto-translate-if-enabled" });
  } catch {
    // 内容脚本可能尚未完成初始化，页面内的启动调度仍会自动检查站点规则。
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    autoTranslateTab(tabId, tab.url);
  }
});
