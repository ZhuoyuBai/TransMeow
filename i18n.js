(() => {
  const supportedLocales = [
    ["auto", "Follow browser"],
    ["zh-CN", "简体中文"],
    ["zh-TW", "繁體中文"],
    ["en", "English"],
    ["es", "Español"],
    ["pt-BR", "Português (Brasil)"],
    ["fr", "Français"],
    ["de", "Deutsch"],
    ["ja", "日本語"],
    ["ko", "한국어"],
    ["ru", "Русский"],
    ["ar", "العربية"],
    ["hi", "हिन्दी"],
    ["id", "Bahasa Indonesia"]
  ];

  const en = {
    brandName: "TransMeow",
    tagline: "Free on-device translation",
    sourceLanguage: "Source language",
    targetLanguage: "Target language",
    autoDetect: "Auto detect",
    viewport: "Visible area",
    wholePage: "Entire page",
    translate: "Translate",
    showOriginal: "Show original",
    alwaysTranslate: "Always translate this site",
    settings: "Settings",
    onlyTranslation: "Translation only",
    bilingual: "Bilingual",
    translating: "Translating",
    quickTranslation: "Short text translation",
    quickTranslationInput: "Text to translate",
    quickTranslationOutput: "Translation result",
    copyTranslation: "Copy translation",
    downloadLanguagePackFirst: "Download the {language} language pack first",
    goDownload: "Download",
    translationComplete: "Translation complete",
    downloaded: "Downloaded",
    notDownloaded: "Not downloaded",
    download: "Download",
    downloading: "Downloading {progress}%",
    retry: "Retry",
    unavailable: "Unavailable",
    checking: "Checking",
    clickDownload: "Click to download the language pack",
    settingsLabel: "Settings",
    modelsTitle: "Local language packs",
    modelsSubtitle: "Once downloaded, web content is translated only on your device",
    appearance: "Appearance",
    appearanceSubtitle: "Adjust how the extension is displayed",
    advanced: "Advanced settings",
    advancedSubtitle: "Manage translation cache and local data",
    backToExtension: "← Back to extension",
    backToWebpage: "← Back to webpage",
    refreshStatus: "Refresh status",
    checkingPacks: "Checking language packs…",
    localReady: "Local translation is ready",
    localPrivacy: "▣ Content never leaves your device",
    choosePack: "Choose language packs",
    onDemand: "Downloaded only when needed; no space is used automatically",
    searchLanguage: "Search languages",
    all: "All",
    installed: "Installed",
    downloadable: "Downloadable",
    showMore: "Show more languages",
    showLess: "Collapse language list",
    modelNote: "Language packs are provided and managed by Chrome. The extension can download them but cannot uninstall them directly.",
    languageSettings: "Language settings",
    languageSettingsDesc: "Choose the extension interface language",
    displayLanguage: "Display language",
    colorTheme: "Interface color",
    colorThemeDesc: "Choose the extension accent color",
    themePink: "Pink",
    themeGreen: "Green",
    themePurple: "Purple",
    themeBlue: "Blue",
    themeYellow: "Yellow",
    followBrowser: "Follow browser",
    translationArea: "Translation area",
    translationAreaDesc: "Choose whether to translate visible content or the entire page by default",
    defaultScope: "Default translation area",
    cache: "Translation cache",
    enableCache: "Enable cache",
    clearCache: "Clear translation cache",
    languageCode: "Language code: {language}",
    installedSummary: "{count} language packs installed",
    unavailableSummary: "Downloaded only when needed; {count} language packs are unavailable",
    modelChecking: "Checking model status visible to this extension…",
    cacheEnabled: "Translation cache enabled",
    cacheDisabled: "Translation cache disabled",
    cacheCleared: "Translation cache cleared",
    alwaysTranslateSites: "Always-translated sites",
    alwaysTranslateSitesDesc: "These sites are translated automatically when opened. The list is stored only on this device",
    noAlwaysTranslateSites: "No always-translated sites yet",
    siteCount: "{count} sites",
    remove: "Remove",
    removeSite: "Remove {site} from always-translated sites",
    siteRemoved: "Removed {site}. It will no longer be translated automatically",
    noContent: "No translatable content was found",
    noDifferentLanguage: "No page content different from the target language was detected",
    sameLanguage: "Source and target languages are the same",
    translatingClose: "Translation is running. You may close this popup…",
    translationFailed: "Translation failed. Please try again",
    modeSwitchFailed: "Could not switch display mode. Refresh the page and try again",
    pageModeUnconfirmed: "The page did not confirm the display mode change",
    pageUnavailable: "This page cannot be translated",
    pagePermissionDenied: "This page is not supported for translation",
    unknownLanguage: "Unknown language",
    autoDetected: "Auto detect · {language}",
    translatingProgress: "Translating…",
    retrying: "Retrying…",
    failedSegments: "{count} segments failed and can be retried",
    noTranslatableSource: "No translatable {language} content was detected",
    abortedProgress: "Stopped after completing {done} of {total} segments",
    siteEnabled: "Enabled. Future pages on this site will be translated automatically",
    siteDisabled: "Automatic translation is disabled for this site",
    sitePermissionDenied: "Site access is required to translate this site automatically"
  };

  const dictionaries = {
    en,
    "zh-CN": {
      backToWebpage: "← 返回网页",
      brandName: "翻译喵", tagline: "免费的本地化翻译服务", sourceLanguage: "原文语言", targetLanguage: "目标语言", autoDetect: "自动检测", viewport: "可视区域", wholePage: "整个页面", translate: "翻译", showOriginal: "显示原文", alwaysTranslate: "总是翻译该网站", settings: "设置", onlyTranslation: "仅译文", bilingual: "双语对照", translating: "翻译中", translationComplete: "翻译完成", downloaded: "已下载", notDownloaded: "未下载", download: "下载", downloading: "下载中 {progress}%", retry: "重试", unavailable: "不可用", checking: "检查中", clickDownload: "点击下载语言包", settingsLabel: "设置", modelsTitle: "本地语言包", modelsSubtitle: "下载后无需联网，网页内容只在你的设备上翻译", appearance: "外观", appearanceSubtitle: "调整插件的显示方式", advanced: "高级设置", advancedSubtitle: "管理翻译缓存与本地数据", backToExtension: "← 返回插件", refreshStatus: "刷新状态", checkingPacks: "正在检查语言包…", localReady: "本地翻译已就绪", localPrivacy: "▣ 内容不会离开设备", choosePack: "选择语言包", onDemand: "仅在需要时下载，不会自动占用空间", searchLanguage: "搜索语言", all: "全部", installed: "已安装", downloadable: "可下载", showMore: "显示更多语言", showLess: "收起语言列表", modelNote: "语言包由 Chrome 提供和管理。目前扩展只能下载，暂不支持直接卸载。", languageSettings: "语言设置", languageSettingsDesc: "选择插件界面的显示语言", displayLanguage: "显示语言", colorTheme: "界面配色", colorThemeDesc: "选择插件的强调色", themePink: "粉色", themeGreen: "绿色", themePurple: "紫色", themeBlue: "蓝色", themeYellow: "黄色", followBrowser: "跟随浏览器", translationArea: "翻译区域", translationAreaDesc: "选择默认翻译当前可见内容或整个页面", defaultScope: "默认翻译区域", cache: "翻译缓存", enableCache: "启用缓存", clearCache: "清空翻译缓存", languageCode: "语言代码：{language}", installedSummary: "已安装 {count} 个语言包", unavailableSummary: "仅在需要时下载；{count} 个语言包当前不可用", modelChecking: "正在检查本插件可见的模型状态…", cacheEnabled: "翻译缓存已启用", cacheDisabled: "翻译缓存已关闭", cacheCleared: "翻译缓存已清空", alwaysTranslateSites: "总是翻译的网站", alwaysTranslateSitesDesc: "这些网站会在打开时自动翻译，名单仅保存在本机", noAlwaysTranslateSites: "暂无总是翻译的网站", siteCount: "{count} 个网站", remove: "删除", removeSite: "从总是翻译的网站中删除 {site}", siteRemoved: "已删除 {site}，之后将不再自动翻译", noContent: "没有找到可翻译的正文", noDifferentLanguage: "未检测到与目标语言不同的网页正文", sameLanguage: "原文语言与目标语言相同，无需翻译", translatingClose: "翻译进行中，可关闭弹窗…", translationFailed: "翻译失败，请稍后重试", modeSwitchFailed: "显示模式切换失败，请刷新页面后重试", pageModeUnconfirmed: "页面未确认显示模式切换", pageUnavailable: "当前页面不可翻译", pagePermissionDenied: "不支持此页面翻译", unknownLanguage: "未知语言", autoDetected: "自动检测·{language}", translatingProgress: "正在翻译…", retrying: "正在重试…", failedSegments: "{count} 段翻译失败，可重试", noTranslatableSource: "没有检测到可翻译的{language}正文", abortedProgress: "已中止，完成 {done}/{total} 段", siteEnabled: "已开启，该网站后续页面将自动翻译", siteDisabled: "已关闭该网站的自动翻译", sitePermissionDenied: "需要允许访问该网站，才能在以后自动翻译"
    },
    "zh-TW": {
      backToWebpage: "← 返回網頁",
      brandName: "翻譯喵", tagline: "免費的裝置端翻譯服務", sourceLanguage: "原文語言", targetLanguage: "目標語言", autoDetect: "自動偵測", viewport: "可見區域", wholePage: "整個頁面", translate: "翻譯", showOriginal: "顯示原文", alwaysTranslate: "一律翻譯此網站", settings: "設定", onlyTranslation: "僅譯文", bilingual: "雙語對照", translating: "正在翻譯", translationComplete: "翻譯完成", downloaded: "已下載", notDownloaded: "未下載", download: "下載", downloading: "下載中 {progress}%", retry: "重試", unavailable: "無法使用", checking: "檢查中", settingsLabel: "設定", modelsTitle: "本機語言包", modelsSubtitle: "下載後不需連線，網頁內容只會在你的裝置上翻譯", appearance: "外觀", appearanceSubtitle: "調整擴充功能的顯示方式", advanced: "進階設定", advancedSubtitle: "管理翻譯快取與本機資料", backToExtension: "← 返回擴充功能", refreshStatus: "重新整理狀態", checkingPacks: "正在檢查語言包…", localReady: "本機翻譯已就緒", localPrivacy: "▣ 內容不會離開裝置", choosePack: "選擇語言包", onDemand: "只在需要時下載，不會自動占用空間", searchLanguage: "搜尋語言", all: "全部", installed: "已安裝", downloadable: "可下載", showMore: "顯示更多語言", showLess: "收合語言清單", modelNote: "語言包由 Chrome 提供及管理。目前擴充功能只能下載，尚不支援直接解除安裝。", languageSettings: "語言設定", languageSettingsDesc: "選擇擴充功能介面的顯示語言", displayLanguage: "顯示語言", followBrowser: "跟隨瀏覽器", translationArea: "翻譯區域", translationAreaDesc: "選擇預設翻譯目前可見內容或整個頁面", defaultScope: "預設翻譯區域", cache: "翻譯快取", enableCache: "啟用快取", clearCache: "清除翻譯快取", languageCode: "語言代碼：{language}", installedSummary: "已安裝 {count} 個語言包", unavailableSummary: "只在需要時下載；{count} 個語言包目前無法使用", modelChecking: "正在檢查此擴充功能可見的模型狀態…", cacheEnabled: "翻譯快取已啟用", cacheDisabled: "翻譯快取已關閉", cacheCleared: "翻譯快取已清除"
    },
    es: {
      brandName: "TransMeow", tagline: "Traducción gratuita en el dispositivo", sourceLanguage: "Idioma de origen", targetLanguage: "Idioma de destino", autoDetect: "Detectar automáticamente", viewport: "Área visible", wholePage: "Página completa", translate: "Traducir", showOriginal: "Mostrar original", alwaysTranslate: "Traducir siempre este sitio", settings: "Configuración", onlyTranslation: "Solo traducción", bilingual: "Bilingüe", translating: "Traduciendo", translationComplete: "Traducción completada", downloaded: "Descargado", notDownloaded: "Sin descargar", download: "Descargar", downloading: "Descargando {progress}%", retry: "Reintentar", unavailable: "No disponible", checking: "Comprobando", settingsLabel: "Configuración", modelsTitle: "Paquetes de idioma locales", modelsSubtitle: "Tras descargarlos, el contenido web se traduce solo en tu dispositivo", appearance: "Apariencia", appearanceSubtitle: "Ajusta cómo se muestra la extensión", advanced: "Configuración avanzada", advancedSubtitle: "Gestiona la caché y los datos locales", backToExtension: "← Volver a la extensión", refreshStatus: "Actualizar estado", checkingPacks: "Comprobando paquetes de idioma…", localReady: "La traducción local está lista", localPrivacy: "▣ El contenido no sale del dispositivo", choosePack: "Elegir paquetes de idioma", onDemand: "Se descargan solo cuando hacen falta", searchLanguage: "Buscar idiomas", all: "Todos", installed: "Instalados", downloadable: "Descargables", showMore: "Mostrar más idiomas", showLess: "Contraer la lista", modelNote: "Chrome proporciona y gestiona los paquetes de idioma. La extensión puede descargarlos, pero no desinstalarlos.", languageSettings: "Idioma", languageSettingsDesc: "Elige el idioma de la interfaz", displayLanguage: "Idioma de visualización", followBrowser: "Seguir al navegador", translationArea: "Área de traducción", translationAreaDesc: "Traduce el contenido visible o toda la página de forma predeterminada", cache: "Caché de traducción", enableCache: "Activar caché", clearCache: "Borrar caché"
    },
    "pt-BR": {
      brandName: "TransMeow", tagline: "Tradução gratuita no dispositivo", sourceLanguage: "Idioma de origem", targetLanguage: "Idioma de destino", autoDetect: "Detectar automaticamente", viewport: "Área visível", wholePage: "Página inteira", translate: "Traduzir", showOriginal: "Mostrar original", alwaysTranslate: "Sempre traduzir este site", settings: "Configurações", onlyTranslation: "Somente tradução", bilingual: "Bilíngue", translating: "Traduzindo", translationComplete: "Tradução concluída", downloaded: "Baixado", notDownloaded: "Não baixado", download: "Baixar", downloading: "Baixando {progress}%", retry: "Tentar novamente", unavailable: "Indisponível", checking: "Verificando", settingsLabel: "Configurações", modelsTitle: "Pacotes de idiomas locais", modelsSubtitle: "Após o download, o conteúdo é traduzido somente no seu dispositivo", appearance: "Aparência", advanced: "Configurações avançadas", backToExtension: "← Voltar à extensão", refreshStatus: "Atualizar status", checkingPacks: "Verificando pacotes de idiomas…", localReady: "A tradução local está pronta", localPrivacy: "▣ O conteúdo não sai do dispositivo", choosePack: "Escolher pacotes de idiomas", onDemand: "Baixados somente quando necessário", searchLanguage: "Pesquisar idiomas", all: "Todos", installed: "Instalados", downloadable: "Disponíveis", showMore: "Mostrar mais idiomas", showLess: "Recolher lista", languageSettings: "Idioma", languageSettingsDesc: "Escolha o idioma da interface", displayLanguage: "Idioma de exibição", followBrowser: "Seguir o navegador", translationArea: "Área de tradução", cache: "Cache de tradução", enableCache: "Ativar cache", clearCache: "Limpar cache"
    },
    fr: {
      brandName: "TransMeow", tagline: "Traduction gratuite sur l’appareil", sourceLanguage: "Langue source", targetLanguage: "Langue cible", autoDetect: "Détection automatique", viewport: "Zone visible", wholePage: "Page entière", translate: "Traduire", showOriginal: "Afficher l’original", alwaysTranslate: "Toujours traduire ce site", settings: "Paramètres", onlyTranslation: "Traduction seule", bilingual: "Bilingue", translating: "Traduction en cours", translationComplete: "Traduction terminée", downloaded: "Téléchargé", notDownloaded: "Non téléchargé", download: "Télécharger", downloading: "Téléchargement {progress}%", retry: "Réessayer", unavailable: "Indisponible", checking: "Vérification", settingsLabel: "Paramètres", modelsTitle: "Packs de langues locaux", modelsSubtitle: "Après téléchargement, le contenu est traduit uniquement sur votre appareil", appearance: "Apparence", advanced: "Paramètres avancés", backToExtension: "← Retour à l’extension", refreshStatus: "Actualiser", checkingPacks: "Vérification des packs…", localReady: "La traduction locale est prête", localPrivacy: "▣ Le contenu reste sur votre appareil", choosePack: "Choisir les packs de langues", onDemand: "Téléchargés uniquement si nécessaire", searchLanguage: "Rechercher une langue", all: "Tous", installed: "Installés", downloadable: "Téléchargeables", showMore: "Afficher plus de langues", showLess: "Réduire la liste", languageSettings: "Langue", languageSettingsDesc: "Choisissez la langue de l’interface", displayLanguage: "Langue d’affichage", followBrowser: "Suivre le navigateur", translationArea: "Zone de traduction", cache: "Cache de traduction", enableCache: "Activer le cache", clearCache: "Vider le cache"
    },
    de: {
      brandName: "TransMeow", tagline: "Kostenlose Übersetzung auf dem Gerät", sourceLanguage: "Ausgangssprache", targetLanguage: "Zielsprache", autoDetect: "Automatisch erkennen", viewport: "Sichtbarer Bereich", wholePage: "Ganze Seite", translate: "Übersetzen", showOriginal: "Original anzeigen", alwaysTranslate: "Diese Website immer übersetzen", settings: "Einstellungen", onlyTranslation: "Nur Übersetzung", bilingual: "Zweisprachig", translating: "Wird übersetzt", translationComplete: "Übersetzung abgeschlossen", downloaded: "Heruntergeladen", notDownloaded: "Nicht heruntergeladen", download: "Herunterladen", downloading: "Download {progress}%", retry: "Erneut versuchen", unavailable: "Nicht verfügbar", checking: "Wird geprüft", settingsLabel: "Einstellungen", modelsTitle: "Lokale Sprachpakete", modelsSubtitle: "Nach dem Download wird der Inhalt nur auf deinem Gerät übersetzt", appearance: "Darstellung", advanced: "Erweiterte Einstellungen", backToExtension: "← Zurück zur Erweiterung", refreshStatus: "Status aktualisieren", checkingPacks: "Sprachpakete werden geprüft…", localReady: "Lokale Übersetzung ist bereit", localPrivacy: "▣ Inhalte verlassen das Gerät nicht", choosePack: "Sprachpakete auswählen", onDemand: "Nur bei Bedarf herunterladen", searchLanguage: "Sprachen suchen", all: "Alle", installed: "Installiert", downloadable: "Herunterladbar", showMore: "Weitere Sprachen anzeigen", showLess: "Liste einklappen", languageSettings: "Sprache", languageSettingsDesc: "Sprache der Benutzeroberfläche auswählen", displayLanguage: "Anzeigesprache", followBrowser: "Browsersprache verwenden", translationArea: "Übersetzungsbereich", cache: "Übersetzungscache", enableCache: "Cache aktivieren", clearCache: "Cache leeren"
    },
    ja: {
      brandName: "TransMeow", tagline: "無料のオンデバイス翻訳", sourceLanguage: "原文の言語", targetLanguage: "翻訳先の言語", autoDetect: "自動検出", viewport: "表示範囲", wholePage: "ページ全体", translate: "翻訳", showOriginal: "原文を表示", alwaysTranslate: "このサイトを常に翻訳", settings: "設定", onlyTranslation: "訳文のみ", bilingual: "原文と訳文", translating: "翻訳中", translationComplete: "翻訳完了", downloaded: "ダウンロード済み", notDownloaded: "未ダウンロード", download: "ダウンロード", downloading: "ダウンロード中 {progress}%", retry: "再試行", unavailable: "利用不可", checking: "確認中", settingsLabel: "設定", modelsTitle: "ローカル言語パック", modelsSubtitle: "ダウンロード後、内容は端末上でのみ翻訳されます", appearance: "外観", advanced: "詳細設定", backToExtension: "← 拡張機能に戻る", refreshStatus: "状態を更新", checkingPacks: "言語パックを確認中…", localReady: "ローカル翻訳の準備完了", localPrivacy: "▣ 内容は端末外に送信されません", choosePack: "言語パックを選択", onDemand: "必要なときだけダウンロード", searchLanguage: "言語を検索", all: "すべて", installed: "インストール済み", downloadable: "ダウンロード可能", showMore: "さらに言語を表示", showLess: "言語一覧を閉じる", languageSettings: "言語設定", languageSettingsDesc: "拡張機能の表示言語を選択", displayLanguage: "表示言語", followBrowser: "ブラウザに合わせる", translationArea: "翻訳範囲", cache: "翻訳キャッシュ", enableCache: "キャッシュを有効化", clearCache: "キャッシュを削除"
    },
    ko: {
      brandName: "TransMeow", tagline: "무료 온디바이스 번역", sourceLanguage: "원문 언어", targetLanguage: "대상 언어", autoDetect: "자동 감지", viewport: "보이는 영역", wholePage: "전체 페이지", translate: "번역", showOriginal: "원문 보기", alwaysTranslate: "이 사이트 항상 번역", settings: "설정", onlyTranslation: "번역만", bilingual: "이중 언어", translating: "번역 중", translationComplete: "번역 완료", downloaded: "다운로드됨", notDownloaded: "다운로드 안 됨", download: "다운로드", downloading: "다운로드 중 {progress}%", retry: "다시 시도", unavailable: "사용 불가", checking: "확인 중", settingsLabel: "설정", modelsTitle: "로컬 언어 팩", modelsSubtitle: "다운로드 후 콘텐츠는 기기에서만 번역됩니다", appearance: "모양", advanced: "고급 설정", backToExtension: "← 확장 프로그램으로 돌아가기", refreshStatus: "상태 새로고침", checkingPacks: "언어 팩 확인 중…", localReady: "로컬 번역 준비 완료", localPrivacy: "▣ 콘텐츠가 기기를 벗어나지 않습니다", choosePack: "언어 팩 선택", onDemand: "필요할 때만 다운로드", searchLanguage: "언어 검색", all: "전체", installed: "설치됨", downloadable: "다운로드 가능", showMore: "언어 더 보기", showLess: "목록 접기", languageSettings: "언어 설정", languageSettingsDesc: "인터페이스 언어 선택", displayLanguage: "표시 언어", followBrowser: "브라우저 설정 따르기", translationArea: "번역 영역", cache: "번역 캐시", enableCache: "캐시 사용", clearCache: "캐시 지우기"
    },
    ru: {
      brandName: "TransMeow", tagline: "Бесплатный перевод на устройстве", sourceLanguage: "Исходный язык", targetLanguage: "Целевой язык", autoDetect: "Определять автоматически", viewport: "Видимая область", wholePage: "Вся страница", translate: "Перевести", showOriginal: "Показать оригинал", alwaysTranslate: "Всегда переводить этот сайт", settings: "Настройки", onlyTranslation: "Только перевод", bilingual: "Два языка", translating: "Перевод", translationComplete: "Перевод завершён", downloaded: "Загружено", notDownloaded: "Не загружено", download: "Загрузить", downloading: "Загрузка {progress}%", retry: "Повторить", unavailable: "Недоступно", checking: "Проверка", settingsLabel: "Настройки", modelsTitle: "Локальные языковые пакеты", modelsSubtitle: "После загрузки содержимое переводится только на вашем устройстве", appearance: "Внешний вид", advanced: "Расширенные настройки", backToExtension: "← Назад к расширению", refreshStatus: "Обновить статус", checkingPacks: "Проверка языковых пакетов…", localReady: "Локальный перевод готов", localPrivacy: "▣ Содержимое не покидает устройство", choosePack: "Выбрать языковые пакеты", onDemand: "Загружаются только при необходимости", searchLanguage: "Поиск языков", all: "Все", installed: "Установлено", downloadable: "Доступно", showMore: "Показать больше языков", showLess: "Свернуть список", languageSettings: "Язык", languageSettingsDesc: "Выберите язык интерфейса", displayLanguage: "Язык интерфейса", followBrowser: "Как в браузере", translationArea: "Область перевода", cache: "Кэш перевода", enableCache: "Включить кэш", clearCache: "Очистить кэш"
    },
    ar: {
      brandName: "TransMeow", tagline: "ترجمة مجانية على الجهاز", sourceLanguage: "لغة المصدر", targetLanguage: "اللغة الهدف", autoDetect: "اكتشاف تلقائي", viewport: "المنطقة المرئية", wholePage: "الصفحة كاملة", translate: "ترجمة", showOriginal: "عرض الأصل", alwaysTranslate: "ترجمة هذا الموقع دائمًا", settings: "الإعدادات", onlyTranslation: "الترجمة فقط", bilingual: "ثنائي اللغة", translating: "جارٍ الترجمة", translationComplete: "اكتملت الترجمة", downloaded: "تم التنزيل", notDownloaded: "غير منزل", download: "تنزيل", downloading: "جارٍ التنزيل {progress}%", retry: "إعادة المحاولة", unavailable: "غير متاح", checking: "جارٍ التحقق", settingsLabel: "الإعدادات", modelsTitle: "حزم اللغات المحلية", modelsSubtitle: "بعد التنزيل تتم ترجمة المحتوى على جهازك فقط", appearance: "المظهر", advanced: "إعدادات متقدمة", backToExtension: "العودة إلى الإضافة ←", refreshStatus: "تحديث الحالة", checkingPacks: "جارٍ فحص حزم اللغات…", localReady: "الترجمة المحلية جاهزة", localPrivacy: "▣ لا يغادر المحتوى جهازك", choosePack: "اختيار حزم اللغات", onDemand: "تنزّل عند الحاجة فقط", searchLanguage: "البحث عن لغة", all: "الكل", installed: "مثبت", downloadable: "قابل للتنزيل", showMore: "عرض لغات إضافية", showLess: "طي القائمة", languageSettings: "اللغة", languageSettingsDesc: "اختر لغة الواجهة", displayLanguage: "لغة العرض", followBrowser: "اتباع المتصفح", translationArea: "نطاق الترجمة", cache: "ذاكرة الترجمة", enableCache: "تفعيل الذاكرة", clearCache: "مسح الذاكرة"
    },
    hi: {
      brandName: "TransMeow", tagline: "डिवाइस पर मुफ़्त अनुवाद", sourceLanguage: "स्रोत भाषा", targetLanguage: "लक्ष्य भाषा", autoDetect: "स्वतः पहचानें", viewport: "दृश्य क्षेत्र", wholePage: "पूरा पृष्ठ", translate: "अनुवाद करें", showOriginal: "मूल दिखाएँ", alwaysTranslate: "इस साइट का हमेशा अनुवाद करें", settings: "सेटिंग", onlyTranslation: "केवल अनुवाद", bilingual: "द्विभाषी", translating: "अनुवाद हो रहा है", translationComplete: "अनुवाद पूरा हुआ", downloaded: "डाउनलोड किया गया", notDownloaded: "डाउनलोड नहीं", download: "डाउनलोड", downloading: "डाउनलोड {progress}%", retry: "फिर प्रयास करें", unavailable: "उपलब्ध नहीं", checking: "जाँच जारी", settingsLabel: "सेटिंग", modelsTitle: "स्थानीय भाषा पैक", modelsSubtitle: "डाउनलोड के बाद सामग्री केवल आपके डिवाइस पर अनुवादित होती है", appearance: "रूप", advanced: "उन्नत सेटिंग", backToExtension: "← एक्सटेंशन पर वापस", refreshStatus: "स्थिति रीफ़्रेश करें", checkingPacks: "भाषा पैक जाँचे जा रहे हैं…", localReady: "स्थानीय अनुवाद तैयार है", localPrivacy: "▣ सामग्री डिवाइस से बाहर नहीं जाती", choosePack: "भाषा पैक चुनें", onDemand: "ज़रूरत पर ही डाउनलोड", searchLanguage: "भाषा खोजें", all: "सभी", installed: "इंस्टॉल", downloadable: "डाउनलोड योग्य", showMore: "और भाषाएँ दिखाएँ", showLess: "सूची समेटें", languageSettings: "भाषा", languageSettingsDesc: "इंटरफ़ेस भाषा चुनें", displayLanguage: "प्रदर्शन भाषा", followBrowser: "ब्राउज़र के अनुसार", translationArea: "अनुवाद क्षेत्र", cache: "अनुवाद कैश", enableCache: "कैश चालू करें", clearCache: "कैश साफ़ करें"
    },
    id: {
      brandName: "TransMeow", tagline: "Terjemahan gratis di perangkat", sourceLanguage: "Bahasa sumber", targetLanguage: "Bahasa tujuan", autoDetect: "Deteksi otomatis", viewport: "Area terlihat", wholePage: "Seluruh halaman", translate: "Terjemahkan", showOriginal: "Tampilkan asli", alwaysTranslate: "Selalu terjemahkan situs ini", settings: "Pengaturan", onlyTranslation: "Hanya terjemahan", bilingual: "Dwibahasa", translating: "Menerjemahkan", translationComplete: "Terjemahan selesai", downloaded: "Sudah diunduh", notDownloaded: "Belum diunduh", download: "Unduh", downloading: "Mengunduh {progress}%", retry: "Coba lagi", unavailable: "Tidak tersedia", checking: "Memeriksa", settingsLabel: "Pengaturan", modelsTitle: "Paket bahasa lokal", modelsSubtitle: "Setelah diunduh, konten diterjemahkan hanya di perangkat Anda", appearance: "Tampilan", advanced: "Pengaturan lanjutan", backToExtension: "← Kembali ke ekstensi", refreshStatus: "Segarkan status", checkingPacks: "Memeriksa paket bahasa…", localReady: "Terjemahan lokal siap", localPrivacy: "▣ Konten tidak meninggalkan perangkat", choosePack: "Pilih paket bahasa", onDemand: "Diunduh hanya saat diperlukan", searchLanguage: "Cari bahasa", all: "Semua", installed: "Terpasang", downloadable: "Dapat diunduh", showMore: "Tampilkan bahasa lainnya", showLess: "Ciutkan daftar", languageSettings: "Bahasa", languageSettingsDesc: "Pilih bahasa antarmuka", displayLanguage: "Bahasa tampilan", followBrowser: "Ikuti browser", translationArea: "Area terjemahan", cache: "Cache terjemahan", enableCache: "Aktifkan cache", clearCache: "Hapus cache"
    }
  };

  // 高频动态文案单独集中维护，避免模型列表和缓存操作在非英语界面中
  // 因为运行时生成而退回英文。极少见的诊断错误仍以英文作为安全兜底。
  Object.assign(dictionaries["zh-CN"], {
    quickTranslation: "短文本翻译",
    quickTranslationInput: "输入要翻译的文本",
    quickTranslationOutput: "翻译结果",
    copyTranslation: "复制译文",
    downloadLanguagePackFirst: "请先下载{language}语言包",
    goDownload: "去下载"
  });
  Object.assign(dictionaries["zh-TW"], {
    quickTranslation: "短文字翻譯", quickTranslationInput: "輸入要翻譯的文字", quickTranslationOutput: "翻譯結果", copyTranslation: "複製譯文", downloadLanguagePackFirst: "請先下載{language}語言包", goDownload: "前往下載", colorTheme: "界面配色", colorThemeDesc: "選擇擴充功能的強調色", themePink: "粉紅色", themeGreen: "綠色", themePurple: "紫色", themeBlue: "藍色", themeYellow: "黃色", alwaysTranslateSites: "一律翻譯的網站", alwaysTranslateSitesDesc: "開啟這些網站時會自動翻譯，清單只儲存在本機", noAlwaysTranslateSites: "尚無一律翻譯的網站", siteCount: "{count} 個網站", remove: "刪除", removeSite: "從一律翻譯的網站中刪除 {site}", siteRemoved: "已刪除 {site}，之後將不再自動翻譯", sitePermissionDenied: "必須允許存取此網站，之後才能自動翻譯"
  });
  Object.assign(dictionaries.es, {
    clickDownload: "Haz clic para descargar el paquete", languageCode: "Código de idioma: {language}", installedSummary: "{count} paquetes de idioma instalados", unavailableSummary: "Solo se descargan cuando hacen falta; {count} no están disponibles", modelChecking: "Comprobando los modelos visibles para esta extensión…", cacheEnabled: "Caché de traducción activada", cacheDisabled: "Caché de traducción desactivada", cacheCleared: "Caché de traducción borrada"
  });
  Object.assign(dictionaries["pt-BR"], {
    modelNote: "Os pacotes de idiomas são fornecidos e gerenciados pelo Chrome. A extensão pode baixá-los, mas não desinstalá-los.", appearanceSubtitle: "Ajuste como a extensão é exibida", advancedSubtitle: "Gerencie o cache de tradução e os dados locais", translationAreaDesc: "Escolha traduzir o conteúdo visível ou a página inteira por padrão", clickDownload: "Clique para baixar o pacote", languageCode: "Código do idioma: {language}", installedSummary: "{count} pacotes de idiomas instalados", unavailableSummary: "Baixados somente quando necessário; {count} estão indisponíveis", modelChecking: "Verificando os modelos visíveis para esta extensão…", cacheEnabled: "Cache de tradução ativado", cacheDisabled: "Cache de tradução desativado", cacheCleared: "Cache de tradução limpo"
  });
  Object.assign(dictionaries.fr, {
    modelNote: "Les packs de langues sont fournis et gérés par Chrome. L’extension peut les télécharger, mais pas les désinstaller.", appearanceSubtitle: "Ajustez l’affichage de l’extension", advancedSubtitle: "Gérez le cache de traduction et les données locales", translationAreaDesc: "Choisissez de traduire la zone visible ou la page entière par défaut", clickDownload: "Cliquer pour télécharger le pack", languageCode: "Code de langue : {language}", installedSummary: "{count} packs de langues installés", unavailableSummary: "Téléchargés uniquement si nécessaire ; {count} sont indisponibles", modelChecking: "Vérification des modèles visibles par cette extension…", cacheEnabled: "Cache de traduction activé", cacheDisabled: "Cache de traduction désactivé", cacheCleared: "Cache de traduction vidé"
  });
  Object.assign(dictionaries.de, {
    modelNote: "Sprachpakete werden von Chrome bereitgestellt und verwaltet. Die Erweiterung kann sie herunterladen, aber nicht deinstallieren.", appearanceSubtitle: "Darstellung der Erweiterung anpassen", advancedSubtitle: "Übersetzungscache und lokale Daten verwalten", translationAreaDesc: "Standardmäßig sichtbare Inhalte oder die ganze Seite übersetzen", clickDownload: "Zum Herunterladen des Sprachpakets klicken", languageCode: "Sprachcode: {language}", installedSummary: "{count} Sprachpakete installiert", unavailableSummary: "Nur bei Bedarf herunterladen; {count} sind nicht verfügbar", modelChecking: "Für diese Erweiterung sichtbare Modelle werden geprüft…", cacheEnabled: "Übersetzungscache aktiviert", cacheDisabled: "Übersetzungscache deaktiviert", cacheCleared: "Übersetzungscache geleert"
  });
  Object.assign(dictionaries.ja, {
    modelNote: "言語パックは Chrome が提供・管理します。拡張機能からダウンロードできますが、直接削除はできません。", appearanceSubtitle: "拡張機能の表示方法を調整します", advancedSubtitle: "翻訳キャッシュとローカルデータを管理します", translationAreaDesc: "表示範囲またはページ全体を既定で翻訳します", clickDownload: "クリックして言語パックをダウンロード", languageCode: "言語コード：{language}", installedSummary: "{count} 個の言語パックをインストール済み", unavailableSummary: "必要なときだけダウンロードします。{count} 個は利用できません", modelChecking: "この拡張機能で確認できるモデルをチェック中…", cacheEnabled: "翻訳キャッシュを有効にしました", cacheDisabled: "翻訳キャッシュを無効にしました", cacheCleared: "翻訳キャッシュを削除しました"
  });
  Object.assign(dictionaries.ko, {
    modelNote: "언어 팩은 Chrome에서 제공하고 관리합니다. 확장 프로그램에서 다운로드할 수 있지만 직접 삭제할 수는 없습니다.", appearanceSubtitle: "확장 프로그램 표시 방식을 조정합니다", advancedSubtitle: "번역 캐시와 로컬 데이터를 관리합니다", translationAreaDesc: "기본 번역 범위를 보이는 영역 또는 전체 페이지로 선택합니다", clickDownload: "언어 팩을 다운로드하려면 클릭", languageCode: "언어 코드: {language}", installedSummary: "언어 팩 {count}개 설치됨", unavailableSummary: "필요할 때만 다운로드하며 {count}개는 사용할 수 없습니다", modelChecking: "이 확장 프로그램에서 확인 가능한 모델을 검사 중…", cacheEnabled: "번역 캐시가 활성화됨", cacheDisabled: "번역 캐시가 비활성화됨", cacheCleared: "번역 캐시를 지움"
  });
  Object.assign(dictionaries.ru, {
    modelNote: "Языковые пакеты предоставляет и обслуживает Chrome. Расширение может загружать, но не удалять их.", appearanceSubtitle: "Настройте отображение расширения", advancedSubtitle: "Управляйте кэшем перевода и локальными данными", translationAreaDesc: "По умолчанию переводить видимую область или всю страницу", clickDownload: "Нажмите, чтобы загрузить языковой пакет", languageCode: "Код языка: {language}", installedSummary: "Установлено языковых пакетов: {count}", unavailableSummary: "Загружаются по необходимости; недоступно: {count}", modelChecking: "Проверка моделей, доступных расширению…", cacheEnabled: "Кэш перевода включён", cacheDisabled: "Кэш перевода выключен", cacheCleared: "Кэш перевода очищен"
  });
  Object.assign(dictionaries.ar, {
    modelNote: "يوفر Chrome حزم اللغات ويديرها. يمكن للإضافة تنزيلها، لكنها لا تستطيع إزالتها مباشرة.", appearanceSubtitle: "اضبط طريقة عرض الإضافة", advancedSubtitle: "إدارة ذاكرة الترجمة والبيانات المحلية", translationAreaDesc: "اختر ترجمة الجزء المرئي أو الصفحة كاملة افتراضيًا", clickDownload: "انقر لتنزيل حزمة اللغة", languageCode: "رمز اللغة: {language}", installedSummary: "تم تثبيت {count} من حزم اللغات", unavailableSummary: "تنزّل عند الحاجة فقط؛ {count} غير متاحة", modelChecking: "جارٍ فحص النماذج المتاحة لهذه الإضافة…", cacheEnabled: "تم تفعيل ذاكرة الترجمة", cacheDisabled: "تم تعطيل ذاكرة الترجمة", cacheCleared: "تم مسح ذاكرة الترجمة"
  });
  Object.assign(dictionaries.hi, {
    modelNote: "भाषा पैक Chrome उपलब्ध और प्रबंधित करता है। एक्सटेंशन इन्हें डाउनलोड कर सकता है, पर सीधे हटा नहीं सकता।", appearanceSubtitle: "एक्सटेंशन के प्रदर्शन को समायोजित करें", advancedSubtitle: "अनुवाद कैश और स्थानीय डेटा प्रबंधित करें", translationAreaDesc: "डिफ़ॉल्ट रूप से दृश्य सामग्री या पूरा पृष्ठ अनुवाद करें", clickDownload: "भाषा पैक डाउनलोड करने के लिए क्लिक करें", languageCode: "भाषा कोड: {language}", installedSummary: "{count} भाषा पैक इंस्टॉल हैं", unavailableSummary: "केवल ज़रूरत पर डाउनलोड; {count} उपलब्ध नहीं", modelChecking: "इस एक्सटेंशन को उपलब्ध मॉडल जाँचे जा रहे हैं…", cacheEnabled: "अनुवाद कैश चालू है", cacheDisabled: "अनुवाद कैश बंद है", cacheCleared: "अनुवाद कैश साफ़ किया गया"
  });
  Object.assign(dictionaries.id, {
    modelNote: "Paket bahasa disediakan dan dikelola oleh Chrome. Ekstensi dapat mengunduh, tetapi tidak dapat menghapusnya langsung.", appearanceSubtitle: "Sesuaikan tampilan ekstensi", advancedSubtitle: "Kelola cache terjemahan dan data lokal", translationAreaDesc: "Pilih area terlihat atau seluruh halaman sebagai bawaan", clickDownload: "Klik untuk mengunduh paket bahasa", languageCode: "Kode bahasa: {language}", installedSummary: "{count} paket bahasa terpasang", unavailableSummary: "Diunduh hanya saat diperlukan; {count} tidak tersedia", modelChecking: "Memeriksa model yang terlihat oleh ekstensi ini…", cacheEnabled: "Cache terjemahan diaktifkan", cacheDisabled: "Cache terjemahan dinonaktifkan", cacheCleared: "Cache terjemahan dibersihkan"
  });

  function normalizeLocale(locale) {
    const value = String(locale || "").replace("_", "-");
    if (/^zh-(TW|HK|Hant)/i.test(value)) return "zh-TW";
    if (/^zh/i.test(value)) return "zh-CN";
    if (/^pt/i.test(value)) return "pt-BR";
    const base = value.split("-")[0].toLowerCase();
    return supportedLocales.some(([code]) => code === base) ? base : "en";
  }

  let selectedSetting = "auto";
  let currentLocale = normalizeLocale(navigator.language);

  function t(key, variables = {}) {
    const template = dictionaries[currentLocale]?.[key] ?? en[key] ?? key;
    return String(template).replace(/\{(\w+)\}/gu, (_match, name) =>
      variables[name] === undefined ? `{${name}}` : String(variables[name])
    );
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = currentLocale === "ar" ? "rtl" : "ltr";
    document.title = document.body?.dataset.i18nPageTitle
      ? t(document.body.dataset.i18nPageTitle)
      : document.title;
  }

  async function setLocale(setting, persist = true) {
    selectedSetting = setting || "auto";
    currentLocale = normalizeLocale(
      selectedSetting === "auto" ? navigator.language : selectedSetting
    );
    if (persist) await chrome.storage.local.set({ interfaceLanguage: selectedSetting });
    apply();
    document.dispatchEvent(new CustomEvent("local-translator-locale-change"));
  }

  const ready = chrome.storage.local
    .get("interfaceLanguage")
    .then(({ interfaceLanguage }) => setLocale(interfaceLanguage || "auto", false))
    .catch(() => setLocale("auto", false));

  globalThis.LocalTranslatorI18n = Object.freeze({
    supportedLocales,
    ready,
    t,
    apply,
    setLocale,
    get locale() { return currentLocale; },
    get setting() { return selectedSetting; }
  });
})();
