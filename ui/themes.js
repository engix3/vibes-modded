const THEMES = {
  default: {
    id: "default",
    name: "Default",
    description: "Clean and modern default theme",
    premium: false,
    styles: {
      dark: {
        "--bg-primary": "#18181b",
        "--bg-secondary": "#27272a",
        "--bg-tertiary": "#3f3f46",
        "--bg-slider": "#1a1a1a",
        "--bg-slider-light": "#2a2a2e",
        "--text-primary": "#e4e4e7",
        "--text-secondary": "#a1a1aa",
        "--text-muted": "#71717a",
        "--text-faint": "#52525b",
        "--text-micro": "#3f3f46",
        "--border-color": "#27272a",
        "--accent-yellow": "#fbbf24",
        "--accent-blue": "#56b2eb",
        "--accent-green-light": "#64e453",
        "--accent-green-dark": "#3aa824",
        "--accent-green-stroke": "#6aff56",
        "--toggle-off-bg": "#3f3f46",
        "--toggle-off-knob": "#71717a",
        "--toggle-on-bg": "#166534",
        "--toggle-on-knob": "#4ade80",
        "--main-toggle-on-bg": "#6436ff",
        "--main-toggle-on-knob": "#fdbb1c",
        "--btn-hover": "#52525b",
        "--kofi-bg": "#0891b2",
        "--kofi-hover": "#0e7490",
        "--discord-bg": "#5865F2",
        "--discord-hover": "#4752c4",
        "--status-dot-inactive": "#52525b",
        "--status-dot-active": "#4ade80",
        "--promo-bg": "rgba(251, 191, 36, 0.1)",
        "--tab-slider-bg": "#ffffff",
        "--tab-active-text": "#18181b",
        "--pitcher-bubble-bg": "#27272a",
        "--pitcher-bubble-border": "#3f3f46",
        "--pitcher-text": "#e4e4e7",
        "--settings-dropdown-bg": "#27272a",
        "--settings-dropdown-border": "#3f3f46",
        "--shortcut-default": "#fbbf24",
        "--shortcut-no": "#dc2626",
        "--shortcut-suggest": "#3b82f6",
        "--shortcut-1": "#3b82f6",
        "--shortcut-2": "#22c55e",
        "--shortcut-3": "#a855f7",
        "--shortcut-4": "#ec4899",
        "--shortcut-5": "#f97316",
        "--shortcut-6": "#06b6d4",
        "--shortcut-7": "#ef4444",
        "--pitch-low-h": "20",
        "--pitch-low-s": "100",
        "--pitch-low-l": "48",
        "--pitch-mid-h": "35",
        "--pitch-mid-s": "98",
        "--pitch-mid-l": "54",
        "--pitch-high-h": "45",
        "--pitch-high-s": "96",
        "--pitch-high-l": "62",
        "--pitch-bg-l-offset": "-24",
        "--pitch-bg-s-offset": "0",
        "--speed-low-h": "210",
        "--speed-low-s": "80",
        "--speed-low-l": "35",
        "--speed-mid-h": "202",
        "--speed-mid-s": "82",
        "--speed-mid-l": "52",
        "--speed-high-h": "197",
        "--speed-high-s": "78",
        "--speed-high-l": "63",
        "--speed-bg-l-offset": "-20",
        "--speed-bg-s-offset": "0",
        "--accent-pink": "#ec4899",
        "--volume-low-h": "330",
        "--volume-low-s": "90",
        "--volume-low-l": "35",
        "--volume-mid-h": "338",
        "--volume-mid-s": "85",
        "--volume-mid-l": "50",
        "--volume-high-h": "345",
        "--volume-high-s": "80",
        "--volume-high-l": "62",
        "--volume-bg-l-offset": "-22",
        "--volume-bg-s-offset": "0"
      },
      light: {
        "--bg-primary": "#ffffff",
        "--bg-secondary": "#f4f4f5",
        "--bg-tertiary": "#e4e4e7",
        "--bg-slider": "#d4d4d8",
        "--bg-slider-light": "#d4d4d8",
        "--text-primary": "#18181b",
        "--text-secondary": "#52525b",
        "--text-muted": "#71717a",
        "--text-faint": "#a1a1aa",
        "--text-micro": "#d4d4d8",
        "--border-color": "#e4e4e7",
        "--accent-yellow": "#f59e0b",
        "--accent-blue": "#0284c7",
        "--accent-green-light": "#22c55e",
        "--accent-green-dark": "#3aa824",
        "--accent-green-stroke": "#4ade80",
        "--toggle-off-bg": "#d4d4d8",
        "--toggle-off-knob": "#a1a1aa",
        "--toggle-on-bg": "#166534",
        "--toggle-on-knob": "#4ade80",
        "--main-toggle-on-bg": "#6436ff",
        "--main-toggle-on-knob": "#fdbb1c",
        "--btn-hover": "#d4d4d8",
        "--kofi-bg": "#0891b2",
        "--kofi-hover": "#0e7490",
        "--discord-bg": "#5865F2",
        "--discord-hover": "#4752c4",
        "--status-dot-inactive": "#a1a1aa",
        "--status-dot-active": "#22c55e",
        "--promo-bg": "rgba(245, 158, 11, 0.1)",
        "--tab-slider-bg": "#18181b",
        "--tab-active-text": "#ffffff",
        "--pitcher-bubble-bg": "#f4f4f5",
        "--pitcher-bubble-border": "#e4e4e7",
        "--pitcher-text": "#18181b",
        "--settings-dropdown-bg": "#ffffff",
        "--settings-dropdown-border": "#e4e4e7",
        "--shortcut-default": "#f59e0b",
        "--shortcut-no": "#dc2626",
        "--shortcut-suggest": "#2563eb",
        "--shortcut-1": "#2563eb",
        "--shortcut-2": "#16a34a",
        "--shortcut-3": "#9333ea",
        "--shortcut-4": "#db2777",
        "--shortcut-5": "#ea580c",
        "--shortcut-6": "#0891b2",
        "--shortcut-7": "#dc2626",
        "--pitch-low-h": "25",
        "--pitch-low-s": "95",
        "--pitch-low-l": "55",
        "--pitch-mid-h": "38",
        "--pitch-mid-s": "95",
        "--pitch-mid-l": "52",
        "--pitch-high-h": "48",
        "--pitch-high-s": "95",
        "--pitch-high-l": "58",
        "--pitch-bg-l-offset": "23",
        "--pitch-bg-s-offset": "20",
        "--speed-low-h": "210",
        "--speed-low-s": "75",
        "--speed-low-l": "48",
        "--speed-mid-h": "205",
        "--speed-mid-s": "80",
        "--speed-mid-l": "55",
        "--speed-high-h": "200",
        "--speed-high-s": "85",
        "--speed-high-l": "58",
        "--speed-bg-l-offset": "23",
        "--speed-bg-s-offset": "15",
        "--accent-pink": "#db2777",
        "--volume-low-h": "340",
        "--volume-low-s": "92",
        "--volume-low-l": "50",
        "--volume-mid-h": "342",
        "--volume-mid-s": "90",
        "--volume-mid-l": "48",
        "--volume-high-h": "345",
        "--volume-high-s": "95",
        "--volume-high-l": "55",
        "--volume-bg-l-offset": "22",
        "--volume-bg-s-offset": "18"
      }
    }
  }
};

class ThemeManager {
  constructor() {
    this.currentTheme = "default";
    this.currentStyle = "auto";
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    this.onChangeCallbacks = [];
    this.mediaQuery.addEventListener("change", () => {
      if (this.currentStyle === "auto") {
        this.applyTheme();
        this.notifyChange();
      }
    });
  }
  getThemes() {
    return Object.values(THEMES).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      premium: t.premium
    }));
  }
  getCurrentTheme() {
    return {
      theme: this.currentTheme,
      style: this.currentStyle,
      effectiveStyle: this.getEffectiveStyle()
    };
  }
  getEffectiveStyle() {
    if (this.currentStyle === "auto") {
      return this.mediaQuery.matches ? "light" : "dark";
    }
    return this.currentStyle;
  }
  applyTheme(themeId = this.currentTheme, style = this.currentStyle) {
    const theme = THEMES[themeId];
    if (!theme) {
      console.warn(`Theme "${themeId}" not found, using default`);
      themeId = "default";
    }
    const effectiveStyle = style === "auto" ? this.mediaQuery.matches ? "light" : "dark" : style;
    const vars = THEMES[themeId].styles[effectiveStyle];
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }
    this.currentTheme = themeId;
    this.currentStyle = style;
    document.body.dataset.theme = themeId;
    document.body.dataset.themeStyle = effectiveStyle;
  }
  setStyle(style) {
    if (![ "light", "dark", "auto" ].includes(style)) {
      console.warn(`Invalid style "${style}"`);
      return;
    }
    this.currentStyle = style;
    this.applyTheme();
    this.savePreferences();
    this.notifyChange();
  }
  setTheme(themeId) {
    if (!THEMES[themeId]) {
      console.warn(`Theme "${themeId}" not found`);
      return;
    }
    this.currentTheme = themeId;
    this.applyTheme();
    this.savePreferences();
    this.notifyChange();
  }
  async savePreferences() {
    try {
      await chrome.storage.local.set({
        freePitch_theme: this.currentTheme,
        freePitch_themeStyle: this.currentStyle
      });
    } catch (e) {
      console.error("Error saving theme preferences:", e);
    }
  }
  async loadPreferences() {
    try {
      const data = await chrome.storage.local.get([ "freePitch_theme", "freePitch_themeStyle" ]);
      this.currentTheme = data.freePitch_theme || "default";
      this.currentStyle = data.freePitch_themeStyle || "auto";
      this.applyTheme();
    } catch (e) {
      console.error("Error loading theme preferences:", e);
      this.applyTheme();
    }
  }
  onChange(callback) {
    this.onChangeCallbacks.push(callback);
  }
  notifyChange() {
    const info = this.getCurrentTheme();
    this.onChangeCallbacks.forEach(cb => cb(info));
  }
  cycleStyle() {
    const styles = [ "auto", "light", "dark" ];
    const currentIndex = styles.indexOf(this.currentStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    this.setStyle(styles[nextIndex]);
    return styles[nextIndex];
  }
  getStyleDisplayName(style = this.currentStyle) {
    const names = {
      auto: "Auto",
      light: "Light",
      dark: "Dark"
    };
    return names[style] || style;
  }
  getStyleIcon(style = this.currentStyle) {
    const icons = {
      auto: "🌓",
      light: "☀️",
      dark: "🌙"
    };
    return icons[style] || "🎨";
  }
}

const themeManager = new ThemeManager;