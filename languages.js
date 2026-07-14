(() => {
  const languages = [
    ["ar", "العربية"], ["bg", "Български"], ["bn", "বাংলা"],
    ["cs", "Čeština"], ["da", "Dansk"], ["de", "Deutsch"],
    ["el", "Ελληνικά"], ["en", "English"], ["es", "Español"],
    ["fi", "Suomi"], ["fr", "Français"], ["hi", "हिन्दी"],
    ["hr", "Hrvatski"], ["hu", "Magyar"], ["id", "Bahasa Indonesia"],
    ["it", "Italiano"], ["iw", "עברית"], ["ja", "日本語"],
    ["kn", "ಕನ್ನಡ"], ["ko", "한국어"], ["lt", "Lietuvių"],
    ["mr", "मराठी"], ["nl", "Nederlands"], ["no", "Norsk"],
    ["pl", "Polski"], ["pt", "Português"], ["ro", "Română"],
    ["ru", "Русский"], ["sk", "Slovenčina"], ["sl", "Slovenščina"],
    ["sv", "Svenska"], ["ta", "தமிழ்"], ["te", "తెలుగు"],
    ["th", "ไทย"], ["tr", "Türkçe"], ["uk", "Українська"],
    ["vi", "Tiếng Việt"], ["zh", "简体中文"], ["zh-Hant", "繁體中文"]
  ];

  const nativeNames = Object.fromEntries(languages);
  const supportedCodes = new Set(languages.map(([code]) => code));

  function normalize(language) {
    if (!language) return "";
    const value = language.trim();
    if (/^zh-(TW|HK|MO|Hant)/i.test(value)) return "zh-Hant";
    if (/^zh/i.test(value)) return "zh";

    const baseLanguage = value.split("-")[0].toLowerCase();
    if (baseLanguage === "he") return "iw";
    if (baseLanguage === "nb" || baseLanguage === "nn") return "no";
    return supportedCodes.has(baseLanguage) ? baseLanguage : "";
  }

  function getSystemLanguage() {
    let uiLanguage = "";
    try {
      // Chrome 的界面语言最接近扩展可获得的系统显示语言。
      uiLanguage = globalThis.chrome?.i18n?.getUILanguage?.() || "";
    } catch {
      // 普通网页测试环境可能没有完整的 chrome.i18n 实现。
    }
    const preferredLanguages = Array.isArray(globalThis.navigator?.languages)
      ? globalThis.navigator.languages
      : [];
    const candidates = [
      uiLanguage,
      ...preferredLanguages,
      globalThis.navigator?.language
    ];

    for (const candidate of candidates) {
      const language = normalize(candidate);
      if (language) return language;
    }

    // Translator API 支持的系统语言中无法匹配时，使用最通用的英文兜底。
    return "en";
  }

  function toDisplayCode(language) {
    if (language === "iw") return "he";
    if (language === "zh") return "zh-Hans";
    return language;
  }

  function getDisplayName(language, locale = "en") {
    try {
      const names = new Intl.DisplayNames([locale], { type: "language" });
      return names.of(toDisplayCode(language)) || nativeNames[language] || language;
    } catch {
      return nativeNames[language] || language;
    }
  }

  globalThis.LocalTranslatorLanguages = Object.freeze({
    all: languages.map(([code, nativeName]) => ({ code, nativeName })),
    nativeNames,
    normalize,
    getSystemLanguage,
    getDisplayName
  });
})();
