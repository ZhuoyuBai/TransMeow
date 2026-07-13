(() => {
  const STORAGE_KEY = "colorTheme";
  const DEFAULT_THEME = "pink";
  const themes = ["pink", "green", "purple", "blue", "yellow"];

  function normalize(theme) {
    return themes.includes(theme) ? theme : DEFAULT_THEME;
  }

  function apply(theme) {
    const selected = normalize(theme);
    document.documentElement.dataset.theme = selected;
    document.dispatchEvent(
      new CustomEvent("local-translator-theme-change", {
        detail: { theme: selected }
      })
    );
    return selected;
  }

  async function set(theme) {
    const selected = apply(theme);
    await chrome.storage.local.set({ [STORAGE_KEY]: selected });
    return selected;
  }

  const ready = chrome.storage.local
    .get(STORAGE_KEY)
    .then((stored) => apply(stored[STORAGE_KEY]))
    .catch(() => apply(DEFAULT_THEME));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      apply(changes[STORAGE_KEY].newValue);
    }
  });

  globalThis.LocalTranslatorTheme = {
    DEFAULT_THEME,
    STORAGE_KEY,
    themes,
    apply,
    set,
    ready
  };
})();
