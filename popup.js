const enabledToggle = document.getElementById("enabled-toggle");

const fineTuneToggle = document.getElementById("fine-tune-toggle");

const volumeGroup = document.getElementById("volume-group");

const pitchGroup = document.getElementById("pitch-group");

const speedGroup = document.getElementById("speed-group");

const reverbGroup = document.getElementById("reverb-group");

const pitcherArea = document.getElementById("pitcher-area");

const pitcherQuote = document.getElementById("pitcher-quote");

const pitcherCharacter = document.getElementById("pitcher-character");

const settingsBtn = document.getElementById("settings-btn");

const settingsDropdown = document.getElementById("settings-dropdown");

const themeSwitch = document.getElementById("theme-switch");

const themeIcon = document.getElementById("theme-icon");

const themeSwitchText = document.getElementById("theme-switch-text");

const autoThemeToggle = document.getElementById("auto-theme-toggle");

const settingsStatusDot = document.getElementById("settings-status-dot");

const settingsStatusText = document.getElementById("settings-status-text");

const madeByBtn = document.getElementById("made-by-btn");

let quotesData = null;

const slidersTab = document.getElementById("sliders-tab");

const shortcutsTab = document.getElementById("shortcuts-tab");

const slidersMode = document.getElementById("sliders-mode");

const shortcutsMode = document.getElementById("shortcuts-mode");

const modeSlider = document.getElementById("mode-slider");

const shortcutsGrid = document.querySelector(".shortcuts-grid");

const shortcutsContainer = document.getElementById("shortcuts-container");

const shortcutsStrip = document.getElementById("shortcuts-strip");

const shortcutsAddBtn = document.getElementById("shortcuts-add-btn");

const shortcutsCount = document.getElementById("shortcuts-count");

const shortcutsEditBtn = document.getElementById("shortcuts-edit-btn");

const shortcutsResetBtn = document.getElementById("shortcuts-reset-btn");

const shortcutsRestoreBtn = document.getElementById("shortcuts-restore-btn");

const moodEmoji = document.getElementById("mood-emoji");

const volumeSlider = document.getElementById("volume-slider");

const volumeFill = document.getElementById("volume-fill");

const volumeTextBase = document.getElementById("volume-text-base");

const volumeTextClip = document.getElementById("volume-text-clip");

const pitchSlider = document.getElementById("pitch-slider");

const pitchFill = document.getElementById("pitch-fill");

const pitchTextBase = document.getElementById("pitch-text-base");

const pitchTextClip = document.getElementById("pitch-text-clip");

const speedSlider = document.getElementById("speed-slider");

const speedFill = document.getElementById("speed-fill");

const speedTextBase = document.getElementById("speed-text-base");

const speedTextClip = document.getElementById("speed-text-clip");

const autoSpeedPitchToggle = document.getElementById("auto-speed-pitch-toggle");

const reverbToggle = document.getElementById("reverb-toggle");

const reverbSlider = document.getElementById("reverb-slider");

const reverbFill = document.getElementById("reverb-fill");

const reverbTextBase = document.getElementById("reverb-text-base");

const reverbTextClip = document.getElementById("reverb-text-clip");

const shortcutModal = document.getElementById("shortcut-modal");

const shortcutNameInput = document.getElementById("shortcut-name-input");

const emojiPicker = document.getElementById("emoji-picker");

const colorPicker = document.getElementById("color-picker");

const modalPitch = document.getElementById("modal-pitch");

const modalSpeed = document.getElementById("modal-speed");

const modalReverb = document.getElementById("modal-reverb");

const modalCancel = document.getElementById("modal-cancel");

const modalSave = document.getElementById("modal-save");

const notificationPill = document.getElementById("notification-pill");

const notificationPillText = document.getElementById("notification-pill-text");

const updateOverlay = document.getElementById("update-overlay");

const updateBannerText = document.getElementById("update-banner-text");

const updateBannerButton = document.getElementById("update-banner-button");

const updateModalClose = document.getElementById("update-modal-close");

const UPDATE_CHECK_URL = "https://api.github.com/repos/engix3/vibes-modded/releases/latest";

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1e3;

updateModalClose?.addEventListener("click", () => {
  if (updateOverlay) updateOverlay.hidden = true;
});

function compareVersions(left, right) {
  const parse = version => version.replace(/^v/i, "").split(".").map(part => parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  }
  return 0;
}

async function checkForUpdates() {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    const cached = await chrome.storage.local.get("vibes_update_check");
    let release = cached.vibes_update_check?.release;
    const checkedAt = cached.vibes_update_check?.checkedAt || 0;
    if (!release || Date.now() - checkedAt >= UPDATE_CHECK_INTERVAL) {
      const response = await fetch(UPDATE_CHECK_URL, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });
      if (!response.ok) return;
      release = await response.json();
      await chrome.storage.local.set({
        vibes_update_check: {
          checkedAt: Date.now(),
          release: {
            tag_name: release.tag_name,
            html_url: release.html_url,
            name: release.name
          }
        }
      });
    }
    const latestVersion = release.tag_name || "";
    if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0 || !updateOverlay) return;
    updateBannerText.textContent = `Доступна новая версия ${latestVersion}`;
    updateBannerButton.textContent = "Скачать";
    updateBannerButton.onclick = () => {
      chrome.tabs.create({
        url: release.html_url || "https://github.com/engix3/vibes-modded/releases"
      });
    };
    updateOverlay.hidden = false;
  } catch (error) {
    console.debug("Vibes: update check skipped", error);
  }
}

const pillSlidersToggle = document.getElementById("pill-sliders-toggle");

const volumePillGroup = document.getElementById("volume-pill-group");

const pitchPillGroup = document.getElementById("pitch-pill-group");

const speedPillGroup = document.getElementById("speed-pill-group");

const reverbPillGroup = document.getElementById("reverb-pill-group");

const volumePillSlider = document.getElementById("volume-pill-slider");

const volumePillFill = document.getElementById("volume-pill-fill");

const volumePillTextBase = document.getElementById("volume-pill-text-base");

const volumePillTextClip = document.getElementById("volume-pill-text-clip");

const pitchPillSlider = document.getElementById("pitch-pill-slider");

const pitchPillFill = document.getElementById("pitch-pill-fill");

const pitchPillTextBase = document.getElementById("pitch-pill-text-base");

const pitchPillTextClip = document.getElementById("pitch-pill-text-clip");

const speedPillSlider = document.getElementById("speed-pill-slider");

const speedPillFill = document.getElementById("speed-pill-fill");

const speedPillTextBase = document.getElementById("speed-pill-text-base");

const speedPillTextClip = document.getElementById("speed-pill-text-clip");

const reverbPillToggle = document.getElementById("reverb-pill-toggle");

const reverbPillSlider = document.getElementById("reverb-pill-slider");

const reverbPillFill = document.getElementById("reverb-pill-fill");

const reverbPillTextBase = document.getElementById("reverb-pill-text-base");

const reverbPillTextClip = document.getElementById("reverb-pill-text-clip");

const footerActionBtn = document.getElementById("footer-action-btn");

const footerActionIcon = document.getElementById("footer-action-icon");

const footerActionText = document.getElementById("footer-action-text");

if (!VIBES_PLUS_OR_DONATE_TOGGLE) {
  footerActionBtn?.classList.add("donate-mode");
  if (footerActionIcon) footerActionIcon.innerHTML = '<img src="resources/kofi.gif" alt="Ko-fi">';
  if (footerActionText) {
    footerActionText.setAttribute("data-lang", "footer.donate");
    footerActionText.textContent = "Donate";
  }
  footerActionBtn?.addEventListener("click", () => {
    window.open("https://ko-fi.com/klarz", "_blank");
  });
}

const STREAMING_PLATFORMS = {
  "soundcloud.com": {
    name: "SoundCloud",
    origins: [ "*://*.soundcloud.com/*" ]
  },
  "spotify.com": {
    name: "Spotify",
    origins: [ "*://*.spotify.com/*", "*://open.spotify.com/*" ]
  },
  "open.spotify.com": {
    name: "Spotify",
    origins: [ "*://*.spotify.com/*", "*://open.spotify.com/*" ]
  },
  "deezer.com": {
    name: "Deezer",
    origins: [ "*://*.deezer.com/*" ]
  },
  "tidal.com": {
    name: "Tidal",
    origins: [ "*://*.tidal.com/*" ]
  },
  "pandora.com": {
    name: "Pandora",
    origins: [ "*://*.pandora.com/*" ]
  },
  "music.amazon.com": {
    name: "Amazon Music",
    origins: [ "*://*.amazon.com/music/*", "*://music.amazon.com/*" ]
  },
  "music.apple.com": {
    name: "Apple Music",
    origins: [ "*://*.music.apple.com/*" ]
  },
  "vk.com": {
    name: "VK",
    origins: [ "*://*.vk.com/*", "*://vk.com/*" ]
  },
  "vk.ru": {
    name: "VK",
    origins: [ "*://*.vk.ru/*", "*://vk.ru/*" ]
  }
};

let currentTabId = null;

let currentMode = "sliders";

let activeShortcut = null;

let manualShortcutSelect = false;

let customShortcuts = {};

let selectedEmoji = "🎵";

let selectedColor = "0";

let shortcutModes = {
  pitch: "on",
  speed: "on",
  reverb: "on"
};

let editingShortcutKey = null;

let shortcutUsage = {};

let shortcutsCache = [];

let sessionSmartOrder = null;

let shortcutsEditMode = false;

let shortcutOrder = [];

let useSmartOrder = true;

const SHORTCUTS_COLD_START = [ "nightcore", "slowreverb", "slowed", "sped" ];

const ROLLING_DECAY_HALF_LIFE_DAYS = 7;

const DEFAULT_SHORTCUTS = {
  default: {
    name: "Default",
    emoji: "🔄",
    pitch: 0,
    pitchMode: "off",
    speed: 100,
    speedMode: "off",
    reverbEnabled: false,
    reverbAmount: 50,
    reverbMode: "off",
    undeletable: true
  },
  slowed: {
    name: "Slowed Down",
    emoji: "🐢",
    pitch: 0,
    pitchMode: "off",
    speed: 90,
    speedMode: "on",
    reverbEnabled: false,
    reverbAmount: 50,
    reverbMode: "off"
  },
  sped: {
    name: "Sped Up",
    emoji: "⚡",
    pitch: 0,
    pitchMode: "off",
    speed: 120,
    speedMode: "on",
    reverbEnabled: false,
    reverbAmount: 50,
    reverbMode: "off"
  },
  slowreverb: {
    name: "Slow & Reverb",
    emoji: "🌙",
    pitch: -2,
    pitchMode: "on",
    speed: 90,
    speedMode: "on",
    reverbEnabled: true,
    reverbAmount: 50,
    reverbMode: "on"
  },
  nightcore: {
    name: "Nightcore",
    emoji: "✨",
    pitch: 3,
    pitchMode: "on",
    speed: 120,
    speedMode: "on",
    reverbEnabled: false,
    reverbAmount: 50,
    reverbMode: "off"
  }
};

const MAX_CUSTOM_SHORTCUTS = 4;

const DEFAULT_SHORTCUT_LANG_KEYS = {
  default: "shortcuts.default",
  slowed: "shortcuts.slowedDown",
  sped: "shortcuts.spedUp",
  slowreverb: "shortcuts.slowReverb",
  nightcore: "shortcuts.nightcore"
};

function getShortcutName(key, shortcut) {
  if (DEFAULT_SHORTCUT_LANG_KEYS[key]) {
    return langpack.get(DEFAULT_SHORTCUT_LANG_KEYS[key]);
  }
  return shortcut.name;
}

let deletedDefaults = [];

function getAllShortcuts() {
  const defaults = {};
  for (const [key, shortcut] of Object.entries(DEFAULT_SHORTCUTS)) {
    if (!deletedDefaults.includes(key)) {
      defaults[key] = shortcut;
    }
  }
  return {
    ...defaults,
    ...customShortcuts
  };
}

let settings = {
  enabled: true,
  volume: 100,
  pitch: 0,
  speed: 100,
  fineTune: false,
  autoSpeedPitch: false,
  reverbEnabled: false,
  reverbAmount: 50,
  sliderStyle: "pill"
};

let notificationTimeout = null;

window.settings = settings;

window.volumeSlider = volumeSlider;

window.volumeFill = volumeFill;

window.volumeTextBase = volumeTextBase;

window.volumeTextClip = volumeTextClip;

window.pitchSlider = pitchSlider;

window.pitchFill = pitchFill;

window.pitchTextBase = pitchTextBase;

window.pitchTextClip = pitchTextClip;

window.speedSlider = speedSlider;

window.speedFill = speedFill;

window.speedTextBase = speedTextBase;

window.speedTextClip = speedTextClip;

window.autoSpeedPitchToggle = autoSpeedPitchToggle;

window.reverbToggle = reverbToggle;

window.reverbSlider = reverbSlider;

window.reverbFill = reverbFill;

window.reverbTextBase = reverbTextBase;

window.reverbTextClip = reverbTextClip;

window.pillSlidersToggle = pillSlidersToggle;

window.volumePillGroup = volumePillGroup;

window.pitchPillGroup = pitchPillGroup;

window.speedPillGroup = speedPillGroup;

window.reverbPillGroup = reverbPillGroup;

window.volumePillSlider = volumePillSlider;

window.volumePillFill = volumePillFill;

window.volumePillTextBase = volumePillTextBase;

window.volumePillTextClip = volumePillTextClip;

window.pitchPillSlider = pitchPillSlider;

window.pitchPillFill = pitchPillFill;

window.pitchPillTextBase = pitchPillTextBase;

window.pitchPillTextClip = pitchPillTextClip;

window.speedPillSlider = speedPillSlider;

window.speedPillFill = speedPillFill;

window.speedPillTextBase = speedPillTextBase;

window.speedPillTextClip = speedPillTextClip;

window.reverbPillToggle = reverbPillToggle;

window.reverbPillSlider = reverbPillSlider;

window.reverbPillFill = reverbPillFill;

window.reverbPillTextBase = reverbPillTextBase;

window.reverbPillTextClip = reverbPillTextClip;

window.fineTuneToggle = fineTuneToggle;

function speedToPosition(value) {
  const t = (value - 25) / 175;
  return t * (31 - 7 * t) / 24;
}

function positionToSpeed(position) {
  const discriminant = 961 - 672 * position;
  const t = (31 - Math.sqrt(Math.max(0, discriminant))) / 14;
  return 25 + 175 * t;
}

function volumeToPosition(value) {
  if (value <= 100) {
    return Math.sqrt(value / 400);
  }
  const c = 100 - value;
  const disc = 16e4 - 4800 * c;
  const t = (-400 + Math.sqrt(Math.max(0, disc))) / 2400;
  return t + .5;
}

function positionToVolume(position) {
  if (position <= .5) {
    return 400 * position * position;
  }
  const t = position - .5;
  return 1200 * t * t + 400 * t + 100;
}

function formatPitch(pitch) {
  if (pitch === 0) return "0";
  const sign = pitch > 0 ? "+" : "";
  if (settings.fineTune && !Number.isInteger(pitch)) {
    return sign + pitch.toFixed(2);
  }
  return sign + Math.round(pitch);
}

function formatSpeed(speed) {
  return Math.round(speed) + "%";
}

function getSpeedForPitch(pitch) {
  return Math.max(25, Math.min(200, Math.round(Math.pow(2, pitch / 12) * 100)));
}

function applyAutoSpeedForPitch() {
  if (!settings.autoSpeedPitch) return;
  settings.speed = getSpeedForPitch(settings.pitch);
}

function getEffectivePitch() {
  return settings.autoSpeedPitch ? 0 : settings.pitch;
}

window.applyAutoSpeedForPitch = applyAutoSpeedForPitch;

function formatVolume(volume) {
  return Math.round(volume) + "%";
}

function formatReverb(amount) {
  return Math.round(amount) + "%";
}

function getReverbColor(percent, darken = false) {
  const stops = [ {
    pos: 0,
    h: 30,
    s: 100,
    l: 55
  }, {
    pos: 25,
    h: 50,
    s: 100,
    l: 50
  }, {
    pos: 50,
    h: 110,
    s: 65,
    l: 48
  }, {
    pos: 75,
    h: 220,
    s: 80,
    l: 55
  }, {
    pos: 100,
    h: 280,
    s: 70,
    l: 45
  } ];
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (percent >= stops[i].pos && percent <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const t = range > 0 ? (percent - lower.pos) / range : 0;
  const h = lower.h + (upper.h - lower.h) * t;
  const s = lower.s + (upper.s - lower.s) * t;
  let l = lower.l + (upper.l - lower.l) * t;
  if (darken) {
    l = Math.max(32, l - 8);
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function getPitchColor(pitch, forBackground = false) {
  const percent = (pitch + 12) / 24 * 100;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const getVar = (name, fallback) => {
    const val = parseFloat(style.getPropertyValue(name));
    return isNaN(val) ? fallback : val;
  };
  const stops = [ {
    pos: 0,
    h: getVar("--pitch-low-h", 20),
    s: getVar("--pitch-low-s", 100),
    l: getVar("--pitch-low-l", 48)
  }, {
    pos: 50,
    h: getVar("--pitch-mid-h", 35),
    s: getVar("--pitch-mid-s", 98),
    l: getVar("--pitch-mid-l", 52)
  }, {
    pos: 100,
    h: getVar("--pitch-high-h", 45),
    s: getVar("--pitch-high-s", 96),
    l: getVar("--pitch-high-l", 56)
  } ];
  const bgLOffset = getVar("--pitch-bg-l-offset", -24);
  const bgSOffset = getVar("--pitch-bg-s-offset", 0);
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (percent >= stops[i].pos && percent <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const t = range > 0 ? (percent - lower.pos) / range : 0;
  const h = lower.h + (upper.h - lower.h) * t;
  let s = lower.s + (upper.s - lower.s) * t;
  let l = lower.l + (upper.l - lower.l) * t;
  if (forBackground) {
    s = Math.max(10, Math.min(100, s + bgSOffset));
    l = Math.max(15, Math.min(92, l + bgLOffset));
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function getSpeedColor(speed, forBackground = false) {
  const percent = (speed - 25) / 175 * 100;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const getVar = (name, fallback) => {
    const val = parseFloat(style.getPropertyValue(name));
    return isNaN(val) ? fallback : val;
  };
  const stops = [ {
    pos: 0,
    h: getVar("--speed-low-h", 210),
    s: getVar("--speed-low-s", 80),
    l: getVar("--speed-low-l", 35)
  }, {
    pos: 50,
    h: getVar("--speed-mid-h", 202),
    s: getVar("--speed-mid-s", 82),
    l: getVar("--speed-mid-l", 52)
  }, {
    pos: 100,
    h: getVar("--speed-high-h", 197),
    s: getVar("--speed-high-s", 78),
    l: getVar("--speed-high-l", 63)
  } ];
  const bgLOffset = getVar("--speed-bg-l-offset", -20);
  const bgSOffset = getVar("--speed-bg-s-offset", 0);
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (percent >= stops[i].pos && percent <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const t = range > 0 ? (percent - lower.pos) / range : 0;
  const h = lower.h + (upper.h - lower.h) * t;
  let s = lower.s + (upper.s - lower.s) * t;
  let l = lower.l + (upper.l - lower.l) * t;
  if (forBackground) {
    s = Math.max(10, Math.min(100, s + bgSOffset));
    l = Math.max(15, Math.min(92, l + bgLOffset));
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function getVolumeColor(volume, forBackground = false) {
  const percent = volume / 600 * 100;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const getVar = (name, fallback) => {
    const val = parseFloat(style.getPropertyValue(name));
    return isNaN(val) ? fallback : val;
  };
  const stops = [ {
    pos: 0,
    h: getVar("--volume-low-h", 330),
    s: getVar("--volume-low-s", 90),
    l: getVar("--volume-low-l", 35)
  }, {
    pos: 50,
    h: getVar("--volume-mid-h", 338),
    s: getVar("--volume-mid-s", 85),
    l: getVar("--volume-mid-l", 50)
  }, {
    pos: 100,
    h: getVar("--volume-high-h", 345),
    s: getVar("--volume-high-s", 80),
    l: getVar("--volume-high-l", 62)
  } ];
  const bgLOffset = getVar("--volume-bg-l-offset", -22);
  const bgSOffset = getVar("--volume-bg-s-offset", 0);
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (percent >= stops[i].pos && percent <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const t = range > 0 ? (percent - lower.pos) / range : 0;
  const h = lower.h + (upper.h - lower.h) * t;
  let s = lower.s + (upper.s - lower.s) * t;
  let l = lower.l + (upper.l - lower.l) * t;
  if (forBackground) {
    s = Math.max(10, Math.min(100, s + bgSOffset));
    l = Math.max(15, Math.min(92, l + bgLOffset));
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function updateMoodEmoji() {
  let emoji = "🎵";
  const allShortcuts = getAllShortcuts();
  if (activeShortcut && allShortcuts[activeShortcut]) {
    emoji = allShortcuts[activeShortcut].emoji;
  } else if (settings.pitch > 0 && settings.speed > 100) {
    emoji = "✨";
  } else if (settings.pitch < 0 && settings.speed < 100) {
    emoji = "🌙";
  } else if (settings.speed > 100) {
    emoji = "⚡";
  } else if (settings.speed < 100) {
    emoji = "🐢";
  } else if (settings.reverbEnabled) {
    emoji = "🎧";
  } else if (settings.pitch > 0) {
    emoji = "🎤";
  } else if (settings.pitch < 0) {
    emoji = "🎻";
  }
  moodEmoji.textContent = emoji;
}

function detectActiveShortcut() {
  const allShortcuts = getAllShortcuts();
  let bestMatch = null;
  let bestScore = -1;
  for (const [key, shortcut] of Object.entries(allShortcuts)) {
    const pitchMode = shortcut.pitchMode || "on";
    const speedMode = shortcut.speedMode || "on";
    const reverbMode = shortcut.reverbMode || "on";
    let pitchMatch = false;
    if (pitchMode === "on") {
      pitchMatch = settings.pitch === shortcut.pitch;
    } else if (pitchMode === "off") {
      pitchMatch = settings.pitch === 0;
    } else {
      pitchMatch = true;
    }
    let speedMatch = false;
    if (speedMode === "on") {
      speedMatch = settings.speed === shortcut.speed;
    } else if (speedMode === "off") {
      speedMatch = settings.speed === 100;
    } else {
      speedMatch = true;
    }
    let reverbMatch = false;
    if (reverbMode === "on") {
      reverbMatch = settings.reverbEnabled === shortcut.reverbEnabled && settings.reverbAmount === shortcut.reverbAmount;
    } else if (reverbMode === "off") {
      reverbMatch = settings.reverbEnabled === false;
    } else {
      reverbMatch = true;
    }
    if (pitchMatch && speedMatch && reverbMatch) {
      let score = 0;
      if (pitchMode !== "pass") score++;
      if (speedMode !== "pass") score++;
      if (reverbMode !== "pass") score++;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = key;
      }
    }
  }
  return bestMatch;
}

function updateShortcutSelection() {
  if (!manualShortcutSelect) {
    activeShortcut = detectActiveShortcut();
  }
  document.querySelectorAll(".shortcut-btn[data-shortcut]").forEach(btn => {
    const shortcut = btn.dataset.shortcut;
    btn.classList.toggle("active", shortcut === activeShortcut);
  });
  updateShortcutStripUI();
  updateMoodEmoji();
}

function applyShortcut(shortcutKey) {
  if (shortcutKey !== "default" && modesUI.shouldAutoSwitchForCors()) {
    modesUI.autoSwitchToTabCapture();
  }
  if (shortcutKey !== "default" && modesUI.shouldShowNoMediaPrompt()) {
    if (modesUI.isAlwaysTabEnabled() && modesUI._tabCaptureAvailable) {
      modesUI.autoSwitchToTabCapture();
    } else {
      setTimeout(() => modesUI.showModalForNoMedia(), 300);
    }
    return;
  }
  const allShortcuts = getAllShortcuts();
  const shortcut = allShortcuts[shortcutKey];
  if (!shortcut) return;
  const pitchMode = shortcut.pitchMode || "on";
  if (pitchMode === "on") {
    settings.pitch = shortcut.pitch;
  } else if (pitchMode === "off") {
    settings.pitch = 0;
  }
  if (!captureRouter.isSpeedDisabled()) {
    const speedMode = shortcut.speedMode || "on";
    if (settings.autoSpeedPitch && pitchMode !== "pass") {
      applyAutoSpeedForPitch();
    } else if (speedMode === "on") {
      settings.speed = shortcut.speed;
    } else if (speedMode === "off") {
      settings.speed = 100;
    }
  }
  const reverbMode = shortcut.reverbMode || "on";
  if (reverbMode === "on") {
    settings.reverbEnabled = shortcut.reverbEnabled;
    settings.reverbAmount = shortcut.reverbAmount;
  } else if (reverbMode === "off") {
    settings.reverbEnabled = false;
    settings.reverbAmount = 50;
  }
  manualShortcutSelect = true;
  activeShortcut = shortcutKey;
  updateUI();
  sendSettings();
  showNewQuote();
  manualShortcutSelect = false;
}

function setMode(mode, animate = true) {
  const previousMode = currentMode;
  currentMode = mode;
  if (mode === "shortcuts") {
    shortcutsTab.classList.add("active");
    slidersTab.classList.remove("active");
    shortcutsMode.classList.add("visible");
    slidersMode.classList.remove("visible");
    modeSlider.classList.remove("to-sliders");
  } else {
    slidersTab.classList.add("active");
    shortcutsTab.classList.remove("active");
    slidersMode.classList.add("visible");
    shortcutsMode.classList.remove("visible");
    modeSlider.classList.add("to-sliders");
  }
  if (animate && previousMode !== mode) {
    modeSlider.classList.add("animating");
    setTimeout(() => {
      modeSlider.classList.remove("animating");
    }, 150);
  }
  chrome.storage.local.set({
    freePitch_mode: mode
  });
}

async function loadMode() {
  const data = await chrome.storage.local.get("freePitch_mode");
  modeSlider.classList.add("no-transition");
  if (data.freePitch_mode) {
    setMode(data.freePitch_mode, false);
  } else {
    setMode("sliders", false);
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modeSlider.classList.remove("no-transition");
    });
  });
}

function updateShortcutsGridLayout() {
  const shortcutCount = shortcutsGrid.querySelectorAll(".shortcut-btn").length;
  shortcutsGrid.classList.remove("compact", "extra-compact");
  if (shortcutCount >= 10) {
    shortcutsGrid.classList.add("extra-compact");
  } else if (shortcutCount >= 7) {
    shortcutsGrid.classList.add("compact");
  }
}

async function loadCustomShortcuts() {
  const data = await chrome.storage.local.get([ "freePitch_customShortcuts", "freePitch_deletedDefaults", "freePitch_shortcutOrder", "freePitch_useSmartOrder" ]);
  customShortcuts = data.freePitch_customShortcuts || {};
  deletedDefaults = data.freePitch_deletedDefaults || [];
  shortcutOrder = data.freePitch_shortcutOrder || [];
  useSmartOrder = data.freePitch_useSmartOrder !== false;
  shortcutsRestoreBtn?.classList.toggle("active", useSmartOrder);
  updateAddButtonState();
}

async function saveCustomShortcuts() {
  await chrome.storage.local.set({
    freePitch_customShortcuts: customShortcuts,
    freePitch_deletedDefaults: deletedDefaults,
    freePitch_shortcutOrder: shortcutOrder,
    freePitch_useSmartOrder: useSmartOrder
  });
  updateAddButtonState();
}

async function loadShortcutUsage() {
  const data = await chrome.storage.local.get([ "freePitch_shortcutUsage", "freePitch_shortcutsCache" ]);
  shortcutUsage = data.freePitch_shortcutUsage || {};
  shortcutsCache = data.freePitch_shortcutsCache || [];
}

async function saveShortcutUsage() {
  await chrome.storage.local.set({
    freePitch_shortcutUsage: shortcutUsage,
    freePitch_shortcutsCache: shortcutsCache
  });
}

function recordShortcutUsage(shortcutKey) {
  const now = Date.now();
  if (!shortcutUsage[shortcutKey]) {
    shortcutUsage[shortcutKey] = {
      totalUses: 0,
      rollingScore: 0,
      lastUsedAt: 0,
      usageHistory: []
    };
  }
  const usage = shortcutUsage[shortcutKey];
  usage.totalUses++;
  usage.lastUsedAt = now;
  usage.usageHistory.push(now);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1e3;
  usage.usageHistory = usage.usageHistory.filter(t => t > thirtyDaysAgo);
  usage.rollingScore = calculateRollingScore(usage.usageHistory);
  saveShortcutUsage();
}

function calculateRollingScore(usageHistory) {
  const now = Date.now();
  const halfLifeMs = ROLLING_DECAY_HALF_LIFE_DAYS * 24 * 60 * 60 * 1e3;
  let score = 0;
  for (const timestamp of usageHistory) {
    const age = now - timestamp;
    const weight = Math.exp(-age / halfLifeMs);
    score += weight;
  }
  return score;
}

function calculateShortcuts() {
  const allShortcuts = getAllShortcuts();
  const shortcutKeys = Object.keys(allShortcuts);
  if (Object.keys(shortcutUsage).length === 0) {
    return SHORTCUTS_COLD_START.filter(key => allShortcuts[key]);
  }
  for (const key in shortcutUsage) {
    shortcutUsage[key].rollingScore = calculateRollingScore(shortcutUsage[key].usageHistory);
  }
  const picks = [];
  const usedKeys = new Set;
  const byRolling = shortcutKeys.filter(key => shortcutUsage[key]).sort((a, b) => (shortcutUsage[b]?.rollingScore || 0) - (shortcutUsage[a]?.rollingScore || 0));
  for (const key of byRolling.slice(0, 2)) {
    if (!usedKeys.has(key)) {
      picks.push(key);
      usedKeys.add(key);
    }
  }
  const byTotal = shortcutKeys.filter(key => shortcutUsage[key]).sort((a, b) => (shortcutUsage[b]?.totalUses || 0) - (shortcutUsage[a]?.totalUses || 0));
  for (const key of byTotal) {
    if (!usedKeys.has(key)) {
      picks.push(key);
      usedKeys.add(key);
      break;
    }
  }
  const byLastUsed = shortcutKeys.filter(key => shortcutUsage[key]).sort((a, b) => (shortcutUsage[b]?.lastUsedAt || 0) - (shortcutUsage[a]?.lastUsedAt || 0));
  for (const key of byLastUsed) {
    if (!usedKeys.has(key)) {
      picks.push(key);
      usedKeys.add(key);
      break;
    }
  }
  for (const key of SHORTCUTS_COLD_START) {
    if (picks.length >= 4) break;
    if (!usedKeys.has(key) && allShortcuts[key]) {
      picks.push(key);
      usedKeys.add(key);
    }
  }
  return picks.slice(0, 4);
}

function cacheSessionSmartOrder() {
  const allShortcuts = getAllShortcuts();
  const availableKeys = Object.keys(allShortcuts).filter(key => key !== "default");
  sessionSmartOrder = getAlgorithmicOrder(availableKeys);
}

function toggleShortcutsEditMode() {
  shortcutsEditMode = !shortcutsEditMode;
  shortcutsEditBtn?.classList.toggle("active", shortcutsEditMode);
  shortcutsStrip?.classList.toggle("edit-mode", shortcutsEditMode);
  shortcutsContainer?.classList.toggle("edit-mode", shortcutsEditMode);
  if (shortcutsEditMode && activeShortcut && activeShortcut !== "default") {
    applyShortcut("default");
  }
  renderShortcuts();
}

function toggleSmartOrder() {
  useSmartOrder = !useSmartOrder;
  shortcutsRestoreBtn?.classList.toggle("active", useSmartOrder);
  saveCustomShortcuts();
  renderShortcuts();
}

function getOrderedShortcutKeys() {
  const allShortcuts = getAllShortcuts();
  const availableKeys = Object.keys(allShortcuts).filter(key => key !== "default");
  if (useSmartOrder) {
    if (sessionSmartOrder) {
      const cached = sessionSmartOrder.filter(key => availableKeys.includes(key));
      const newKeys = availableKeys.filter(key => !sessionSmartOrder.includes(key));
      return [ ...cached, ...newKeys ];
    }
    return getAlgorithmicOrder(availableKeys);
  }
  if (shortcutOrder.length > 0) {
    const orderedKeys = shortcutOrder.filter(key => availableKeys.includes(key));
    const newKeys = availableKeys.filter(key => !shortcutOrder.includes(key));
    return [ ...orderedKeys, ...newKeys ];
  }
  return availableKeys;
}

function getAlgorithmicOrder(availableKeys) {
  if (Object.keys(shortcutUsage).length === 0) {
    return SHORTCUTS_COLD_START.filter(key => availableKeys.includes(key)).concat(availableKeys.filter(key => !SHORTCUTS_COLD_START.includes(key)));
  }
  const picks = [];
  const usedKeys = new Set;
  const byLastUsed = availableKeys.filter(key => shortcutUsage[key]?.lastUsedAt).sort((a, b) => (shortcutUsage[b]?.lastUsedAt || 0) - (shortcutUsage[a]?.lastUsedAt || 0));
  for (const key of byLastUsed.slice(0, 2)) {
    picks.push(key);
    usedKeys.add(key);
  }
  const byTotal = availableKeys.filter(key => shortcutUsage[key]?.totalUses).sort((a, b) => (shortcutUsage[b]?.totalUses || 0) - (shortcutUsage[a]?.totalUses || 0));
  for (const key of byTotal) {
    if (!usedKeys.has(key)) {
      picks.push(key);
      usedKeys.add(key);
    }
  }
  const noUsageKeys = availableKeys.filter(key => !usedKeys.has(key));
  const coldStartNoUsage = SHORTCUTS_COLD_START.filter(key => noUsageKeys.includes(key));
  const otherNoUsage = noUsageKeys.filter(key => !SHORTCUTS_COLD_START.includes(key));
  picks.push(...coldStartNoUsage, ...otherNoUsage);
  return picks;
}

function renderShortcuts() {
  if (!shortcutsStrip) return;
  const allShortcuts = getAllShortcuts();
  shortcutsStrip.innerHTML = "";
  const orderedKeys = getOrderedShortcutKeys();
  orderedKeys.forEach(key => {
    const shortcut = allShortcuts[key];
    if (!shortcut) return;
    const btn = createShortcutButton(key, shortcut);
    shortcutsStrip.appendChild(btn);
  });
  updateShortcutSelection();
  setTimeout(updateShortcutsFade, 10);
}

let lastShortcutClickTime = 0;

function createShortcutButton(key, shortcut) {
  const btn = document.createElement("button");
  btn.className = "shortcut-btn";
  btn.dataset.shortcut = key;
  const color = shortcut.color || "0";
  if (color === "0") {
    btn.style.setProperty("--shortcut-color", "var(--shortcut-default)");
  } else {
    btn.style.setProperty("--shortcut-color", `var(--shortcut-${color})`);
  }
  const isCustom = key.startsWith("custom_");
  const isDefault = DEFAULT_SHORTCUTS[key] !== undefined;
  let editModeHTML = "";
  if (shortcutsEditMode) {
    if (isCustom) {
      editModeHTML = `\n        <span class="shortcut-delete" data-key="${key}">×</span>\n        <span class="shortcut-editable">✎</span>\n      `;
    } else if (isDefault) {
      editModeHTML = `\n        <span class="shortcut-hide" data-key="${key}">👁</span>\n      `;
    }
  }
  btn.innerHTML = `\n    <span class="shortcut-icon">${shortcut.emoji}</span>\n    <span class="shortcut-name">${getShortcutName(key, shortcut)}</span>\n    ${editModeHTML}\n  `;
  const deleteBtn = btn.querySelector(".shortcut-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      deleteCustomShortcut(key);
    });
  }
  const hideBtn = btn.querySelector(".shortcut-hide");
  if (hideBtn) {
    hideBtn.addEventListener("click", e => {
      e.stopPropagation();
      hideDefaultShortcut(key);
    });
  }
  btn.addEventListener("click", () => {
    if (shortcutsEditMode) {
      if (isCustom) {
        openShortcutModal(key);
      }
      return;
    }
    const now = Date.now();
    if (now - lastShortcutClickTime < 50) return;
    lastShortcutClickTime = now;
    if (activeShortcut === key) {
      applyShortcut("default");
      return;
    }
    recordShortcutUsage(key);
    applyShortcut(key);
  });
  return btn;
}

function updateShortcutStripUI() {
  if (!shortcutsStrip) return;
  const buttons = shortcutsStrip.querySelectorAll(".shortcut-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.shortcut === activeShortcut);
  });
  const hasActiveShortcut = activeShortcut && activeShortcut !== "default";
  shortcutsStrip.classList.toggle("has-selection", hasActiveShortcut);
  scrollToActiveShortcut();
  setTimeout(updateShortcutsFade, 400);
}

function scrollToActiveShortcut() {
  if (!shortcutsStrip) return;
  const activeBtn = shortcutsStrip.querySelector(".shortcut-btn.active");
  if (!activeBtn) return;
  setTimeout(() => {
    const btnLeft = activeBtn.offsetLeft;
    const visibleWidth = shortcutsStrip.clientWidth;
    const fadeZone = visibleWidth * .15;
    const safeMargin = fadeZone + 8;
    const scrollTo = btnLeft - safeMargin;
    shortcutsStrip.scrollTo({
      left: Math.max(0, scrollTo),
      behavior: "smooth"
    });
  }, 370);
}

function updateShortcutsFade() {
  const wrapper = document.getElementById("shortcuts-strip-wrapper");
  if (!shortcutsStrip || !wrapper) return;
  const scrollLeft = shortcutsStrip.scrollLeft;
  const scrollWidth = shortcutsStrip.scrollWidth;
  const clientWidth = shortcutsStrip.clientWidth;
  const maxScroll = scrollWidth - clientWidth;
  wrapper.classList.remove("fade-both", "fade-left", "fade-none");
  if (maxScroll <= 0) {
    wrapper.classList.add("fade-none");
  } else if (scrollLeft <= 2) {} else if (scrollLeft >= maxScroll - 2) {
    wrapper.classList.add("fade-left");
  } else {
    wrapper.classList.add("fade-both");
  }
}

function setupShortcutsDragScroll() {
  if (!shortcutsStrip) return;
  updateShortcutsFade();
  shortcutsStrip.addEventListener("scroll", updateShortcutsFade);
  let isDown = false;
  let isDragging = false;
  let startX;
  let scrollLeft;
  let clickedBtn = null;
  let currentRubber = null;
  const applyRubberBand = direction => {
    if (currentRubber === direction) return;
    shortcutsStrip.classList.remove("rubber-left", "rubber-right", "rubber-snap");
    if (direction) {
      shortcutsStrip.classList.add(direction === "left" ? "rubber-left" : "rubber-right");
    }
    currentRubber = direction;
  };
  const releaseRubberBand = () => {
    if (!currentRubber) return;
    shortcutsStrip.classList.add("rubber-snap");
    shortcutsStrip.classList.remove("rubber-left", "rubber-right");
    currentRubber = null;
    setTimeout(() => {
      shortcutsStrip.classList.remove("rubber-snap");
    }, 200);
  };
  shortcutsStrip.addEventListener("mousedown", e => {
    if (shortcutsEditMode) return;
    isDown = true;
    isDragging = false;
    clickedBtn = e.target.closest(".shortcut-btn");
    startX = e.pageX;
    scrollLeft = shortcutsStrip.scrollLeft;
    e.preventDefault();
  });
  document.addEventListener("mousemove", e => {
    if (!isDown) return;
    const diff = Math.abs(e.pageX - startX);
    if (diff > 5) {
      isDragging = true;
      shortcutsStrip.classList.add("dragging");
    }
    if (isDragging) {
      const walk = e.pageX - startX;
      const targetScroll = scrollLeft - walk;
      const maxScroll = shortcutsStrip.scrollWidth - shortcutsStrip.clientWidth;
      if (targetScroll < 0) {
        applyRubberBand("left");
      } else if (targetScroll > maxScroll) {
        applyRubberBand("right");
      } else {
        applyRubberBand(null);
      }
      shortcutsStrip.scrollLeft = targetScroll;
    }
  });
  document.addEventListener("mouseup", () => {
    if (isDown && !isDragging && clickedBtn) {
      clickedBtn.click();
    }
    releaseRubberBand();
    isDown = false;
    isDragging = false;
    clickedBtn = null;
    shortcutsStrip.classList.remove("dragging");
  });
  let touchStartX;
  let touchScrollLeft;
  let touchIsDragging = false;
  let touchedBtn = null;
  shortcutsStrip.addEventListener("touchstart", e => {
    if (shortcutsEditMode) return;
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = shortcutsStrip.scrollLeft;
    touchIsDragging = false;
    touchedBtn = e.target.closest(".shortcut-btn");
  }, {
    passive: true
  });
  shortcutsStrip.addEventListener("touchmove", e => {
    const diff = Math.abs(e.touches[0].pageX - touchStartX);
    if (diff > 5) {
      touchIsDragging = true;
    }
    if (touchIsDragging) {
      const walk = e.touches[0].pageX - touchStartX;
      const targetScroll = touchScrollLeft - walk;
      const maxScroll = shortcutsStrip.scrollWidth - shortcutsStrip.clientWidth;
      if (targetScroll < 0) {
        applyRubberBand("left");
      } else if (targetScroll > maxScroll) {
        applyRubberBand("right");
      } else {
        applyRubberBand(null);
      }
      shortcutsStrip.scrollLeft = targetScroll;
    }
  }, {
    passive: true
  });
  shortcutsStrip.addEventListener("touchend", () => {
    if (!touchIsDragging && touchedBtn) {
      touchedBtn.click();
    }
    releaseRubberBand();
    touchIsDragging = false;
    touchedBtn = null;
  }, {
    passive: true
  });
}

function setupEditModeDragReorder() {
  if (!shortcutsStrip) return;
  let draggedBtn = null;
  let dragGhost = null;
  let dragStartX = 0;
  let dragOffsetX = 0;
  let autoScrollInterval = null;
  let placeholder = null;
  const EDGE_SCROLL_ZONE = 40;
  const SCROLL_SPEED = 5;
  function createGhost(btn, x, y) {
    dragGhost = btn.cloneNode(true);
    dragGhost.classList.add("drag-ghost");
    dragGhost.style.position = "fixed";
    dragGhost.style.pointerEvents = "none";
    dragGhost.style.zIndex = "1000";
    dragGhost.style.opacity = "0.8";
    dragGhost.style.transform = "scale(1.05)";
    document.body.appendChild(dragGhost);
    updateGhostPosition(x, y);
  }
  function updateGhostPosition(x, y) {
    if (!dragGhost) return;
    dragGhost.style.left = x - dragOffsetX + "px";
    dragGhost.style.top = y - 16 + "px";
  }
  function removeGhost() {
    if (dragGhost) {
      dragGhost.remove();
      dragGhost = null;
    }
  }
  function createPlaceholder(btn) {
    placeholder = document.createElement("div");
    placeholder.className = "shortcut-placeholder";
    placeholder.style.width = btn.offsetWidth + "px";
    placeholder.style.height = btn.offsetHeight + "px";
    btn.parentNode.insertBefore(placeholder, btn);
  }
  function removePlaceholder() {
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }
  }
  function startAutoScroll(direction) {
    if (autoScrollInterval) return;
    autoScrollInterval = setInterval(() => {
      shortcutsStrip.scrollLeft += direction * SCROLL_SPEED;
    }, 16);
  }
  function stopAutoScroll() {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }
  function getDropIndex(x) {
    const buttons = Array.from(shortcutsStrip.querySelectorAll(".shortcut-btn:not(.dragging-source)"));
    const stripRect = shortcutsStrip.getBoundingClientRect();
    const relativeX = x - stripRect.left + shortcutsStrip.scrollLeft;
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      if (relativeX < btnCenter) {
        return i;
      }
    }
    return buttons.length;
  }
  function updatePlaceholderPosition(x) {
    if (!placeholder || !draggedBtn) return;
    const dropIndex = getDropIndex(x);
    const buttons = Array.from(shortcutsStrip.querySelectorAll(".shortcut-btn:not(.dragging-source)"));
    if (dropIndex >= buttons.length) {
      shortcutsStrip.appendChild(placeholder);
    } else {
      shortcutsStrip.insertBefore(placeholder, buttons[dropIndex]);
    }
  }
  shortcutsStrip.addEventListener("mousedown", e => {
    if (!shortcutsEditMode) return;
    const btn = e.target.closest(".shortcut-btn");
    if (!btn || e.target.closest(".shortcut-delete") || e.target.closest(".shortcut-hide")) return;
    e.preventDefault();
    draggedBtn = btn;
    dragStartX = e.clientX;
    const btnRect = btn.getBoundingClientRect();
    dragOffsetX = e.clientX - btnRect.left;
  });
  document.addEventListener("mousemove", e => {
    if (!draggedBtn || !shortcutsEditMode) return;
    if (!dragGhost && Math.abs(e.clientX - dragStartX) > 5) {
      createGhost(draggedBtn, e.clientX, e.clientY);
      createPlaceholder(draggedBtn);
      draggedBtn.classList.add("dragging-source");
    }
    if (dragGhost) {
      updateGhostPosition(e.clientX, e.clientY);
      updatePlaceholderPosition(e.clientX);
      const stripRect = shortcutsStrip.getBoundingClientRect();
      if (e.clientX < stripRect.left + EDGE_SCROLL_ZONE) {
        startAutoScroll(-1);
      } else if (e.clientX > stripRect.right - EDGE_SCROLL_ZONE) {
        startAutoScroll(1);
      } else {
        stopAutoScroll();
      }
    }
  });
  document.addEventListener("mouseup", () => {
    if (!draggedBtn || !shortcutsEditMode) return;
    stopAutoScroll();
    if (dragGhost) {
      const newOrder = Array.from(shortcutsStrip.querySelectorAll(".shortcut-btn:not(.dragging-source), .shortcut-placeholder")).map(el => {
        if (el.classList.contains("shortcut-placeholder")) {
          return draggedBtn.dataset.shortcut;
        }
        return el.dataset.shortcut;
      });
      shortcutOrder = newOrder;
      if (useSmartOrder) {
        useSmartOrder = false;
        shortcutsRestoreBtn?.classList.remove("active");
      }
      saveCustomShortcuts();
      removeGhost();
      removePlaceholder();
      draggedBtn.classList.remove("dragging-source");
      renderShortcuts();
    }
    draggedBtn = null;
  });
}

function renderShortcutsGrid() {
  const existingBtns = shortcutsGrid.querySelectorAll(".shortcut-btn:not(.add-shortcut)");
  existingBtns.forEach(btn => btn.remove());
  const addBtn = document.getElementById("add-shortcut-btn");
  const allShortcuts = getAllShortcuts();
  const totalCount = Object.keys(allShortcuts).length + 1;
  const canDeleteDefaults = totalCount > 5;
  for (const [key, shortcut] of Object.entries(DEFAULT_SHORTCUTS)) {
    if (!deletedDefaults.includes(key)) {
      const btn = createShortcutGridButton(key, shortcut, false, canDeleteDefaults);
      shortcutsGrid.insertBefore(btn, addBtn);
    }
  }
  for (const [key, shortcut] of Object.entries(customShortcuts)) {
    const btn = createShortcutGridButton(key, shortcut, true, true);
    shortcutsGrid.insertBefore(btn, addBtn);
  }
  updateShortcutsGridLayout();
  updateShortcutSelection();
  renderShortcuts();
}

function createShortcutGridButton(key, shortcut, isCustom, canDelete = true) {
  const isUndeletable = shortcut.undeletable === true;
  const showDelete = canDelete && !isUndeletable;
  const btn = document.createElement("button");
  btn.className = "shortcut-btn" + (isCustom ? " custom" : "") + (showDelete ? " deletable" : "");
  btn.dataset.shortcut = key;
  btn.innerHTML = `\n    <span class="shortcut-icon">${shortcut.emoji}</span>\n    <span class="shortcut-name">${getShortcutName(key, shortcut)}</span>\n    ${showDelete ? '<button class="shortcut-delete" data-key="' + key + '" data-custom="' + isCustom + '">×</button>' : ""}\n  `;
  btn.addEventListener("click", e => {
    if (e.target.classList.contains("shortcut-delete")) return;
    applyShortcut(key);
  });
  if (showDelete) {
    const deleteBtn = btn.querySelector(".shortcut-delete");
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (isCustom) {
        deleteCustomShortcut(key);
      } else {
        deleteDefaultShortcut(key);
      }
    });
  }
  return btn;
}

function deleteCustomShortcut(key) {
  const shortcut = customShortcuts[key];
  const name = shortcut ? getShortcutName(key, shortcut) : key;
  const msg = langpack.get("modal.confirmDelete", {
    name: name
  });
  if (confirm(msg)) {
    delete customShortcuts[key];
    saveCustomShortcuts();
    renderShortcuts();
    renderShortcutsGrid();
  }
}

function hideDefaultShortcut(key) {
  const shortcut = DEFAULT_SHORTCUTS[key];
  const name = shortcut ? getShortcutName(key, shortcut) : key;
  const msg = langpack.get("modal.confirmHideDefault", {
    name: name
  });
  if (confirm(msg)) {
    deletedDefaults.push(key);
    saveCustomShortcuts();
    renderShortcuts();
    renderShortcutsGrid();
  }
}

const deleteDefaultShortcut = hideDefaultShortcut;

function currentSettingsMatchExisting() {
  const allShortcuts = getAllShortcuts();
  for (const [key, shortcut] of Object.entries(allShortcuts)) {
    const pitchMatch = settings.pitch === shortcut.pitch;
    const speedMatch = settings.speed === shortcut.speed;
    const reverbMatch = settings.reverbEnabled === shortcut.reverbEnabled && settings.reverbAmount === shortcut.reverbAmount;
    if (pitchMatch && speedMatch && reverbMatch) {
      return getShortcutName(key, shortcut);
    }
  }
  return null;
}

async function updateAddButtonState() {
  const allShortcuts = getAllShortcuts();
  const customCount = Object.keys(customShortcuts).length;
  const visibleDefaults = Object.keys(DEFAULT_SHORTCUTS).filter(k => k !== "default" && !deletedDefaults.includes(k)).length;
  const totalVisible = visibleDefaults + customCount;
  const isPro = await (vibesPremium?.isPro?.()) || false;
  const maxCustom = isPro ? Infinity : MAX_CUSTOM_SHORTCUTS;
  const maxVisible = visibleDefaults + (isPro ? customCount : MAX_CUSTOM_SHORTCUTS);
  const atLimit = !isPro && customCount >= MAX_CUSTOM_SHORTCUTS;
  const matchesExisting = currentSettingsMatchExisting();
  const shouldDisable = atLimit || matchesExisting;
  if (shortcutsCount) {
    shortcutsCount.textContent = isPro ? `${totalVisible}/∞` : `${totalVisible}/${maxVisible}`;
    const hasHiddenDefaults = deletedDefaults.length > 0;
    shortcutsCount.classList.toggle("has-hidden", hasHiddenDefaults);
    shortcutsCount.title = hasHiddenDefaults ? `Click to restore ${deletedDefaults.length} hidden shortcut(s)` : isPro ? `${totalVisible} shortcuts (Pro: unlimited)` : `${totalVisible} of ${maxVisible} shortcuts`;
  }
  shortcutsAddBtn?.classList.toggle("disabled", shouldDisable);
  if (shortcutsAddBtn) {
    if (atLimit) {
      shortcutsAddBtn.title = `Maximum ${MAX_CUSTOM_SHORTCUTS} custom shortcuts (upgrade to Pro for unlimited)`;
    } else if (matchesExisting) {
      shortcutsAddBtn.title = `Settings match "${matchesExisting}"`;
    } else {
      shortcutsAddBtn.title = "New Shortcut";
    }
  }
  const gridAddBtn = document.getElementById("add-shortcut-btn");
  gridAddBtn?.classList.toggle("disabled", shouldDisable);
}

async function openShortcutModal(shortcutKeyToEdit = null) {
  if (!shortcutKeyToEdit) {
    const isPro = await (vibesPremium?.isPro?.()) || false;
    const atLimit = Object.keys(customShortcuts).length >= MAX_CUSTOM_SHORTCUTS;
    if (atLimit && !isPro) {
      premiumUI?.showModal?.();
      return;
    }
    if (currentSettingsMatchExisting()) return;
  }
  const modalTitle = document.getElementById("modal-title");
  editingShortcutKey = shortcutKeyToEdit;
  if (shortcutKeyToEdit && customShortcuts[shortcutKeyToEdit]) {
    const shortcut = customShortcuts[shortcutKeyToEdit];
    modalTitle.textContent = langpack.get("modal.editShortcut");
    shortcutNameInput.value = shortcut.name || "";
    selectedEmoji = shortcut.emoji || "🎵";
    selectedColor = shortcut.color || "0";
    shortcutModes = {
      pitch: shortcut.pitchMode || "on",
      speed: shortcut.speedMode || "on",
      reverb: shortcut.reverbMode || "on"
    };
    modalPitch.textContent = formatPitch(shortcut.pitch);
    modalSpeed.textContent = formatSpeed(shortcut.speed);
    modalReverb.textContent = shortcut.reverbEnabled ? formatReverb(shortcut.reverbAmount) : langpack.get("status.off");
  } else {
    modalTitle.textContent = langpack.get("modal.createShortcut");
    shortcutNameInput.value = "";
    selectedEmoji = "🎵";
    selectedColor = "0";
    shortcutModes = {
      pitch: "on",
      speed: "on",
      reverb: "on"
    };
    modalPitch.textContent = formatPitch(settings.pitch);
    modalSpeed.textContent = formatSpeed(settings.speed);
    modalReverb.textContent = settings.reverbEnabled ? formatReverb(settings.reverbAmount) : langpack.get("status.off");
  }
  emojiPicker.querySelectorAll(".emoji-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.emoji === selectedEmoji);
  });
  colorPicker?.querySelectorAll(".color-option").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === selectedColor);
  });
  document.querySelectorAll(".triple-toggle").forEach(toggle => {
    const setting = toggle.dataset.setting;
    toggle.querySelectorAll(".triple-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === shortcutModes[setting]);
    });
  });
  updateModalValidation();
  shortcutModal.classList.add("visible");
  shortcutNameInput.focus();
}

function updateModalValidation() {
  const hasOneSetting = shortcutModes.pitch === "on" || shortcutModes.speed === "on" || shortcutModes.reverb === "on";
  const isEditing = editingShortcutKey && customShortcuts[editingShortcutKey];
  const isDefault = isEditing ? false : isDefaultSettings();
  const duplicateName = isEditing ? null : isDuplicateShortcut();
  const canSave = !isDefault && !duplicateName && hasOneSetting;
  modalSave.disabled = !canSave;
  let warningEl = shortcutModal.querySelector(".modal-warning");
  if (!warningEl) {
    warningEl = document.createElement("div");
    warningEl.className = "modal-warning";
    shortcutModal.querySelector(".modal-settings-toggles").after(warningEl);
  }
  if (!hasOneSetting) {
    warningEl.textContent = "⚠️ At least one setting must be set to Apply (✓)";
    warningEl.style.display = "block";
  } else if (isDefault) {
    warningEl.textContent = "⚠️ Adjust sliders first - cannot save default settings";
    warningEl.style.display = "block";
  } else if (duplicateName) {
    warningEl.textContent = `⚠️ Already exists as "${duplicateName}"`;
    warningEl.style.display = "block";
  } else {
    warningEl.style.display = "none";
  }
}

function closeShortcutModal() {
  shortcutModal.classList.remove("visible");
  editingShortcutKey = null;
}

function isDefaultSettings() {
  const pitchDefault = shortcutModes.pitch !== "on" || settings.pitch === 0;
  const speedDefault = shortcutModes.speed !== "on" || settings.speed === 100;
  const reverbDefault = shortcutModes.reverb !== "on" || !settings.reverbEnabled && settings.reverbAmount === 50;
  const allOnAreDefault = pitchDefault && speedDefault && reverbDefault;
  const hasNonDefaultOn = shortcutModes.pitch === "on" && settings.pitch !== 0 || shortcutModes.speed === "on" && settings.speed !== 100 || shortcutModes.reverb === "on" && (settings.reverbEnabled || settings.reverbAmount !== 50);
  return !hasNonDefaultOn;
}

function isDuplicateShortcut() {
  const allShortcuts = getAllShortcuts();
  for (const [key, shortcut] of Object.entries(allShortcuts)) {
    const pitchMatch = shortcutModes.pitch === (shortcut.pitchMode || "on") && (shortcutModes.pitch !== "on" || settings.pitch === shortcut.pitch);
    const speedMatch = shortcutModes.speed === (shortcut.speedMode || "on") && (shortcutModes.speed !== "on" || settings.speed === shortcut.speed);
    const reverbMatch = shortcutModes.reverb === (shortcut.reverbMode || "on") && (shortcutModes.reverb !== "on" || settings.reverbEnabled === shortcut.reverbEnabled && settings.reverbAmount === shortcut.reverbAmount);
    if (pitchMatch && speedMatch && reverbMatch) {
      return getShortcutName(key, shortcut);
    }
  }
  return null;
}

function saveNewShortcut() {
  const name = shortcutNameInput.value.trim();
  if (!name) {
    shortcutNameInput.focus();
    return;
  }
  const hasOneSetting = shortcutModes.pitch === "on" || shortcutModes.speed === "on" || shortcutModes.reverb === "on";
  if (!hasOneSetting) {
    return;
  }
  if (editingShortcutKey && customShortcuts[editingShortcutKey]) {
    const existingShortcut = customShortcuts[editingShortcutKey];
    customShortcuts[editingShortcutKey] = {
      ...existingShortcut,
      name: name,
      emoji: selectedEmoji,
      color: selectedColor,
      pitchMode: shortcutModes.pitch,
      speedMode: shortcutModes.speed,
      reverbMode: shortcutModes.reverb
    };
  } else {
    if (isDefaultSettings()) {
      return;
    }
    const duplicateName = isDuplicateShortcut();
    if (duplicateName) {
      return;
    }
    const key = "custom_" + Date.now();
    customShortcuts[key] = {
      name: name,
      emoji: selectedEmoji,
      color: selectedColor,
      pitch: settings.pitch,
      pitchMode: shortcutModes.pitch,
      speed: settings.speed,
      speedMode: shortcutModes.speed,
      reverbEnabled: settings.reverbEnabled,
      reverbAmount: settings.reverbAmount,
      reverbMode: shortcutModes.reverb
    };
  }
  saveCustomShortcuts();
  renderShortcutsGrid();
  renderShortcuts();
  closeShortcutModal();
  editingShortcutKey = null;
}

function updateUI() {
  enabledToggle.checked = settings.enabled;
  fineTuneToggle.checked = settings.fineTune;
  volumeGroup.classList.toggle("active", settings.enabled);
  pitchGroup.classList.toggle("active", settings.enabled);
  speedGroup.classList.toggle("active", settings.enabled);
  reverbGroup.classList.toggle("active", settings.enabled);
  updateVolumeSlider();
  updatePitchSlider();
  updateSpeedSlider();
  updateReverbSlider();
  updateShortcutSelection();
  updateAddButtonState();
  if (autoSpeedPitchToggle) autoSpeedPitchToggle.checked = settings.autoSpeedPitch;
  if (settings.sliderStyle === "pill") {
    updatePillSliders();
    syncPillButtonActivatedState();
  }
}

function getStorageKey() {
  return `freePitch_tab_${currentTabId}`;
}

async function saveSettings() {
  if (!currentTabId) return;
  const key = getStorageKey();
  await chrome.storage.local.set({
    [key]: {
      enabled: settings.enabled,
      volume: settings.volume,
      pitch: settings.pitch,
      speed: settings.speed,
      fineTune: settings.fineTune,
      reverbEnabled: settings.reverbEnabled,
      reverbAmount: settings.reverbAmount,
      vinylPitchMode: settings.autoSpeedPitch,
      corsTabCapture: settings.corsTabCapture || false
    }
  });
}

async function loadSettings() {
  if (!currentTabId) return;
  const key = getStorageKey();
  const data = await chrome.storage.local.get(key);
  if (data[key]) {
    const s = data[key];
    settings.enabled = s.enabled ?? true;
    settings.volume = s.volume ?? 100;
    settings.pitch = s.pitch ?? 0;
    settings.speed = s.speed ?? 100;
    settings.fineTune = s.fineTune ?? false;
    settings.reverbEnabled = s.reverbEnabled ?? false;
    settings.reverbAmount = s.reverbAmount ?? 50;
    settings.corsTabCapture = s.corsTabCapture ?? false;
  } else {
    settings.enabled = true;
    settings.volume = 100;
    settings.pitch = 0;
    settings.speed = 100;
    settings.fineTune = false;
    settings.reverbEnabled = false;
    settings.reverbAmount = 50;
    settings.corsTabCapture = false;
  }
}

async function sendSettings() {
  if (!currentTabId) return;
  try {
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
      await chrome.runtime.sendMessage({
        type: "UPDATE_TAB_CAPTURE_SETTINGS",
        tabId: currentTabId,
        settings: {
          enabled: settings.enabled,
          volume: settings.volume / 100,
          pitch: getEffectivePitch(),
          speed: settings.speed / 100,
          vinylPitchMode: settings.autoSpeedPitch,
          reverbEnabled: settings.reverbEnabled,
          reverbAmount: settings.reverbAmount
        }
      });
      const hasMedia = captureRouter._defaultMediaCount > 0 || captureRouter._fastMediaCount > 0;
      if (captureRouter.isYouTube() || hasMedia) {
        try {
          await chrome.tabs.sendMessage(currentTabId, {
            type: "UPDATE_SETTINGS",
            enabled: true,
            volume: 1,
            pitch: 0,
            speed: settings.speed / 100,
            vinylPitchMode: settings.autoSpeedPitch,
            reverbEnabled: false,
            reverbAmount: 0
          });
        } catch (e) {}
      }
    } else {
      const response = await chrome.tabs.sendMessage(currentTabId, {
        type: "UPDATE_SETTINGS",
        enabled: settings.enabled,
        volume: settings.volume / 100,
        pitch: getEffectivePitch(),
        speed: settings.speed / 100,
        vinylPitchMode: settings.autoSpeedPitch,
        reverbEnabled: settings.reverbEnabled,
        reverbAmount: settings.reverbAmount
      });
      if (response?.success) {
        const count = response.mediaCount || 0;
        const fastCount = response.fastMediaCount || 0;
        modesUI.setMediaCount(count, fastCount);
        modesUI.updateModesButton();
        captureRouter.updateCorsStatus(response.fastSpeedOnlyCount || 0, response.fastFullCount || 0);
        updateSettingsStatus(captureRouter.getActiveMediaCount());
        if (response.limitations?.length > 0 && !tabCaptureUI.dismissed) {
          modesUI.showModalForLimitations();
        }
      }
    }
    chrome.runtime.sendMessage({
      type: "UPDATE_BADGE",
      tabId: currentTabId,
      pitch: settings.pitch,
      enabled: settings.enabled
    });
  } catch (e) {
    console.error("Error sending settings:", e);
    updateSettingsStatus(0);
  }
  saveSettings();
}

function updateSpeedSliderState() {
  const isSpeedDisabled = captureRouter.isSpeedDisabled();
  if (isSpeedDisabled && settings.speed !== 100) {
    settings.speed = 100;
    updateSpeedSlider();
    if (settings.sliderStyle === "pill") {
      updatePillSpeedSlider();
    }
  }
  updateSpeedSliderDisabled(isSpeedDisabled);
  updatePillSpeedSliderDisabled(isSpeedDisabled);
}

tabCaptureUI.onEnabled(async () => {
  updateSpeedSliderState();
  const hasMedia = captureRouter._defaultMediaCount > 0 || captureRouter._fastMediaCount > 0;
  const canUseSpeed = captureRouter.isYouTube() || hasMedia;
  const speedValue = canUseSpeed ? settings.speed / 100 : 1;
  try {
    await chrome.tabs.sendMessage(currentTabId, {
      type: "UPDATE_SETTINGS",
      enabled: true,
      volume: 1,
      pitch: 0,
      speed: speedValue,
      reverbEnabled: false,
      reverbAmount: 0
    });
  } catch (e) {
    console.log("Could not reset content.js for Tab Capture:", e);
  }
  await sendSettings();
  updateShortcutSelection();
});

tabCaptureUI.onDisabled(async () => {
  updateSpeedSliderState();
  settings.corsTabCapture = false;
  await sendSettings();
  updateShortcutSelection();
});

function getStreamingPlatform(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [domain, info] of Object.entries(STREAMING_PLATFORMS)) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return info;
      }
    }
  } catch (e) {
    console.error("Error parsing URL:", e);
  }
  return null;
}

const FAST_CAPTURE_EXCLUDED_SITES = [ "youtube.com", "youtu.be", "chrome.google.com", "chromewebstore.google.com" ];

function isVkSite(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "vk.com" || hostname.endsWith(".vk.com") || hostname === "vk.ru" || hostname.endsWith(".vk.ru");
  } catch (e) {
    return false;
  }
}

function isExcludedFromFastCapture(url) {
  if (!url) return true;
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === "chrome:" || urlObj.protocol === "chrome-extension:" || urlObj.protocol === "about:") {
      return true;
    }
    const hostname = urlObj.hostname.toLowerCase();
    return FAST_CAPTURE_EXCLUDED_SITES.some(site => hostname === site || hostname.endsWith("." + site));
  } catch (e) {
    return true;
  }
}

async function saveFineTunePreference() {
  await chrome.storage.local.set({
    freePitch_fineTune: settings.fineTune
  });
}

async function loadFineTunePreference() {
  const data = await chrome.storage.local.get("freePitch_fineTune");
  settings.fineTune = data.freePitch_fineTune ?? false;
  applyFineTuneState();
}

async function saveAutoSpeedPitchPreference() {
  await chrome.storage.local.set({
    freePitch_autoSpeedPitch: settings.autoSpeedPitch
  });
}

async function loadAutoSpeedPitchPreference() {
  const data = await chrome.storage.local.get("freePitch_autoSpeedPitch");
  settings.autoSpeedPitch = data.freePitch_autoSpeedPitch ?? false;
  if (autoSpeedPitchToggle) autoSpeedPitchToggle.checked = settings.autoSpeedPitch;
}

function showNotification(messageKey, duration = 1500) {
  if (!notificationPill || !notificationPillText) return;
  const defaultMessages = {
    fineTuneEnabled: "🎚️ Fine-tune enabled",
    fineTuneDisabled: "🎚️ Fine-tune disabled"
  };
  let message = defaultMessages[messageKey] || messageKey;
  if (typeof langpack !== "undefined" && langpack.strings && Object.keys(langpack.strings).length > 0) {
    const localizedMsg = langpack.get("notifications." + messageKey);
    if (localizedMsg && !localizedMsg.startsWith("notifications.")) {
      message = localizedMsg;
    }
  }
  notificationPillText.textContent = message;
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  notificationPill.classList.add("visible");
  notificationTimeout = setTimeout(() => {
    notificationPill.classList.remove("visible");
    notificationTimeout = null;
  }, duration);
}

let languageManifest = null;

async function loadLanguageManifest() {
  try {
    const response = await fetch("lang/languages.json");
    if (response.ok) {
      languageManifest = await response.json();
      populateLanguageMenu();
    }
  } catch (e) {
    console.error("Error loading language manifest:", e);
  }
}

function populateLanguageMenu() {
  const menu = document.getElementById("language-menu");
  const currentLabel = document.getElementById("current-language");
  if (!menu || !languageManifest) return;
  menu.innerHTML = "";
  const currentLang = langpack?.currentLang || "en";
  for (const [code, name] of Object.entries(languageManifest.languages)) {
    const btn = document.createElement("button");
    btn.className = "language-option";
    btn.textContent = name;
    btn.dataset.lang = code;
    if (code === currentLang) {
      btn.classList.add("active");
      if (currentLabel) currentLabel.textContent = name;
    }
    btn.addEventListener("click", async () => {
      if (langpack && code !== langpack.currentLang) {
        await langpack.loadLanguage(code);
        await loadQuotes();
        showNewQuote();
        populateLanguageMenu();
      }
    });
    menu.appendChild(btn);
  }
}

async function initialize() {
  checkForUpdates();
  if (typeof langpack !== "undefined") {
    await langpack.loadPreferences();
    langpack.applyToDOM();
    langpack.onChange(() => {
      langpack.applyToDOM();
      updateThemeDisplay();
      renderShortcuts();
      renderShortcutsGrid();
      if (typeof modesUI !== "undefined") {
        updateSettingsStatus(modesUI.getMediaCount());
      }
    });
  }
  await loadLanguageManifest();
  await themeManager.loadPreferences();
  updateThemeDisplay();
  themeManager.onChange(() => {
    updateThemeDisplay();
    refreshSliderColors();
  });
  await loadQuotes();
  showNewQuote();
  await loadCustomShortcuts();
  await loadMode();
  await loadFineTunePreference();
  await loadAutoSpeedPitchPreference();
  await loadSliderStylePreference();
  await loadShortcutUsage();
  shortcutsCache = calculateShortcuts();
  cacheSessionSmartOrder();
  await saveShortcutUsage();
  renderShortcutsGrid();
  renderShortcuts();
  setupShortcutsDragScroll();
  setupEditModeDragReorder();
  renderSliderEmojis();
  setupPillSliderDrag(volumePillSlider, "volume");
  setupPillSliderDrag(pitchPillSlider, "pitch");
  setupPillSliderDrag(speedPillSlider, "speed");
  setupPillSliderDrag(reverbPillSlider, "reverb");
  setupPillButtonHold(document.getElementById("volume-pill-minus"), "volume", "minus");
  setupPillButtonHold(document.getElementById("volume-pill-plus"), "volume", "plus");
  setupPillButtonHold(document.getElementById("pitch-pill-minus"), "pitch", "minus");
  setupPillButtonHold(document.getElementById("pitch-pill-plus"), "pitch", "plus");
  setupPillButtonHold(document.getElementById("speed-pill-minus"), "speed", "minus");
  setupPillButtonHold(document.getElementById("speed-pill-plus"), "speed", "plus");
  setupPillButtonHold(document.getElementById("reverb-pill-minus"), "reverb", "minus");
  setupPillButtonHold(document.getElementById("reverb-pill-plus"), "reverb", "plus");
  volumePillSlider?.addEventListener("dblclick", e => {
    if (e.target.closest(".pill-btn")) return;
    settings.volume = 100;
    updateUI();
    updatePillSliders();
    sendSettings();
    showNewQuote();
  });
  pitchPillSlider?.addEventListener("dblclick", e => {
    if (e.target.closest(".pill-btn")) return;
    settings.pitch = 0;
    applyAutoSpeedForPitch();
    updateUI();
    updatePillSliders();
    updateShortcutSelection();
    sendSettings();
    showNewQuote();
  });
  speedPillSlider?.addEventListener("dblclick", e => {
    if (e.target.closest(".pill-btn")) return;
    settings.speed = 100;
    updateUI();
    updatePillSliders();
    updateShortcutSelection();
    sendSettings();
    showNewQuote();
  });
  reverbPillSlider?.addEventListener("dblclick", e => {
    if (e.target.closest(".pill-btn")) return;
    settings.reverbAmount = 50;
    updateUI();
    updatePillSliders();
    updateShortcutSelection();
    sendSettings();
    showNewQuote();
  });
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    if (!tab) {
      updateSettingsStatus(0);
      return;
    }
    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://") || tab.url?.startsWith("about:")) {
      updateSettingsStatus(0);
      return;
    }
    currentTabId = tab.id;
    await loadSettings();
    updateUI();
    await new Promise(r => setTimeout(r, 100));
    captureRouter.setTabId(tab.id);
    captureRouter.setTabUrl(tab.url);
    await tabCaptureUI.checkIfActive(tab.id);
    const platform = getStreamingPlatform(tab.url);
    const isStreamingPlatform = platform !== null;
    if (platform) {
      console.log("Vibes: Streaming platform detected:", platform.name);
    }
    try {
      const initResponse = await chrome.tabs.sendMessage(tab.id, {
        type: "INIT"
      });
      const mediaCount = initResponse?.mediaCount || 0;
      const fastMediaCount = initResponse?.fastMediaCount || 0;
      const hasLimitations = initResponse?.limitations && initResponse.limitations.length > 0;
      const interceptorActive = initResponse?.interceptorActive || false;
      const fastCaptureActive = initResponse?.fastCaptureActive || false;
      const fastSpeedOnlyCount = initResponse?.fastSpeedOnlyCount || 0;
      const fastFullCount = initResponse?.fastFullCount || 0;
      const capabilities = {
        mediaCount: mediaCount,
        fastMediaCount: fastMediaCount,
        limitations: initResponse?.limitations || [],
        interceptorActive: interceptorActive,
        fastCaptureActive: fastCaptureActive,
        isStreamingPlatform: isStreamingPlatform,
        fastSpeedOnlyCount: fastSpeedOnlyCount,
        fastFullCount: fastFullCount
      };
      const determinedMode = captureRouter.autoSetMode(capabilities);
      modesUI.setMediaCount(mediaCount, fastMediaCount);
      updateSpeedSliderState();
      console.log("CaptureRouter: Mode determined:", {
        mode: determinedMode,
        mediaCount: mediaCount,
        fastMediaCount: fastMediaCount,
        fastSpeedOnlyCount: fastSpeedOnlyCount,
        fastFullCount: fastFullCount,
        corsLimited: captureRouter.isCorsLimited(),
        interceptorActive: interceptorActive,
        fastCaptureActive: fastCaptureActive,
        isStreamingPlatform: isStreamingPlatform,
        hasLimitations: hasLimitations
      });
      modesUI.updateModesButton();
      const isOldTab = !fastCaptureActive && !isExcludedFromFastCapture(tab.url);
      if (isOldTab) {
        console.log("CaptureRouter: Old tab detected - Fast Capture not available, showing refresh prompt");
        modesUI.showModalForLimitations("refreshRequired");
      } else if (hasLimitations && !tabCaptureUI.dismissed) {
        modesUI.showModalForLimitations();
      }
      if (fastCaptureActive && fastMediaCount === 0) {
        setTimeout(async () => {
          try {
            const recheckResponse = await chrome.tabs.sendMessage(tab.id, {
              type: "GET_STATE"
            });
            const newFastMediaCount = recheckResponse?.fastMediaCount || 0;
            if (newFastMediaCount > 0) {
              console.log("CaptureRouter: Fast Capture media detected on recheck:", newFastMediaCount);
              modesUI.setMediaCount(recheckResponse?.mediaCount || 0, newFastMediaCount);
              modesUI.updateModesButton();
              updateSettingsStatus(captureRouter.getActiveMediaCount());
            }
            captureRouter.updateCorsStatus(recheckResponse?.fastSpeedOnlyCount || 0, recheckResponse?.fastFullCount || 0);
          } catch (e) {}
        }, 500);
      }
      const liveCorsLimited = captureRouter.isCorsLimited();
      const hasLiveCorsData = fastSpeedOnlyCount + fastFullCount > 0;
      const vkNeedsTabCapture = isVkSite(tab.url) && fastCaptureActive && fastFullCount === 0;
      if (vkNeedsTabCapture) {
        console.log("Vibes: VK detected — using Tab Capture for reliable pitch/reverb", {
          fastMediaCount,
          fastSpeedOnlyCount,
          fastFullCount
        });
      }
      if (hasLiveCorsData && !liveCorsLimited && settings.corsTabCapture && !vkNeedsTabCapture) {
        console.log("Vibes: Clearing stale corsTabCapture (live: full capture available)");
        settings.corsTabCapture = false;
      }
      const corsNeedsTabCapture = liveCorsLimited || vkNeedsTabCapture || !hasLiveCorsData && settings.corsTabCapture;
      if (corsNeedsTabCapture && modesUI.isAlwaysTabEnabled() && modesUI._tabCaptureAvailable && !captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
        console.log("Vibes: CORS-limited tab detected, auto-starting Tab Capture", {
          fromStorage: settings.corsTabCapture,
          liveDetection: liveCorsLimited,
          hasLiveData: hasLiveCorsData
        });
        settings.corsTabCapture = true;
        await modesUI.enableSilent();
      }
      await sendSettings();
    } catch (e) {
      console.log("CaptureRouter: INIT failed, likely old tab:", e.message);
      try {
        await chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          files: [ "backend/content.js" ]
        });
        await new Promise(r => setTimeout(r, 100));
        if (!isExcludedFromFastCapture(tab.url)) {
          console.log("CaptureRouter: Old tab detected (INIT failed) - showing refresh prompt");
          captureRouter.setMode(CaptureMode.DEFAULT);
          modesUI.updateModesButton();
          modesUI.showModalForLimitations("refreshRequired");
        }
        await sendSettings();
      } catch (injectError) {
        updateSettingsStatus(0);
      }
    }
  } catch (e) {
    console.error("Initialize error:", e);
    updateSettingsStatus(0);
  }
}

slidersTab.addEventListener("click", () => setMode("sliders"));

shortcutsTab.addEventListener("click", () => setMode("shortcuts"));

document.getElementById("add-shortcut-btn").addEventListener("click", openShortcutModal);

shortcutsAddBtn?.addEventListener("click", openShortcutModal);

shortcutsEditBtn?.addEventListener("click", toggleShortcutsEditMode);

shortcutsResetBtn?.addEventListener("click", () => applyShortcut("default"));

shortcutsRestoreBtn?.addEventListener("click", toggleSmartOrder);

shortcutsCount?.addEventListener("click", () => {
  if (deletedDefaults.length === 0) return;
  const count = deletedDefaults.length;
  const names = deletedDefaults.map(key => DEFAULT_SHORTCUTS[key]?.name || key).join(", ");
  const msg = langpack.get("modal.confirmRestoreDefaults", {
    count: count,
    names: names
  });
  if (confirm(msg)) {
    for (const key of deletedDefaults) {
      if (shortcutUsage[key]) {
        shortcutUsage[key] = {
          totalUses: 0,
          rollingScore: 0,
          lastUsedAt: 0,
          usageHistory: []
        };
      }
    }
    deletedDefaults = [];
    saveCustomShortcuts();
    saveShortcutUsage();
    renderShortcuts();
    renderShortcutsGrid();
  }
});

modalCancel.addEventListener("click", closeShortcutModal);

modalSave.addEventListener("click", saveNewShortcut);

shortcutModal.addEventListener("click", e => {
  if (e.target === shortcutModal) closeShortcutModal();
});

emojiPicker.addEventListener("click", e => {
  const option = e.target.closest(".emoji-option");
  if (option) {
    selectedEmoji = option.dataset.emoji;
    emojiPicker.querySelectorAll(".emoji-option").forEach(btn => {
      btn.classList.toggle("selected", btn === option);
    });
  }
});

colorPicker?.addEventListener("click", e => {
  const option = e.target.closest(".color-option");
  if (option) {
    selectedColor = option.dataset.color;
    colorPicker.querySelectorAll(".color-option").forEach(btn => {
      btn.classList.toggle("selected", btn === option);
    });
  }
});

document.querySelectorAll(".triple-toggle").forEach(toggle => {
  toggle.addEventListener("click", e => {
    const btn = e.target.closest(".triple-btn");
    if (!btn) return;
    const setting = toggle.dataset.setting;
    const mode = btn.dataset.mode;
    shortcutModes[setting] = mode;
    toggle.querySelectorAll(".triple-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    updateModalValidation();
  });
});

shortcutNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveNewShortcut();
  if (e.key === "Escape") closeShortcutModal();
});

enabledToggle.addEventListener("change", () => {
  settings.enabled = enabledToggle.checked;
  updateUI();
  sendSettings();
});

fineTuneToggle.addEventListener("change", () => {
  settings.fineTune = fineTuneToggle.checked;
  if (!settings.fineTune) {
    settings.pitch = Math.round(settings.pitch);
    settings.speed = Math.round(settings.speed / 5) * 5;
    settings.reverbAmount = Math.round(settings.reverbAmount / 5) * 5;
  }
  applyFineTuneState();
  updateUI();
  sendSettings();
  saveFineTunePreference();
});

document.getElementById("volume-minus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.volume = Math.max(0, settings.volume - step);
  updateVolumeSlider();
  sendSettings();
  showNewQuote();
});

document.getElementById("volume-plus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.volume = Math.min(600, settings.volume + step);
  updateVolumeSlider();
  sendSettings();
  showNewQuote();
});

document.getElementById("volume-reset").addEventListener("click", () => {
  settings.volume = 100;
  updateVolumeSlider();
  sendSettings();
  showNewQuote();
});

document.getElementById("pitch-minus").addEventListener("click", () => {
  const step = settings.fineTune ? .01 : 1;
  settings.pitch = Math.max(-12, settings.pitch - step);
  settings.pitch = Math.round(settings.pitch * 100) / 100;
  applyAutoSpeedForPitch();
  updateUI();
  sendSettings();
  showNewQuote();
});

document.getElementById("pitch-plus").addEventListener("click", () => {
  const step = settings.fineTune ? .01 : 1;
  settings.pitch = Math.min(12, settings.pitch + step);
  settings.pitch = Math.round(settings.pitch * 100) / 100;
  applyAutoSpeedForPitch();
  updateUI();
  sendSettings();
  showNewQuote();
});

document.getElementById("pitch-reset").addEventListener("click", () => {
  settings.pitch = 0;
  applyAutoSpeedForPitch();
  updateUI();
  sendSettings();
  showNewQuote();
});

document.getElementById("speed-minus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.speed = Math.max(25, settings.speed - step);
  updateSpeedSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

document.getElementById("speed-plus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.speed = Math.min(200, settings.speed + step);
  updateSpeedSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

document.getElementById("speed-reset").addEventListener("click", () => {
  settings.speed = 100;
  updateSpeedSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

reverbToggle.addEventListener("change", () => {
  settings.reverbEnabled = reverbToggle.checked;
  updateReverbSlider();
  if (settings.sliderStyle === "pill") {
    updatePillSliders();
    syncPillButtonActivatedState();
  }
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

document.getElementById("reverb-minus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.reverbAmount = Math.max(0, settings.reverbAmount - step);
  updateReverbSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

document.getElementById("reverb-plus").addEventListener("click", () => {
  const step = settings.fineTune ? 1 : 5;
  settings.reverbAmount = Math.min(100, settings.reverbAmount + step);
  updateReverbSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

document.getElementById("reverb-reset").addEventListener("click", () => {
  settings.reverbAmount = 50;
  updateReverbSlider();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

setupSliderDrag(volumeSlider, "volume");

setupSliderDrag(pitchSlider, "pitch");

setupSliderDrag(speedSlider, "speed");

setupSliderDrag(reverbSlider, "reverb");

async function loadQuotes() {
  try {
    const langCode = langpack?.currentLang || "en";
    const response = await fetch(`lang/${langCode}/quotes.json`);
    if (response.ok) {
      quotesData = await response.json();
    } else if (langCode !== "en") {
      const fallback = await fetch("lang/en/quotes.json");
      if (fallback.ok) quotesData = await fallback.json();
    }
  } catch (e) {
    console.error("Error loading quotes:", e);
  }
}

function getRelevantCategories() {
  const categories = [ "general" ];
  if (settings.pitch < 0) {
    categories.push("pitchDown");
  } else if (settings.pitch > 0) {
    categories.push("pitchUp");
  }
  if (settings.speed < 100) {
    categories.push("slow");
  } else if (settings.speed > 100) {
    categories.push("fast");
  }
  if (settings.reverbEnabled) {
    if (settings.reverbAmount >= 60) {
      categories.push("reverbHigh");
    } else {
      categories.push("reverbLow");
    }
  }
  return categories;
}

let lastQuote = null;

function getRandomQuote() {
  if (!quotesData || !quotesData.categories) {
    return "hey there! click me :)";
  }
  const categories = getRelevantCategories();
  let allQuotes = [];
  for (const cat of categories) {
    const catQuotes = quotesData.categories[cat];
    if (catQuotes && catQuotes.length > 0) {
      allQuotes = allQuotes.concat(catQuotes);
    }
  }
  if (allQuotes.length === 0) {
    return "u got this";
  }
  let availableQuotes = allQuotes;
  if (lastQuote && allQuotes.length > 1) {
    availableQuotes = allQuotes.filter(q => q !== lastQuote);
  }
  const randomIndex = Math.floor(Math.random() * availableQuotes.length);
  const newQuote = availableQuotes[randomIndex];
  lastQuote = newQuote;
  return newQuote;
}

function showNewQuote() {
  const quote = getRandomQuote();
  pitcherQuote.textContent = quote;
  pitcherQuote.style.opacity = "0";
  pitcherQuote.style.transform = "translateY(4px)";
  setTimeout(() => {
    pitcherQuote.style.transition = "opacity 0.2s, transform 0.2s";
    pitcherQuote.style.opacity = "1";
    pitcherQuote.style.transform = "translateY(0)";
  }, 50);
}

pitcherArea.addEventListener("click", () => {
  showNewQuote();
});

function updateSettingsStatus(count) {
  if (count > 0) {
    settingsStatusText.textContent = langpack.get("status.media", {
      count: count
    });
    settingsStatusDot.classList.add("active");
  } else {
    settingsStatusText.textContent = langpack.get("status.na");
    settingsStatusDot.classList.remove("active");
  }
}

function updateThemeDisplay() {
  const info = themeManager.getCurrentTheme();
  const effectiveStyle = info.effectiveStyle;
  const isAuto = info.style === "auto";
  autoThemeToggle.checked = isAuto;
  if (effectiveStyle === "dark") {
    themeIcon.textContent = "☀️";
    themeSwitchText.textContent = langpack.get("settings.switchToLight");
  } else {
    themeIcon.textContent = "🌙";
    themeSwitchText.textContent = langpack.get("settings.switchToDark");
  }
}

settingsBtn.addEventListener("click", e => {
  e.stopPropagation();
  const isOpen = settingsDropdown.classList.contains("visible");
  settingsDropdown.classList.toggle("visible", !isOpen);
  settingsBtn.classList.toggle("active", !isOpen);
});

document.addEventListener("click", e => {
  if (!settingsBtn.contains(e.target)) {
    settingsDropdown.classList.remove("visible");
    settingsBtn.classList.remove("active");
  }
});

themeSwitch.addEventListener("click", e => {
  e.stopPropagation();
  const info = themeManager.getCurrentTheme();
  const newStyle = info.effectiveStyle === "dark" ? "light" : "dark";
  themeManager.setStyle(newStyle);
  updateThemeDisplay();
});

autoThemeToggle.addEventListener("change", e => {
  e.stopPropagation();
  if (autoThemeToggle.checked) {
    themeManager.setStyle("auto");
  } else {
    const info = themeManager.getCurrentTheme();
    themeManager.setStyle(info.effectiveStyle);
  }
  updateThemeDisplay();
});

const autoThemeRow = document.getElementById("auto-theme-row");

autoThemeRow.addEventListener("click", e => {
  if (!e.target.closest(".toggle")) {
    autoThemeToggle.checked = !autoThemeToggle.checked;
    autoThemeToggle.dispatchEvent(new Event("change"));
  }
});

const fineTuneRow = document.getElementById("fine-tune-row");

fineTuneRow.addEventListener("click", e => {
  if (!e.target.closest(".toggle")) {
    fineTuneToggle.checked = !fineTuneToggle.checked;
    fineTuneToggle.dispatchEvent(new Event("change"));
  }
});

autoSpeedPitchToggle?.addEventListener("change", () => {
  settings.autoSpeedPitch = autoSpeedPitchToggle.checked;
  applyAutoSpeedForPitch();
  updateUI();
  updateShortcutSelection();
  sendSettings();
  saveSettings();
  saveAutoSpeedPitchPreference();
});

const autoSpeedPitchRow = document.getElementById("auto-speed-pitch-row");

autoSpeedPitchRow?.addEventListener("click", e => {
  if (!e.target.closest(".toggle")) {
    autoSpeedPitchToggle.checked = !autoSpeedPitchToggle.checked;
    autoSpeedPitchToggle.dispatchEvent(new Event("change"));
  }
});

pillSlidersToggle.addEventListener("change", () => {
  settings.sliderStyle = pillSlidersToggle.checked ? "classic" : "pill";
  applySliderStyle();
  saveSliderStylePreference();
});

const pillSlidersRow = document.getElementById("pill-sliders-row");

pillSlidersRow.addEventListener("click", e => {
  if (!e.target.closest(".toggle")) {
    pillSlidersToggle.checked = !pillSlidersToggle.checked;
    pillSlidersToggle.dispatchEvent(new Event("change"));
  }
});

const volumePillLabel = document.getElementById("volume-pill-label");

volumePillLabel?.addEventListener("click", e => {
  e.stopPropagation();
  settings.volume = 100;
  updateUI();
  updatePillSliders();
  sendSettings();
  showNewQuote();
});

const pitchPillLabel = document.getElementById("pitch-pill-label");

pitchPillLabel?.addEventListener("click", e => {
  e.stopPropagation();
  settings.pitch = 0;
  applyAutoSpeedForPitch();
  updateUI();
  updatePillSliders();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

const speedPillLabel = document.getElementById("speed-pill-label");

speedPillLabel?.addEventListener("click", e => {
  e.stopPropagation();
  settings.speed = 100;
  updateUI();
  updatePillSliders();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

const reverbPillLabel = document.getElementById("reverb-pill-label");

reverbPillLabel?.addEventListener("click", e => {
  e.stopPropagation();
  if (e.target.closest(".toggle")) {
    return;
  }
  if (e.target.closest(".pill-reset-btn")) {
    settings.reverbAmount = 50;
  } else {
    settings.reverbEnabled = !settings.reverbEnabled;
    reverbToggle.checked = settings.reverbEnabled;
    if (reverbPillToggle) reverbPillToggle.checked = settings.reverbEnabled;
  }
  updateUI();
  updatePillSliders();
  if (settings.sliderStyle === "pill") {
    syncPillButtonActivatedState();
  }
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

reverbPillToggle?.addEventListener("change", () => {
  settings.reverbEnabled = reverbPillToggle.checked;
  reverbToggle.checked = settings.reverbEnabled;
  updateUI();
  updatePillSliders();
  if (settings.sliderStyle === "pill") {
    syncPillButtonActivatedState();
  }
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
});

settingsDropdown.addEventListener("click", e => {
  if (!e.target.closest("a")) {
    e.stopPropagation();
  }
});

const heartEmojis = [ "❤️", "💕", "💖", "💗", "💓", "💝", "🧡", "💛", "💚", "💙", "💜" ];

function spawnFloatingHearts() {
  const numHearts = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numHearts; i++) {
    setTimeout(() => {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
      const popupWidth = document.body.clientWidth || 300;
      const x = -10 + Math.random() * popupWidth;
      heart.style.left = x + "px";
      heart.style.bottom = "10px";
      heart.style.fontSize = 14 + Math.random() * 8 + "px";
      const drift = (Math.random() - .5) * 80;
      heart.style.setProperty("--drift", drift + "px");
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 2e3);
    }, i * 80);
  }
}

madeByBtn.addEventListener("click", e => {
  e.preventDefault();
  spawnFloatingHearts();
});

initialize();
