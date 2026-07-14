const i18n = globalThis.LocalTranslatorI18n;
const languageCatalog = globalThis.LocalTranslatorLanguages;
const SUPPORTED_LANGUAGE_PACKS = languageCatalog.all.filter(
  ({ code }) => code !== "en"
);

const modelList = document.querySelector("#model-list");
const modelRowTemplate = document.querySelector("#model-row-template");
const searchInput = document.querySelector("#model-search");
const summaryText = document.querySelector("#summary-text");
const rowsByLanguage = new Map();
const installedSummary = document.querySelector("#installed-summary");
const installedCount = document.querySelector("#installed-count");
const downloadableCount = document.querySelector("#downloadable-count");
const modelFilters = Array.from(document.querySelectorAll(".model-filter"));
const showMoreModelsButton = document.querySelector("#show-more-models");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const interfaceLanguageSelect = document.querySelector("#interface-language");
const backToExtensionButton = document.querySelector("#back-to-extension");
const settingsCacheEnabled = document.querySelector("#settings-cache-enabled");
const settingsClearCache = document.querySelector("#settings-clear-cache");
const cacheActionStatus = document.querySelector("#cache-action-status");
const alwaysTranslateSitesList = document.querySelector(
  "#always-translate-sites-list"
);
const alwaysTranslateSitesEmpty = document.querySelector(
  "#always-translate-sites-empty"
);
const theme = globalThis.LocalTranslatorTheme;
const themeOptions = Array.from(document.querySelectorAll(".theme-option"));
const panels = {
  models: document.querySelector("#models-panel"),
  appearance: document.querySelector("#appearance-panel"),
  advanced: document.querySelector("#advanced-panel")
};

let activeModelFilter = "all";
let modelsExpanded = false;
let modelFilterInitialized = false;

function showPanel(panelName) {
  for (const [name, panel] of Object.entries(panels)) {
    panel.hidden = name !== panelName;
  }
  for (const item of navItems) {
    item.classList.toggle("is-active", item.dataset.panel === panelName);
  }
}

function syncThemePicker(selectedTheme) {
  for (const option of themeOptions) {
    const selected = option.dataset.themeValue === selectedTheme;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-checked", String(selected));
  }
}

document.addEventListener("local-translator-theme-change", (event) => {
  syncThemePicker(event.detail.theme);
});

function getLanguageName(language) {
  return languageCatalog.getDisplayName(language, i18n.locale);
}

function createRow(language) {
  const name = getLanguageName(language);
  const nativeName = languageCatalog.nativeNames[language] || name;
  const row = modelRowTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.language = language;
  row.dataset.search =
    `${name} ${nativeName} ${language} en-${language}`.toLowerCase();
  row.querySelector(".language-name").textContent = name;
  row.querySelector(".language-code").textContent = language;
  row.querySelector(".language-native-name").textContent = nativeName;
  row.querySelector(".row-action").addEventListener("click", () =>
    handleRowAction(language)
  );
  modelList.append(row);
  rowsByLanguage.set(language, row);
}

function setRowState(language, state, progress = 0) {
  const row = rowsByLanguage.get(language);
  if (!row) return;

  row.className = `model-row is-${state}`;
  row.dataset.state = state;
  const label = row.querySelector(".status-label");
  const action = row.querySelector(".row-action");
  const progressElement = row.querySelector(".download-progress");
  progressElement.value = progress;

  if (state === "available") {
    label.textContent = i18n.t("downloaded");
    action.textContent = i18n.t("downloaded");
    action.disabled = true;
  } else if (state === "downloadable") {
    label.textContent = i18n.t("notDownloaded");
    action.textContent = i18n.t("download");
    action.disabled = false;
  } else if (state === "downloading") {
    label.textContent = i18n.t("downloading", { progress });
    action.textContent = i18n.t("download");
    action.disabled = true;
  } else if (state === "unavailable") {
    label.textContent = i18n.t("unavailable");
    action.textContent = i18n.t("unavailable");
    action.disabled = true;
  } else if (state === "error") {
    label.textContent = i18n.t("translationFailed");
    action.textContent = i18n.t("retry");
    action.disabled = false;
  } else {
    label.textContent = i18n.t("checking");
    action.textContent = i18n.t("checking");
    action.disabled = true;
  }
}

async function checkLanguagePack(language) {
  setRowState(language, "checking");
  if (!("Translator" in self)) {
    setRowState(language, "unavailable");
    return;
  }
  try {
    const availability = await Translator.availability({
      sourceLanguage: "en",
      targetLanguage: language
    });
    setRowState(language, availability);
  } catch {
    setRowState(language, "error");
  }
}

function updateSummary() {
  const rows = Array.from(rowsByLanguage.values());
  const available = rows.filter((row) => row.dataset.state === "available").length;
  const downloadable = rows.filter(
    (row) => row.dataset.state === "downloadable"
  ).length;
  const unavailable = rows.filter(
    (row) => row.dataset.state === "unavailable"
  ).length;
  installedSummary.textContent = i18n.t("installedSummary", { count: available });
  installedCount.textContent = available;
  downloadableCount.textContent = downloadable;
  summaryText.textContent = unavailable
    ? i18n.t("unavailableSummary", { count: unavailable })
    : i18n.t("onDemand");

  if (!modelFilterInitialized) {
    activeModelFilter = available > 0 ? "available" : "all";
    modelFilterInitialized = true;
    modelFilters.forEach((item) =>
      item.classList.toggle("is-active", item.dataset.filter === activeModelFilter)
    );
  }
  filterRows();
}

async function refreshAllModels() {
  summaryText.textContent = i18n.t("modelChecking");
  await Promise.all(
    SUPPORTED_LANGUAGE_PACKS.map(({ code }) => checkLanguagePack(code))
  );
  updateSummary();
}

async function downloadLanguagePack(language) {
  setRowState(language, "downloading", 0);
  try {
    const translator = await Translator.create({
      sourceLanguage: "en",
      targetLanguage: language,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          setRowState(language, "downloading", Math.round(event.loaded * 100));
        });
      }
    });
    translator.destroy();
    setRowState(language, "available", 100);
    await refreshAllModels();
  } catch {
    setRowState(language, "error");
  }
}

async function handleRowAction(language) {
  const state = rowsByLanguage.get(language)?.dataset.state;
  if (state === "downloadable") {
    await downloadLanguagePack(language);
  } else if (state === "error") {
    await checkLanguagePack(language);
    updateSummary();
  }
}

function filterRows() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleMatches = 0;
  let totalMatches = 0;
  for (const row of rowsByLanguage.values()) {
    const matchesSearch = !query || row.dataset.search.includes(query);
    const matchesFilter =
      activeModelFilter === "all" || row.dataset.state === activeModelFilter;
    const matches = matchesSearch && matchesFilter;
    if (matches) totalMatches += 1;
    const withinLimit = modelsExpanded || query || visibleMatches < 8;
    row.hidden = !matches || !withinLimit;
    if (matches && withinLimit) visibleMatches += 1;
  }
  showMoreModelsButton.hidden = Boolean(query) || totalMatches <= 8;
  showMoreModelsButton.textContent = modelsExpanded
    ? i18n.t("showLess")
    : i18n.t("showMore");
}

function refreshLocalizedRows() {
  const autoOption = interfaceLanguageSelect.querySelector('option[value="auto"]');
  if (autoOption) autoOption.textContent = i18n.t("followBrowser");
  for (const [language, row] of rowsByLanguage) {
    const name = getLanguageName(language);
    const nativeName = languageCatalog.nativeNames[language] || name;
    row.dataset.search =
      `${name} ${nativeName} ${language} en-${language}`.toLowerCase();
    row.querySelector(".language-name").textContent = name;
    row.querySelector(".language-code").textContent = language;
    row.querySelector(".language-native-name").textContent = nativeName;
    setRowState(
      language,
      row.dataset.state || "checking",
      Number(row.querySelector(".download-progress").value)
    );
  }
  updateSummary();
  loadAlwaysTranslateSites();
}

function normalizeSites(sites) {
  return Array.from(
    new Set(
      (Array.isArray(sites) ? sites : [])
        .filter((site) => typeof site === "string")
        .map((site) => site.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));
}

function getSiteOrigins(hostname) {
  return [`http://${hostname}/*`, `https://${hostname}/*`];
}

function renderAlwaysTranslateSites(sites) {
  const normalizedSites = normalizeSites(sites);
  alwaysTranslateSitesList.replaceChildren();
  alwaysTranslateSitesEmpty.hidden = normalizedSites.length > 0;

  for (const site of normalizedSites) {
    const row = document.createElement("div");
    row.className = "site-rule-row";
    row.setAttribute("role", "listitem");

    const siteInfo = document.createElement("div");
    siteInfo.className = "site-rule-info";

    const icon = document.createElement("span");
    icon.className = "site-rule-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = site.slice(0, 1).toUpperCase();

    const hostname = document.createElement("span");
    hostname.className = "site-rule-hostname";
    hostname.textContent = site;

    const removeButton = document.createElement("button");
    removeButton.className = "site-rule-remove";
    removeButton.type = "button";
    removeButton.textContent = i18n.t("remove");
    removeButton.setAttribute(
      "aria-label",
      i18n.t("removeSite", { site })
    );
    removeButton.addEventListener("click", () => removeAlwaysTranslateSite(site));

    siteInfo.append(icon, hostname);
    row.append(siteInfo, removeButton);
    alwaysTranslateSitesList.append(row);
  }
}

async function loadAlwaysTranslateSites() {
  const { alwaysTranslateSites = [] } = await chrome.storage.local.get(
    "alwaysTranslateSites"
  );
  renderAlwaysTranslateSites(alwaysTranslateSites);
}

async function removeAlwaysTranslateSite(site) {
  const { alwaysTranslateSites = [] } = await chrome.storage.local.get(
    "alwaysTranslateSites"
  );
  const nextSites = normalizeSites(alwaysTranslateSites).filter(
    (storedSite) => storedSite !== site
  );
  await chrome.storage.local.set({ alwaysTranslateSites: nextSites });
  await chrome.permissions.remove({
    origins: getSiteOrigins(site)
  }).catch(() => false);
}

searchInput.addEventListener("input", filterRows);
showMoreModelsButton.addEventListener("click", () => {
  modelsExpanded = !modelsExpanded;
  filterRows();
});
for (const filter of modelFilters) {
  filter.addEventListener("click", () => {
    modelFilterInitialized = true;
    activeModelFilter = filter.dataset.filter;
    modelsExpanded = false;
    modelFilters.forEach((item) =>
      item.classList.toggle("is-active", item === filter)
    );
    filterRows();
  });
}
for (const item of navItems) {
  item.addEventListener("click", () => showPanel(item.dataset.panel));
}
for (const option of themeOptions) {
  option.addEventListener("click", async () => {
    const selectedTheme = await theme.set(option.dataset.themeValue);
    syncThemePicker(selectedTheme);
  });
}
interfaceLanguageSelect.addEventListener("change", async () => {
  await i18n.setLocale(interfaceLanguageSelect.value);
  refreshLocalizedRows();
});
settingsCacheEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ cacheEnabled: settingsCacheEnabled.checked });
  cacheActionStatus.textContent = settingsCacheEnabled.checked
    ? i18n.t("cacheEnabled")
    : i18n.t("cacheDisabled");
});
settingsClearCache.addEventListener("click", async () => {
  await chrome.storage.local.remove([
    "translationCache",
    "translationPageCache"
  ]);
  cacheActionStatus.textContent = i18n.t("cacheCleared");
});
backToExtensionButton.addEventListener("click", () => window.close());
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.alwaysTranslateSites) {
    renderAlwaysTranslateSites(changes.alwaysTranslateSites.newValue || []);
  }
});

async function bootstrap() {
  await Promise.all([i18n.ready, theme.ready]);
  syncThemePicker(document.documentElement.dataset.theme);
  for (const [code, nativeName] of i18n.supportedLocales) {
    interfaceLanguageSelect.add(
      new Option(code === "auto" ? i18n.t("followBrowser") : nativeName, code)
    );
  }
  interfaceLanguageSelect.value = i18n.setting;
  for (const { code } of SUPPORTED_LANGUAGE_PACKS) createRow(code);

  const { cacheEnabled } = await chrome.storage.local.get("cacheEnabled");
  settingsCacheEnabled.checked = cacheEnabled !== false;
  await loadAlwaysTranslateSites();
  await refreshAllModels();
}

bootstrap();
