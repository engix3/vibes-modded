class LangpackManager {
  constructor() {
    this.currentLang = "en";
    this.strings = {};
    this.fallbackStrings = {};
    this.onChangeCallbacks = [];
  }
  async loadLanguage(langCode) {
    try {
      const response = await fetch(`lang/${langCode}/ui.json`);
      if (!response.ok) {
        throw new Error(`Language pack "${langCode}" not found`);
      }
      const data = await response.json();
      this.strings = data;
      this.currentLang = langCode;
      if (langCode !== "en" && Object.keys(this.fallbackStrings).length === 0) {
        const enResponse = await fetch("lang/en/ui.json");
        if (enResponse.ok) {
          this.fallbackStrings = await enResponse.json();
        }
      } else if (langCode === "en") {
        this.fallbackStrings = data;
      }
      this.savePreferences();
      this.notifyChange();
      return true;
    } catch (e) {
      console.error("Error loading language pack:", e);
      return false;
    }
  }
  get(path, replacements = {}) {
    const value = this.getByPath(this.strings, path) || this.getByPath(this.fallbackStrings, path) || path;
    return this.interpolate(value, replacements);
  }
  getByPath(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }
  interpolate(str, replacements) {
    if (typeof str !== "string") return str;
    return str.replace(/\{(\w+)\}/g, (match, key) => replacements.hasOwnProperty(key) ? replacements[key] : match);
  }
  getCurrentLanguage() {
    return {
      code: this.currentLang,
      name: this.strings.meta?.name || this.currentLang
    };
  }
  getAvailableLanguages() {
    return [ {
      code: "en",
      name: "English"
    } ];
  }
  async savePreferences() {
    try {
      await chrome.storage.local.set({
        freePitch_language: this.currentLang
      });
    } catch (e) {
      console.error("Error saving language preferences:", e);
    }
  }
  async loadPreferences() {
    try {
      const data = await chrome.storage.local.get("freePitch_language");
      if (data.freePitch_language) {
        await this.loadLanguage(data.freePitch_language);
        return;
      }
      const detectedLang = this.detectBrowserLanguage();
      await this.loadLanguage(detectedLang);
    } catch (e) {
      console.error("Error loading language preferences:", e);
      await this.loadLanguage("en");
    }
  }
  detectBrowserLanguage() {
    const browserLangs = navigator.languages || [ navigator.language ];
    const availableLangs = [ "en", "es", "fr", "cn", "ru" ];
    const langMap = {
      zh: "cn",
      "zh-cn": "cn",
      "zh-hans": "cn",
      "zh-tw": "cn",
      "zh-hant": "cn"
    };
    for (const browserLang of browserLangs) {
      const lang = browserLang.toLowerCase();
      if (availableLangs.includes(lang)) {
        return lang;
      }
      if (langMap[lang]) {
        return langMap[lang];
      }
      const baseLang = lang.split("-")[0];
      if (availableLangs.includes(baseLang)) {
        return baseLang;
      }
      if (langMap[baseLang]) {
        return langMap[baseLang];
      }
    }
    return "en";
  }
  onChange(callback) {
    this.onChangeCallbacks.push(callback);
  }
  notifyChange() {
    this.onChangeCallbacks.forEach(cb => cb(this.getCurrentLanguage()));
  }
  applyToDOM() {
    document.querySelectorAll("[data-lang]").forEach(el => {
      const key = el.dataset.lang;
      let text = this.get(key);
      if (el.dataset.langSuffix) {
        text += el.dataset.langSuffix;
      }
      if (el.dataset.langTransform === "uppercase") {
        text = text.toUpperCase();
      } else if (el.dataset.langTransform === "lowercase") {
        text = text.toLowerCase();
      }
      if (el.tagName === "INPUT" && el.placeholder !== undefined) {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll("[data-lang-title]").forEach(el => {
      const key = el.dataset.langTitle;
      const text = this.get(key);
      el.setAttribute("title", text);
    });
    document.querySelectorAll("[data-lang-placeholder]").forEach(el => {
      const key = el.dataset.langPlaceholder;
      const text = this.get(key);
      el.placeholder = text;
    });
  }
  async loadQuotePack(packId = "quote-pack-1") {
    const isPro = await (vibesPremium?.isPro?.()) || false;
    if (!isPro) {
      return null;
    }
    try {
      const lang = this.currentLang;
      const url = chrome.runtime.getURL(`lang/${lang}/premium/${packId}.json`);
      const response = await fetch(url);
      if (!response.ok) {
        const enUrl = chrome.runtime.getURL(`lang/en/premium/${packId}.json`);
        const enResponse = await fetch(enUrl);
        if (!enResponse.ok) {
          console.warn(`Quote pack "${packId}" not found`);
          return null;
        }
        return enResponse.json();
      }
      return response.json();
    } catch (e) {
      console.error("Error loading quote pack:", e);
      return null;
    }
  }
  getAvailableQuotePacks() {
    return [ "quote-pack-1" ];
  }
}

const langpack = new LangpackManager;