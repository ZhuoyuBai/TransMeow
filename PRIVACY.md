# 翻译喵 TransMeow 隐私政策

**生效日期：2026 年 7 月 13 日**<br>
**最后更新：2026 年 7 月 13 日**

翻译喵（TransMeow，以下简称“本扩展”）是一款使用 Chrome 设备端翻译能力的网页翻译扩展。本隐私政策说明本扩展会处理哪些数据、为什么处理这些数据，以及用户如何管理或删除这些数据。

## 1. 本扩展处理的数据

为提供网页翻译功能，本扩展会在用户设备上处理以下数据：

- **网页内容**：用户所访问网页中的可见文本、生成的译文以及相关语言信息。本扩展使用这些内容完成语言检测、翻译、双语对照和原文恢复。
- **网页浏览信息**：启用翻译缓存时，本扩展会在本地保存已翻译页面的完整网址；启用“总是翻译该网站”时，会在本地保存对应网站的域名。
- **扩展设置**：原文语言、目标语言、显示模式、界面语言、配色主题、缓存开关及自动翻译网站列表。

本扩展不要求注册账号，也不会主动要求用户提交姓名、电子邮箱、电话号码、支付信息、身份认证信息、健康信息或精确位置等数据。如果这些信息出现在网页的可见文本中，它们可能作为网页内容的一部分仅在本地参与翻译和缓存。

## 2. 数据的使用方式

上述数据仅用于提供本扩展明确展示给用户的功能，包括：

- 识别和翻译网页中的可见文本；
- 在仅译文、双语对照和原文模式之间切换；
- 在用户选择的网站上自动开始翻译；
- 保存用户设置；
- 复用本地翻译缓存，减少重复翻译。

本扩展不会将这些数据用于广告、用户画像、信用评估、营销、数据转售或与网页翻译无关的目的。

## 3. 本地处理与存储

- 网页文本通过 Chrome 提供的设备端 Translator API 在用户设备上处理。本扩展的代码不会把网页文本或译文发送给开发者服务器或第三方翻译服务器。
- Chrome 可能在首次使用某个语言组合时下载由 Chrome 管理的语言包；语言包的下载和管理由 Chrome 负责。
- 设置、网站规则、网址和翻译缓存均保存在 `chrome.storage.local` 中，不使用云端同步。
- 翻译缓存最多保留 800 条文本记录；页面缓存最多保留 80 条页面记录。超出上限时，较早的记录会被自动移除。
- 本扩展不包含分析 SDK、广告 SDK、遥测上报、远程代码或开发者控制的后端服务。

## 4. 数据共享与披露

本扩展不会出售、出租或共享用户数据。开发者及其工作人员无法远程访问或人工读取保存在用户设备上的网页内容、网址、翻译缓存或扩展设置。

除非法律明确要求，否则本扩展不会向任何第三方披露用户数据。由于当前版本不把用户数据传输到开发者控制的服务器，开发者通常也不持有可以响应此类披露请求的用户数据。

## 5. 数据保留与删除

- 用户可以在扩展的高级设置中清空全部翻译缓存和页面缓存。
- 用户可以在扩展设置中删除“总是翻译的网站”规则。
- 用户可以随时更改语言、显示、主题和缓存设置。
- 卸载本扩展会删除 Chrome 为本扩展保存的本地数据。由 Chrome 下载和管理的语言包不由本扩展直接控制，可由 Chrome 自身的机制管理。

## 6. 权限说明

- `storage`：在本地保存扩展设置、网站规则及翻译缓存。
- `scripting`：在需要翻译的网页中运行本扩展自带的翻译脚本。
- `http://*/*` 和 `https://*/*`：读取普通网页中的可见文本、插入译文，并支持用户选择的网站自动翻译。本扩展不能在 `chrome://` 页面或 Chrome 应用商店页面运行。

本扩展只使用实现上述单一用途所必需的权限。

## 7. Chrome Web Store Limited Use

本扩展对从 Google API（包括 Chrome API）获得的信息的使用遵守 Chrome Web Store User Data Policy，包括 Limited Use 要求。相关数据只用于提供或改进用户可见的网页翻译功能，不用于广告，也不会出售或转移给第三方。

## 8. 隐私政策变更

如果本扩展的数据处理方式发生实质变化，本隐私政策将同步更新，并在适用时通过扩展界面、商店页面或版本说明告知用户。生效日期和最后更新日期会显示在本页面顶部。

## 9. 联系方式

如果对本隐私政策或本扩展的数据处理方式有疑问，请通过 [TransMeow GitHub Issues](https://github.com/ZhuoyuBai/TransMeow/issues) 联系开发者。

---

# TransMeow Privacy Policy

**Effective date: July 13, 2026**<br>
**Last updated: July 13, 2026**

TransMeow (the “Extension”) is a webpage translation extension that uses Chrome's on-device translation capabilities. This Privacy Policy explains what data the Extension handles, why it handles that data, and how users can manage or delete it.

## 1. Data handled by the Extension

To provide webpage translation, the Extension handles the following data on the user's device:

- **Website content**: Visible text from webpages, generated translations, and related language information. This data is used for language detection, translation, bilingual display, and restoring the original text.
- **Web browsing information**: When translation caching is enabled, the full URLs of translated pages are stored locally. When “Always translate this site” is enabled, the corresponding site domains are stored locally.
- **Extension settings**: Source and target languages, display mode, interface language, color theme, cache preference, and the list of automatically translated sites.

The Extension does not require an account and does not actively ask users to submit names, email addresses, phone numbers, payment information, authentication information, health information, or precise location data. If such information appears in visible webpage text, it may be processed and cached locally only as part of the webpage content being translated.

## 2. How data is used

The data described above is used only to provide user-facing Extension features, including:

- Detecting and translating visible webpage text;
- Switching between translation-only, bilingual, and original-text modes;
- Automatically starting translation on sites selected by the user;
- Saving user preferences; and
- Reusing local translation results to avoid repeated translation.

The Extension does not use this data for advertising, user profiling, credit assessment, marketing, data resale, or purposes unrelated to webpage translation.

## 3. Local processing and storage

- Webpage text is processed on the user's device through the on-device Translator API provided by Chrome. The Extension's code does not send webpage text or translations to developer-operated servers or third-party translation servers.
- Chrome may download Chrome-managed language packs when a language pair is used for the first time. Chrome is responsible for downloading and managing these language packs.
- Settings, site rules, URLs, and translation caches are stored in `chrome.storage.local` and are not stored using cloud sync.
- The translation cache retains up to 800 text records, and the page cache retains up to 80 page records. Older records are removed automatically when these limits are exceeded.
- The Extension contains no analytics SDK, advertising SDK, telemetry reporting, remote code, or developer-operated backend service.

## 4. Data sharing and disclosure

The Extension does not sell, rent, or share user data. The developer and its personnel cannot remotely access or manually read webpage content, URLs, translation caches, or settings stored on the user's device.

The Extension will not disclose user data to third parties unless required by law. Because the current version does not transmit user data to developer-controlled servers, the developer generally does not possess user data that could be disclosed in response to such a request.

## 5. Data retention and deletion

- Users can clear all translation and page caches from the Extension's advanced settings.
- Users can remove sites from the “Always translate” list in the Extension settings.
- Users can change language, display, theme, and cache preferences at any time.
- Uninstalling the Extension removes local data stored by Chrome for the Extension. Chrome-managed language packs are not directly controlled by the Extension and may be managed through Chrome's own mechanisms.

## 6. Permission usage

- `storage`: Stores Extension preferences, site rules, and translation caches locally.
- `scripting`: Runs the Extension's packaged translation script on webpages that the user wants to translate.
- `http://*/*` and `https://*/*`: Reads visible text on ordinary webpages, inserts translations, and supports automatic translation on sites selected by the user. The Extension cannot run on `chrome://` pages or Chrome Web Store pages.

The Extension uses these permissions only as necessary for its disclosed single purpose.

## 7. Chrome Web Store Limited Use

The use of information received from Google APIs, including Chrome APIs, adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Such data is used only to provide or improve the user-facing webpage translation functionality. It is not used for advertising and is not sold or transferred to third parties.

## 8. Changes to this Privacy Policy

If the Extension's data handling practices change materially, this Privacy Policy will be updated, and users will be notified through the Extension interface, store listing, or release notes where appropriate. The effective and last-updated dates appear at the top of this page.

## 9. Contact

For questions about this Privacy Policy or the Extension's data practices, contact the developer through [TransMeow GitHub Issues](https://github.com/ZhuoyuBai/TransMeow/issues).
