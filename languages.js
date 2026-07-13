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
    getDisplayName
  });
})();
